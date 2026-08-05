import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  EyeOff,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { ethers } from 'ethers';
import type { VerificationProof, VerificationReport } from '../types/veriflow';
import { attestationDigest, recoverAttestationSigner } from '../lib/tee/signing';
import { VERIFLOW_REGISTRY_V2_ADDRESS, VERIFLOW_REGISTRY_V2_ABI } from '../config/contracts';
import { VeriFlowStore } from '../lib/apiStore';

interface CheckItem {
  id: string;
  label: string;
  ok: boolean | null; // null = pending
  detail?: string;
}

export const PublicVerifier: React.FC<{ proofPayload?: string | null }> = ({ proofPayload }) => {
  const [proof, setProof] = useState<VerificationProof | null>(null);
  const [, setReport] = useState<VerificationReport | null>(null);
  const [isTampered, setIsTampered] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [checks, setChecks] = useState<CheckItem[]>([]);

  // Parse proof from prop, location hash, or query parameter
  useEffect(() => {
    try {
      let rawJson = proofPayload;

      if (!rawJson && typeof window !== 'undefined') {
        const hash = window.location.hash.substring(1);
        if (hash) {
          try {
            rawJson = atob(hash.replace(/-/g, '+').replace(/_/g, '/'));
          } catch {
            rawJson = decodeURIComponent(hash);
          }
        } else {
          const urlParams = new URLSearchParams(window.location.search);
          const verifyId = urlParams.get('verify_id');
          if (verifyId) {
            const foundReport = VeriFlowStore.getVerificationById(verifyId);
            if (foundReport) {
              setReport(foundReport);
              if (foundReport.proof) setProof(foundReport.proof);
              return;
            }
          }
        }
      }

      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        if (parsed.attestation && parsed.signature) {
          setProof(parsed as VerificationProof);
        } else if (parsed.proof) {
          setProof(parsed.proof);
          setReport(parsed as VerificationReport);
        }
      } else {
        // Default demo proof fallback
        const verifications = VeriFlowStore.getVerifications();
        if (verifications.length > 0 && verifications[0].proof) {
          setReport(verifications[0]);
          setProof(verifications[0].proof);
        }
      }
    } catch (err) {
      console.error('Failed to parse proof JSON:', err);
    }
  }, [proofPayload]);

  // Run verification checks when proof or tampered state changes
  useEffect(() => {
    if (!proof) return;
    runVerification();
  }, [proof, isTampered]);

  const runVerification = async () => {
    if (!proof) return;
    setIsVerifying(true);

    const activeAttestation = isTampered
      ? { ...proof.attestation, result: !proof.attestation.result }
      : proof.attestation;

    const newChecks: CheckItem[] = [
      { id: 'structure', label: 'Proof structure (8 attested fields)', ok: null },
      { id: 'digest', label: 'Canonical EIP-191 digest recomputed locally', ok: null },
      { id: 'signer', label: 'secp256k1 signature recovers to valid address', ok: null },
      { id: 'expiry', label: 'Attestation not expired', ok: null },
      { id: 'identity', label: 'Signer IS registered TEE identity on Flare', ok: null },
      { id: 'code_approved', label: 'Container code version allow-listed on-chain', ok: null },
      { id: 'anchored', label: 'Record anchored & immutable on Flare Coston2', ok: null },
    ];
    setChecks(newChecks);

    const updateCheck = (id: string, ok: boolean, detail?: string) => {
      setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, ok, detail } : c)));
    };

    try {
      // 1. Structure
      const required = ['verificationId', 'subject', 'claimHash', 'result', 'issuedAt', 'expiresAt', 'codeMeasurement', 'attestationHash'];
      const hasFields = required.every((f) => (activeAttestation as any)[f] !== undefined);
      updateCheck('structure', hasFields, hasFields ? 'All 8 fields present' : 'Missing fields');

      // 2. Digest
      const computedDigest = attestationDigest(activeAttestation);
      updateCheck('digest', true, `Digest: ${computedDigest.slice(0, 18)}…`);

      // 3. Signer Recovery
      const recoveredSigner = recoverAttestationSigner(activeAttestation, proof.signature);
      const isSignerValid = Boolean(recoveredSigner);
      updateCheck(
        'signer',
        isSignerValid,
        isSignerValid ? `Signer: ${recoveredSigner}` : 'Signature recovery failed'
      );

      // 4. Expiry
      const now = Math.floor(Date.now() / 1000);
      const notExpired = Number(activeAttestation.expiresAt) > now;
      updateCheck(
        'expiry',
        notExpired,
        notExpired ? `Expires: ${new Date(activeAttestation.expiresAt * 1000).toLocaleDateString()}` : 'EXPIRED'
      );

      // 5-7. On-chain checks over Flare Coston2 RPC
      const rpcUrl = 'https://coston2-api.flare.network/ext/C/rpc';
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contractAddress = proof.registryAddress || VERIFLOW_REGISTRY_V2_ADDRESS;

      if (contractAddress && recoveredSigner) {
        try {
          const registry = new ethers.Contract(contractAddress, VERIFLOW_REGISTRY_V2_ABI, provider);

          // On-Chain Identity match
          const teeIdentity = await registry.teeIdentity();
          const identityMatches = teeIdentity.toLowerCase() === recoveredSigner.toLowerCase();
          updateCheck(
            'identity',
            identityMatches,
            identityMatches
              ? `Matches ${teeIdentity}`
              : `TAMPER DETECTED: Recovered ${recoveredSigner.slice(0, 10)}… ≠ Registered ${teeIdentity.slice(0, 10)}…`
          );

          // Code Measurement allowlist
          const isApproved = await registry.approvedCodeMeasurement(activeAttestation.codeMeasurement);
          updateCheck(
            'code_approved',
            isApproved,
            isApproved ? `Measurement ${activeAttestation.codeMeasurement.slice(0, 16)}… approved` : 'Unapproved code measurement'
          );

          // Verify Record on-chain
          const rec = await registry.verifyRecord(activeAttestation.verificationId);
          const [exists, _isValid, onChainResult] = rec;

          updateCheck(
            'anchored',
            exists && onChainResult === activeAttestation.result,
            exists
              ? `Anchored on Coston2 (On-chain result: ${onChainResult})`
              : 'Proof signed, not yet anchored on-chain'
          );
        } catch (chainErr: any) {
          updateCheck('identity', false, `On-chain check failed: ${chainErr.message || 'RPC unreachable'}`);
          updateCheck('code_approved', false, 'Unable to verify on-chain');
          updateCheck('anchored', false, 'Unable to verify on-chain');
        }
      } else {
        updateCheck('identity', false, 'No registry contract address');
        updateCheck('code_approved', false, 'No registry contract address');
        updateCheck('anchored', false, 'No registry contract address');
      }
    } catch (e: any) {
      console.error('Verification error:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  const allPassed = checks.length > 0 && checks.every((c) => c.ok === true);
  const activeAttestation = proof ? (isTampered ? { ...proof.attestation, result: !proof.attestation.result } : proof.attestation) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in py-6 px-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                VeriFlow Proof Verifier
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  PUBLIC & INDEPENDENT
                </span>
              </h2>
              <p className="text-xs text-slate-400">Zero-Trust proof verification against Flare Coston2 Smart Contract</p>
            </div>
          </div>

          <button
            onClick={() => setIsTampered(!isTampered)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 ${
              isTampered
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            {isTampered ? 'Tamper Active (Result Flipped!)' : 'Test Live Tampered Proof'}
          </button>
        </div>
      </div>

      {/* Main Verdict Display */}
      {proof && activeAttestation && (
        <div
          className={`p-6 rounded-3xl border shadow-2xl transition-all ${
            allPassed
              ? activeAttestation.result
                ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40'
                : 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/40'
              : 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              {allPassed ? (
                activeAttestation.result ? (
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-12 h-12 text-rose-400 shrink-0" />
                )
              ) : (
                <ShieldAlert className="w-12 h-12 text-amber-400 shrink-0" />
              )}
              <div>
                <div className="text-xs font-mono text-slate-400 uppercase tracking-widest">Verifiable Proof Verdict</div>
                <h3 className="text-2xl font-black text-white mt-0.5">
                  {allPassed
                    ? activeAttestation.result
                      ? 'CLAIM VERIFIED — TRUE ✓'
                      : 'CLAIM VERIFIED — DENIED / FALSE ✗'
                    : 'INVALID PROOF — SIGNATURE / INTEGRITY FAILURE ✗'}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Subject: <span className="font-mono text-teal-300">{activeAttestation.subject}</span>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-mono text-slate-400">Flare Coston2</span>
              <div className="text-xs font-bold text-slate-200">
                Registry: {(proof.registryAddress || VERIFLOW_REGISTRY_V2_ADDRESS).slice(0, 10)}…
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Checklist */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
          <span>Cryptographic Verification Steps</span>
          {isVerifying && <RefreshCw className="w-4 h-4 text-teal-400 animate-spin" />}
        </h3>

        <div className="space-y-3">
          {checks.map((check) => (
            <div
              key={check.id}
              className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
            >
              <div className="flex items-center space-x-3">
                {check.ok === true ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : check.ok === false ? (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-slate-500 animate-pulse shrink-0" />
                )}
                <span className="font-semibold text-slate-200">{check.label}</span>
              </div>
              {check.detail && (
                <span
                  className={`font-mono text-[11px] max-w-xs truncate ${
                    check.ok === true ? 'text-teal-400' : check.ok === false ? 'text-rose-400' : 'text-slate-400'
                  }`}
                >
                  {check.detail}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Zero-Knowledge Minimal Disclosure Panel */}
      <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-teal-400" />
          Minimal Data Disclosure — Not Disclosed to Verifier
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-400">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-500">Full Legal Name</div>
            <div className="font-semibold text-slate-300">HIDDEN (RAM Purged)</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-500">Date of Birth</div>
            <div className="font-semibold text-slate-300">HIDDEN (RAM Purged)</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-500">Document Number</div>
            <div className="font-semibold text-slate-300">HIDDEN (RAM Purged)</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-500">Raw Document File</div>
            <div className="font-semibold text-slate-300">NEVER UPLOADED</div>
          </div>
        </div>
      </div>
    </div>
  );
};

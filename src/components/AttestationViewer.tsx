import React, { useState } from 'react';
import { 
  Cpu, 
  ShieldCheck, 
  AlertTriangle, 
  Lock, 
  CheckCircle2, 
  X, 
  Copy
} from 'lucide-react';
import { ALLOWLISTED_ENCLAVE_MEASUREMENT } from '../lib/enclaveSimulator';
import { verifyFlareAttestationQuote } from '../lib/flareAttestationVerifier';
import { VeriFlowStore } from '../lib/apiStore';
import { TEE_IDENTITY_ADDRESS } from '../config/contracts';

interface AttestationViewerProps {
  isOpen: boolean;
  onClose: () => void;
  simulatedFailAttestation: boolean;
  setSimulatedFailAttestation: (fail: boolean) => void;
}

export const AttestationViewer: React.FC<AttestationViewerProps> = ({
  isOpen,
  onClose,
  simulatedFailAttestation,
  setSimulatedFailAttestation
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'hex' | 'failclosed'>('overview');

  if (!isOpen) return null;

  // Get latest attestation quote from store to pass to FCE verifier
  const verifications = VeriFlowStore.getVerifications();
  const latestQuote = verifications.length > 0 ? verifications[0].attestationQuote : null;
  const fceResult = latestQuote ? verifyFlareAttestationQuote(latestQuote) : null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sampleQuoteHex = `0x04000000a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8
e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
8f4a9b2c7e1d3f5a6b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a`;

  const enclavePubKey = TEE_IDENTITY_ADDRESS || '0x3FB763Adfc4190482a2e6758c7842c755B4aE1bE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Flare Confidential Compute Attestation
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  SIMULATED TEE
                </span>
              </h3>
              <p className="text-xs text-slate-400">Cryptographic proof of code measurement & memory isolation</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 sm:px-6 pt-2 space-x-2 overflow-x-auto no-scrollbar whitespace-nowrap">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 sm:px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all shrink-0 ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-teal-400 border-t-2 border-teal-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Attestation Overview
          </button>
          <button
            onClick={() => setActiveTab('hex')}
            className={`px-3 sm:px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all shrink-0 ${
              activeTab === 'hex'
                ? 'bg-slate-900 text-teal-400 border-t-2 border-teal-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Raw Quote Hex
          </button>
          <button
            onClick={() => setActiveTab('failclosed')}
            className={`px-3 sm:px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all shrink-0 ${
              activeTab === 'failclosed'
                ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fail-Closed Security Test
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {activeTab === 'overview' && (
            <>
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex items-start space-x-4 ${
                !simulatedFailAttestation
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
              }`}>
                {!simulatedFailAttestation ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    {!simulatedFailAttestation
                      ? 'Remote Attestation Verified — Code & Hardware Intact'
                      : 'Attestation Failure Simulated — System Locked Out'}
                  </h4>
                  <p className="text-xs opacity-90 mt-1">
                    {!simulatedFailAttestation
                      ? 'The enclave quote matches the allow-listed code measurement. Key Management Service (KMS) has authorized decryption key release over the attested TLS channel.'
                      : 'FAIL CLOSED TRIGGERED: Quote measurement mismatch detected! KMS refused to release the document decryption key. No document was decrypted.'}
                  </p>
                </div>
              </div>

              {/* Hardware Specifications Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                    <span>Enclave Code Measurement (M_code)</span>
                    <button 
                      onClick={() => copyToClipboard(ALLOWLISTED_ENCLAVE_MEASUREMENT, 'mcode')}
                      className="text-teal-400 hover:text-teal-300 flex items-center gap-1 text-[11px]"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedKey === 'mcode' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-teal-300 break-all bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    {ALLOWLISTED_ENCLAVE_MEASUREMENT}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                    <span>Registered TEE Identity Address (secp256k1)</span>
                    <button 
                      onClick={() => copyToClipboard(enclavePubKey, 'pk')}
                      className="text-teal-400 hover:text-teal-300 flex items-center gap-1 text-[11px]"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedKey === 'pk' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-emerald-300 break-all bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    {enclavePubKey}
                  </div>
                </div>

              </div>

              {/* Security Guarantees Checklist */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  TEE Confidential Guarantees
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    <span>Memory Encryption: AES-256 RAM Isolation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    <span>Zero Disk Paging: Plaintext Never Touches Storage</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    <span>KMS Fail Closed: No Key Without Valid Quote</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    <span>Independent Verification: Published PK Verification</span>
                  </div>
                </div>
              </div>
              {/* FCE Attestation Verifier Result */}
              {fceResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  fceResult.isValid
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                }`}>
                  <div className="font-bold text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Flare FCE Verifier Result: {fceResult.isValid ? 'VALID ✓' : 'INVALID ✗'}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <span className="text-slate-400">Measurement Match:</span>
                    <span className={fceResult.measurementMatch ? 'text-emerald-400' : 'text-rose-400'}>
                      {fceResult.measurementMatch ? '✓ YES' : '✗ NO'}
                    </span>
                    <span className="text-slate-400">Hardware TEE:</span>
                    <span className="text-teal-300 truncate">{fceResult.hardwareTEE.split('(')[0].trim()}</span>
                    <span className="text-slate-400">Signature Scheme:</span>
                    <span className="text-slate-200">{fceResult.signatureScheme}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{fceResult.details}</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'hex' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Hardware Attestation Quote Payload (Raw TEE Binary Hex)</span>
                <span className="text-teal-400 font-mono text-[11px]">Length: 384 bytes</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 leading-relaxed break-all select-all">
                {sampleQuoteHex}
              </div>
            </div>
          )}

          {activeTab === 'failclosed' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed space-y-2">
                <div className="flex items-center space-x-2 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Principle #4 Test: Fail-Closed Protection</span>
                </div>
                <p>
                  Requirement #4 dictates that if remote attestation fails, the KMS must <strong>refuse to release the decryption key</strong> and produce a hard error. It must NEVER fall back to un-attested or plaintext processing.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Simulate Attestation Quote Tampering</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    When enabled, the enclave will emit an un-allowlisted measurement hash.
                  </p>
                </div>
                <button
                  onClick={() => setSimulatedFailAttestation(!simulatedFailAttestation)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                    simulatedFailAttestation
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {simulatedFailAttestation ? 'Simulating FAILURE (Active)' : 'Attestation NORMAL'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Lock className="w-3.5 h-3.5 text-teal-400" />
            <span>Flare Confidential Compute Hardware Attested</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};

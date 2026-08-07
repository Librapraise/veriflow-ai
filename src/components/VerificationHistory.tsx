import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileText, 
  ShieldCheck, 
  Trash2,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import QRCode from 'qrcode';
import type { VerificationReport } from '../types/veriflow';
import { VeriFlowStore } from '../lib/apiStore';

interface VerificationHistoryProps {
  onOpenAttestationModal: () => void;
}

export const VerificationHistory: React.FC<VerificationHistoryProps> = ({
  onOpenAttestationModal
}) => {
  const [verifications, setVerifications] = useState<VerificationReport[]>(VeriFlowStore.getVerifications());
  const [selectedReport, setSelectedReport] = useState<VerificationReport | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleRevoke = (id: string) => {
    VeriFlowStore.revokeVerification(id);
    setVerifications(VeriFlowStore.getVerifications());
    if (selectedReport?.id === id) {
      setSelectedReport(prev => prev ? { ...prev, revoked: true } : null);
    }
  };

  const getProofShareUrl = (report: VerificationReport): string => {
    const origin = window.location.origin;
    return `${origin}/verifier?verify_id=${report.id}`;
  };

  useEffect(() => {
    if (selectedReport && qrCanvasRef.current) {
      const url = getProofShareUrl(selectedReport);
      QRCode.toCanvas(qrCanvasRef.current, url, { width: 128, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } }, (err) => {
        if (err) console.error('QR code render error:', err);
      });
    }
  }, [selectedReport]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-400" />
            Verification History & Audit Trail
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Independently verifiable cryptographically signed claims. You can revoke any claim at any time.
          </p>
        </div>

        <div className="text-xs font-bold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
          Total Verifications: <span className="text-teal-400">{verifications.length}</span>
        </div>
      </div>

      {/* Table of Verifications */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Verification ID</th>
                <th className="px-6 py-4">Claim / Requirement</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Requester</th>
                <th className="px-6 py-4">Flare Proof</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {verifications.map((v) => (
                <tr key={v.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-teal-400 font-bold">
                    {v.id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{v.claimTitle}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{v.type}</div>
                  </td>
                  <td className="px-6 py-4">
                    {v.revoked ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        REVOKED
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        VERIFIED TRUE
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-400">
                    {new Date(v.verifiedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {v.requesterOrg || 'Self Verification'}
                  </td>
                  <td className="px-6 py-4">
                    {v.explorerUrl ? (
                      <a
                        href={v.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 font-bold text-[10px] border border-teal-500/20 transition-all font-mono"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Coston2 Tx
                      </a>
                    ) : (
                      <span className="text-slate-600 text-[11px]">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => setSelectedReport(v)}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold transition-all"
                    >
                      View Report
                    </button>
                    {!v.revoked && (
                      <button
                        onClick={() => handleRevoke(v.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold transition-all"
                        title="Revoke claim"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shareable Report Detail Modal */}
      {selectedReport && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Confidential Verification Report</h3>
                  <p className="text-xs text-slate-400 font-mono">Verification ID: {selectedReport.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* QR Code & Share Payload */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="bg-white p-2 rounded-2xl flex items-center justify-center shrink-0 shadow-xl border border-slate-200">
                <canvas ref={qrCanvasRef} className="rounded-lg" />
              </div>

              <div className="space-y-2 flex-1 w-full text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Claim Rule:</span>
                  <span className="font-bold text-white">{selectedReport.claimTitle}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className={selectedReport.revoked ? 'text-rose-400 font-bold' : selectedReport.result ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {selectedReport.revoked ? 'REVOKED' : selectedReport.result ? 'VERIFIED TRUE ✓' : 'VERIFIED DENIED ✗'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Attestation ID:</span>
                  <span className="font-mono text-teal-300">{selectedReport.attestationId}</span>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => copyToClipboard(getProofShareUrl(selectedReport), 'link')}
                    className="px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex-1 transition-all flex items-center justify-center gap-1.5 shadow-md"
                  >
                    {copiedId === 'link' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === 'link' ? 'Verifier URL Copied!' : 'Copy Independent Verifier Link'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(selectedReport.signature, 'sig')}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs flex-1 transition-all"
                  >
                    {copiedId === 'sig' ? 'Signature Copied!' : 'Copy ECDSA Signature'}
                  </button>
                  <button
                    onClick={onOpenAttestationModal}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
                  >
                    Inspect TEE
                  </button>
                </div>
              </div>
            </div>

            {/* Signature Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Enclave Cryptographic Signature (SK_enclave)</span>
              <div className="font-mono text-xs text-emerald-400 break-all bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                {selectedReport.signature}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Close Report
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Cpu, 
  CheckCircle2, 
  ArrowRight, 
  Key, 
  ExternalLink
} from 'lucide-react';

interface LandingPageProps {
  setActiveTab: (tab: 'landing' | 'dashboard' | 'verify' | 'history' | 'developer' | 'assistant') => void;
  onOpenAttestationModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ setActiveTab, onOpenAttestationModal }) => {
  return (
    <div className="space-y-24 animate-fade-in pb-16">
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 text-center space-y-8 overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-teal-500/20 to-emerald-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20 shadow-inner">
          <Cpu className="w-4 h-4 text-teal-400 animate-pulse" />
          <span>FLARE CONFIDENTIAL COMPUTE · TEE ATTESTED</span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight max-w-4xl mx-auto leading-[1.1]">
          Verify Facts. <br />
          <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Not Documents.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Upload sensitive documents once into an attested Confidential Execution Environment. VeriFlow AI returns a cryptographically signed proof — <strong>never the underlying document or raw PII</strong>.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setActiveTab('verify')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-teal-500/25 active:scale-95 flex items-center justify-center space-x-2"
          >
            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            <span>Verify Passport Age (18+)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTab('developer')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm transition-all flex items-center justify-center space-x-2"
          >
            <Key className="w-4 h-4 text-purple-400" />
            <span>Developer API Portal</span>
          </button>
        </div>

        {/* Proof Contrast Callout */}
        <div className="max-w-3xl mx-auto pt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-2">
            <span className="font-bold text-rose-400 flex items-center gap-1.5">
              ❌ Traditional KYC Today
            </span>
            <p className="text-slate-300">
              You upload full passport scans, SSNs, or payslips to third parties, turning every verifier into a breach honeypot.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-2">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              VeriFlow AI Confidential Model
            </span>
            <p className="text-slate-300">
              Verifier receives only <code className="text-emerald-300 font-mono">age_above_18: true</code> plus a hardware enclave signature.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Matrix Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Core Confidential Technology Stack
          </h2>
          <p className="text-xs text-slate-400">Built on Flare Confidential Compute & Zero-Knowledge Architecture</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 w-fit border border-teal-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Client-Side Encryption</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Files are encrypted locally in the browser with AES-256-GCM before upload. Raw document bytes never hit storage unencrypted.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit border border-emerald-500/20">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Attested TEE Enclave</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              KMS releases decryption keys <em>only</em> to hardware enclaves presenting a valid Remote Attestation Quote matching allow-listed code.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 w-fit border border-cyan-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Independently Verifiable</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enclave signs verification claims with an isolated private key. Any third party can audit the proof against the published public key.
            </p>
          </div>
        </div>
      </section>

      {/* TEE Attestation Lifecycle Workflow Diagram */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-teal-400" />
              Confidential Compute Attestation Pipeline
            </h3>
            <p className="text-xs text-slate-400">Step-by-step cryptographic sequence</p>
          </div>
          <button
            onClick={onOpenAttestationModal}
            className="px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-teal-500/30 text-teal-300 font-bold text-xs flex items-center space-x-2"
          >
            <span>Inspect Remote Attestation Quote</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-teal-400 font-bold">STEP 01</span>
            <h4 className="font-bold text-white">Encrypted Upload</h4>
            <p className="text-slate-400 text-[11px]">Client encrypts file locally with AES-256 and uploads blob to storage.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-teal-400 font-bold">STEP 02</span>
            <h4 className="font-bold text-white">Hardware Attestation</h4>
            <p className="text-slate-400 text-[11px]">Enclave generates remote attestation quote proving code measurement M_code.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-teal-400 font-bold">STEP 03</span>
            <h4 className="font-bold text-white">Fail-Closed Key Release</h4>
            <p className="text-slate-400 text-[11px]">KMS releases document key to enclave RAM <em>only if quote matches allowlist</em>.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-teal-400 font-bold">STEP 04</span>
            <h4 className="font-bold text-white">In-RAM Rule Evaluation</h4>
            <p className="text-slate-400 text-[11px]">OCR reads required field internally, erases RAM, and signs boolean result.</p>
          </div>
        </div>
      </section>

    </div>
  );
};

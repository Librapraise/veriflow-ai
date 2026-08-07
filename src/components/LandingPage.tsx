import React, { useState } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  Cpu,
  Key,
  ChevronRight,
  Fingerprint,
  Terminal,
  ChevronDown,
  BadgeCheck,
  DatabaseZap,
  Network,
  ScanLine
} from 'lucide-react';

interface LandingPageProps {
  setActiveTab: (tab: 'landing' | 'dashboard' | 'verify' | 'history' | 'developer' | 'assistant') => void;
  onOpenAttestationModal: () => void;
}

// --- Sub-Component: Magnetic Button ---
const MagneticButton: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.35);
    y.set((e.clientY - centerY) * 0.35);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className={className}
    >
      {children}
    </motion.button>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ setActiveTab, onOpenAttestationModal }) => {
  const [openFaq, setOpenFaq] = useState<number>(0);
  const [sandboxStage, setSandboxStage] = useState<'idle' | 'encrypting' | 'extracting' | 'attested' | 'verified'>('idle');

  const runSandboxDemo = () => {
    setSandboxStage('encrypting');
    window.setTimeout(() => setSandboxStage('extracting'), 700);
    window.setTimeout(() => setSandboxStage('attested'), 1500);
    window.setTimeout(() => setSandboxStage('verified'), 2300);
  };

  const faqItems: {
    alias: string;
    question: string;
    answer: React.ReactNode;
    accent: 'teal' | 'emerald' | 'cyan';
  }[] = [
      {
        alias: '--privacy-model',
        question: 'How does VeriFlow AI protect document privacy?',
        accent: 'teal',
        answer: (
          <>
            Documents are encrypted in your browser with AES-256-GCM before transmission. They are decrypted exclusively inside TEE enclave RAM, processed to evaluate the requested boolean rule, and immediately zeroed out in RAM. Raw PII is never saved to disk or database.
          </>
        )
      },
      {
        alias: '--proof-verify',
        question: 'How do third parties verify attestation proofs?',
        accent: 'emerald',
        answer: (
          <>
            Every attestation contains a 165-byte canonical payload signed with secp256k1 ECDSA. Third parties can verify the signature on-chain via our <code className="text-emerald-300 font-mono">VeriFlowRegistryV2.sol</code> contract on Coston2 or off-chain using our standalone Public Verifier page.
          </>
        )
      },
      {
        alias: '--failure-states',
        question: 'What happens if a document fails check digits or rule thresholds?',
        accent: 'cyan',
        answer: (
          <>
            VeriFlow AI returns honest 3-state outcomes (<code className="text-emerald-300 font-mono">VERIFIED</code>, <code className="text-rose-300 font-mono">DENIED</code>, or <code className="text-amber-300 font-mono">UNVERIFIABLE</code>). For example, a 17-year-old passport produces an authenticated <code className="text-rose-300 font-mono">DENIED (FALSE)</code> proof, demonstrating the platform does not rubber-stamp results.
          </>
        )
      }
    ];

  const accentStyles = {
    teal: {
      sigil: 'text-teal-400',
      rail: 'border-l-2 border-teal-500',
      cursor: 'bg-teal-400',
      badge: 'bg-teal-500/10 text-teal-300 border-teal-500/20'
    },
    emerald: {
      sigil: 'text-emerald-400',
      rail: 'border-l-2 border-emerald-500',
      cursor: 'bg-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
    },
    cyan: {
      sigil: 'text-cyan-400',
      rail: 'border-l-2 border-cyan-500',
      cursor: 'bg-cyan-400',
      badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
    }
  };
  return (
    <div className="space-y-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6">

      {/* ── HERO SECTION ── */}
      <section className="relative min-h-[calc(100vh-4rem)] py-16 lg:py-24 overflow-hidden text-left flex items-center">
        {/* Subtle Node Constellation / Mesh Network Background */}
        <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[700px] bg-gradient-to-b from-teal-500/20 via-cyan-500/5 to-transparent rounded-full blur-[150px]" />
          <div className="absolute top-1/3 right-0 w-96 h-96 rounded-full bg-cyan-500/10 blur-[130px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:32px_32px] opacity-20" />
        </div>

        <div className="grid lg:grid-cols-12 gap-12 xl:gap-20 items-center w-full">

          {/* Left Hero Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="lg:col-span-7 space-y-7"
          >
            {/* Top Pill Badge */}
            <div
              onClick={onOpenAttestationModal}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-medium text-slate-300 shadow-md cursor-pointer hover:border-teal-500/30 transition-colors"
            >
              <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold font-mono uppercase tracking-wider">NEW</span>
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                Flare Confidential Compute · TEE Attested
              </span>
            </div>

            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black text-cyan-300"><BadgeCheck className="w-4 h-4" /> Privacy-preserving identity infrastructure</div>

            <h1 className="text-5xl sm:text-6xl lg:text-6xl xl:text-[4.85rem] font-black text-white tracking-[-0.055em] leading-[0.98]">
              Verify the truth. <br />
              <span className="bg-gradient-to-r from-teal-300 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Reveal nothing else.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed font-normal">
              Upload sensitive documents once into an attested Confidential Execution Environment. VeriFlow AI returns a cryptographically signed proof — <strong>never the underlying document or raw PII</strong>.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <MagneticButton
                onClick={() => setActiveTab('verify')}
                className="group flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-teal-500/20 transition-all text-sm cursor-pointer active:scale-95"
              >
                <ShieldCheck size={18} className="stroke-[2.5]" />
                <span>Launch Confidential Verification</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </MagneticButton>

              <button
                onClick={() => setActiveTab('developer')}
                className="px-6 py-3.5 bg-slate-900/90 border border-slate-800 rounded-xl hover:bg-slate-800/80 transition-colors font-bold text-sm text-slate-200 flex items-center space-x-2 cursor-pointer"
              >
                <Key className="w-4 h-4 text-purple-400" />
                <span>Explore Enterprise API</span>
              </button>
            </div>

            {/* Micro Stats Bar */}
            <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-4 font-mono text-left max-w-2xl">
              <div>
                <div className="text-lg sm:text-xl font-black text-white">256-bit</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 font-sans">Client AES-GCM</div>
              </div>
              <div>
                <div className="text-lg sm:text-xl font-black text-emerald-400">TEE</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 font-sans">Hardware Enclave</div>
              </div>
              <div>
                <div className="text-lg sm:text-xl font-black text-teal-300">Flare</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 font-sans">On-Chain Attest</div>
              </div>
            </div>
          </motion.div>

          {/* Right Hero Graphic: Glassmorphic Orb Enclave Core */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="lg:col-span-5 flex justify-center items-center relative py-6"
          >
            {/* Main Holographic Enclave Visual Component */}
            <div className="absolute -inset-12 rounded-full bg-teal-500/10 blur-[90px]" />

            <div className="relative w-full max-w-[390px] mx-auto">
              {/* Floating Status Badges - Pinned to Card relative boundaries */}
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity }} className="absolute -left-2 top-14 z-30 px-2.5 py-1.5 rounded-xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl text-[10px] font-mono text-cyan-300 backdrop-blur-md flex items-center gap-1.5"><ScanLine className="w-3 h-3" />PII IN · ENCRYPTED</motion.div>
              <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }} className="absolute -right-2 bottom-28 z-30 px-2.5 py-1.5 rounded-xl bg-slate-900/95 border border-emerald-500/40 shadow-2xl text-[10px] font-mono text-emerald-300 backdrop-blur-md flex items-center gap-1.5"><BadgeCheck className="w-3 h-3" />CLAIM OUT · VERIFIED</motion.div>

              <div className="relative w-full h-[500px] bg-gradient-to-b from-slate-900/85 to-slate-950/95 backdrop-blur-2xl border border-slate-700/70 rounded-[40px] shadow-[0_35px_100px_-25px_rgba(20,184,166,0.35)] p-6 flex flex-col items-center justify-between overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/10 via-emerald-500/5 to-transparent pointer-events-none" />

                {/* Status Header */}
                <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800/80 pb-3 z-10">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    ENCLAVE_READY
                  </span>
                  <span className="text-teal-400 font-bold">COSTON2</span>
                </div>

                {/* Glowing Orb Centerpiece */}
                <div className="relative my-auto flex items-center justify-center">
                  <motion.div
                    animate={{
                      rotate: 360,
                      scale: [1, 1.04, 1]
                    }}
                    transition={{
                      rotate: { duration: 25, repeat: Infinity, ease: 'linear' },
                      scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
                    }}
                    className="w-56 h-56 rounded-full bg-gradient-to-br from-teal-400/20 via-emerald-500/30 to-cyan-500/20 border border-teal-400/40 blur-sm absolute"
                  />

                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-40 h-40 rounded-[36px] bg-slate-950/90 border border-teal-500/50 shadow-2xl shadow-teal-500/30 flex flex-col items-center justify-center relative z-10 space-y-2 backdrop-blur-xl"
                  >
                    <Cpu size={36} className="text-teal-300 animate-pulse" />
                    <span className="text-[10px] font-mono text-emerald-400 font-extrabold tracking-wider">TEE_CORE</span>
                  </motion.div>
                </div>

                <button onClick={runSandboxDemo} disabled={sandboxStage !== 'idle' && sandboxStage !== 'verified'} className="w-full py-2 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 text-slate-950 text-xs font-black z-10 disabled:opacity-70">
                  {sandboxStage === 'idle' ? 'Simulate Verification' : sandboxStage === 'encrypting' ? 'Encrypting locally…' : sandboxStage === 'extracting' ? 'TEE extracting claim…' : sandboxStage === 'attested' ? 'Attestation quote verified…' : '✓ age_above_18 VERIFIED'}
                </button>

                {sandboxStage === 'verified' && <div className="w-full px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300 font-mono z-10">Flare attestation ready · raw document sanitized</div>}

                {/* Enclave Quote Measurement Footer */}
                <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 z-10 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>M_CODE HASH</span>
                    <span className="text-emerald-400 font-bold">MATCHED</span>
                  </div>
                  <div className="text-[11px] font-mono text-teal-300 truncate">0xd84e5aba91f42c7e8a3b...</div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </section>


      {/* ── SECTION 2: CENTERED HEADER + 3 ROUNDED FEATURE CARDS ── */}
      <section className="-mt-20 relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-2xl bg-slate-900/65 backdrop-blur-xl border border-slate-800/80 shadow-2xl">
        {[{ icon: Cpu, label: 'Confidential compute', value: 'TEE isolated' }, { icon: DatabaseZap, label: 'Data retention', value: 'Raw PII: zero' }, { icon: Network, label: 'Settlement', value: 'Flare Coston2' }, { icon: BadgeCheck, label: 'Proof standard', value: 'ECDSA EIP-191' }].map(item => <div key={item.label} className="p-4 rounded-xl border border-slate-800/70 bg-slate-950/50"><item.icon className="w-4 h-4 text-teal-400" /><div className="text-[10px] text-slate-500 uppercase tracking-wider mt-3">{item.label}</div><div className="text-xs font-black text-slate-200 mt-1">{item.value}</div></div>)}
      </section>

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
        className="space-y-12"
      >
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
            <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold">EXPLORE</span>
            <span>Service Benefits</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Explore the Advantages of a Confidential Future.
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Zero-knowledge execution backed by hardware attestation and smart contract settlement.
          </p>
        </div>

        {/* 3 Main Feature Cards (matching reference card style) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <motion.div
            whileHover={{ y: -6 }}
            className="p-8 rounded-[32px] bg-slate-900/80 border border-slate-800 space-y-6 flex flex-col justify-between hover:border-teal-500/40 transition-all shadow-xl text-left"
          >
            <div className="w-full h-44 rounded-2xl bg-gradient-to-br from-slate-950 via-teal-950/30 to-slate-950 border border-slate-800 flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-teal-500/5 group-hover:bg-teal-500/10 transition-colors" />
              <Lock className="w-14 h-14 text-teal-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Client-Side Encryption</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Files are encrypted locally in the browser with AES-256-GCM before upload. Raw document bytes never hit storage unencrypted.
              </p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -6 }}
            className="p-8 rounded-[32px] bg-slate-900/80 border border-slate-800 space-y-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-xl text-left"
          >
            <div className="w-full h-44 rounded-2xl bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-950 border border-slate-800 flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />
              <Cpu className="w-14 h-14 text-emerald-400 group-hover:scale-110 transition-transform animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Attested TEE Enclave</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                KMS releases decryption keys <em>only</em> to hardware enclaves presenting a valid Remote Attestation Quote matching allow-listed code.
              </p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -6 }}
            className="p-8 rounded-[32px] bg-slate-900/80 border border-slate-800 space-y-6 flex flex-col justify-between hover:border-cyan-500/40 transition-all shadow-xl text-left"
          >
            <div className="w-full h-44 rounded-2xl bg-gradient-to-br from-slate-950 via-cyan-950/30 to-slate-950 border border-slate-800 flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors" />
              <ShieldCheck className="w-14 h-14 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Independently Verifiable</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enclave signs verification claims with an isolated private key. Any third party can audit the proof against the published public key.
              </p>
            </div>
          </motion.div>

        </div>
      </motion.section>


      {/* ── SECTION 3: FEATURE SHOWCASE BANNER ── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
        className="p-8 sm:p-12 rounded-[36px] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden text-left"
      >
        <div className="grid lg:grid-cols-12 gap-8 items-center">

          {/* Left Media Core */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-[32px] bg-slate-950 border border-slate-800 p-6 flex flex-col items-center justify-center relative shadow-inner">
              <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/10 to-emerald-500/5 rounded-[32px]" />
              <Fingerprint className="w-20 h-20 text-teal-400 animate-pulse mb-4 z-10" />
              <span className="text-xs font-mono text-emerald-400 font-bold z-10">ZERO_KNOWLEDGE_PROOF</span>
              <span className="text-[10px] text-slate-400 font-mono mt-1 z-10">ECDSA-secp256k1 Signed</span>
            </div>
          </div>

          {/* Right Copy */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
              <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold uppercase">COMPANY</span>
              <span>Blockchain & Privacy Experts</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              We are Committed to Building Verifiable Solutions.
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              At VeriFlow AI, we believe in the transformative power of Web3 and Confidential Compute. We envision a future where users are empowered, sensitive PII is never exposed to third parties, and identity operates on a foundation of cryptographic verification.
            </p>

            <button
              onClick={() => setActiveTab('verify')}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Get Started Now
            </button>
          </div>
        </div>
      </motion.section>

      {/* ── FAQ SECTION: TERMINAL QUERY CONSOLE ── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
        className="space-y-8 text-left"
      >
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Built for Privacy-First Web3 & Web2 Apps
          </h2>
          <p className="text-xs text-slate-400 max-w-xl mx-auto">
            Zero-trust verification primitives designed for instant integration via Web3 wallet or REST API.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <motion.div
            whileHover={{ y: -4 }}
            className="p-8 rounded-[32px] bg-slate-900/90 border border-slate-800 space-y-4 hover:border-teal-500/40 transition-colors shadow-xl"
          >
            <h3 className="text-xl font-bold text-white">Age & Geography Gating</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verify users are 18+ or 21+ using official government passports or driver's licenses without holding user identity scans or storing PII on centralized servers.
            </p>
            <button
              onClick={() => setActiveTab('verify')}
              className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-teal-300 font-bold text-xs hover:bg-slate-800 transition-colors"
            >
              Verify Passport Age (18+)
            </button>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="p-8 rounded-[32px] bg-slate-900/90 border border-slate-800 space-y-4 hover:border-purple-500/40 transition-colors shadow-xl"
          >
            <h3 className="text-xl font-bold text-white">Sybil-Resistant DAO Proofs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Attest university degrees, employment history, or professional certifications to grant weighted DAO voting power while protecting contributor identities.
            </p>
            <button
              onClick={() => setActiveTab('verify')}
              className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-purple-300 font-bold text-xs hover:bg-slate-800 transition-colors"
            >
              Verify Degree Credential
            </button>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="p-8 rounded-[32px] bg-slate-900/90 border border-slate-800 space-y-4 hover:border-emerald-500/40 transition-colors shadow-xl"
          >
            <h3 className="text-xl font-bold text-white">Income & Solvency Proofs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Prove gross monthly income $\ge \$5,000$ or liquid bank balances directly from bank statements or payslips without revealing account numbers or full salary figures.
            </p>
            <button
              onClick={() => setActiveTab('verify')}
              className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 font-bold text-xs hover:bg-slate-800 transition-colors"
            >
              Verify Solvency Threshold
            </button>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="p-8 rounded-[32px] bg-slate-900/90 border border-slate-800 space-y-4 hover:border-cyan-500/40 transition-colors shadow-xl"
          >
            <h3 className="text-xl font-bold text-white">Developer API Gateway</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Integrate privacy verification into any React app or Python service in 3 lines of code using our FastAPI gateway with SHA-256 API key authentication and rate limiting.
            </p>
            <button
              onClick={() => setActiveTab('developer')}
              className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-bold text-xs hover:bg-slate-800 transition-colors"
            >
              Open API Gateway
            </button>
          </motion.div>

        </div>
      </motion.section>


      {/* ── SECTION 5: INTERCONNECTED CRYPTOGRAPHIC TIMELINE PIPELINE ── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
        className="space-y-12 relative"
      >
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300 shadow-xl">
            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-300 font-bold uppercase tracking-wider">PIPELINE</span>
            <span>Cryptographic Proof Lifecycle</span>
          </div>
          <h2 className="text-3xl sm:text-3xl font-black text-white tracking-tight">
            A Step-by-Step Guide to VeriFlow AI
          </h2>
          <p className="text-xs text-slate-400">
            How confidential compute verifies claims end-to-end without revealing raw document PII.
          </p>
        </div>

        {/* Futuristic Laser Node Pipeline Container */}
        <div className="relative pt-6">

          {/* Horizontal Connecting Glow Line (Desktop) */}
          <div className="hidden lg:block absolute top-[68px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-teal-500/30 via-emerald-500/50 to-purple-500/30 z-0">
            <motion.div
              animate={{ x: ['0%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="h-full w-24 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-[1px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left relative z-10">

            {/* Step 1 Node */}
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="group p-6 rounded-[28px] bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-teal-500/50 transition-all shadow-2xl flex flex-col justify-between space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl group-hover:bg-teal-500/15 transition-colors" />

              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-slate-950 border border-teal-500/30 flex items-center justify-center font-mono font-black text-teal-400 text-sm shadow-inner group-hover:shadow-[0_0_15px_rgba(45,212,191,0.3)] transition-all">
                  01
                </div>
                <span className="text-[10px] font-mono text-teal-400 font-bold px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                  AES-256-GCM
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-base group-hover:text-teal-300 transition-colors">Encrypted Upload</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Client encrypts document locally in browser memory before transmitting blob to storage.
                </p>
              </div>
            </motion.div>

            {/* Step 2 Node */}
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="group p-6 rounded-[28px] bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-emerald-500/50 transition-all shadow-2xl flex flex-col justify-between space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-colors" />

              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-slate-950 border border-emerald-500/30 flex items-center justify-center font-mono font-black text-emerald-400 text-sm shadow-inner group-hover:shadow-[0_0_15px_rgba(52,211,153,0.3)] transition-all">
                  02
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  TEE QUOTE
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">Hardware Attestation</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Hardware enclave generates remote attestation quote proving code measurement <code className="text-teal-300 font-mono">M_code</code>.
                </p>
              </div>
            </motion.div>

            {/* Step 3 Node */}
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="group p-6 rounded-[28px] bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-cyan-500/50 transition-all shadow-2xl flex flex-col justify-between space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/15 transition-colors" />

              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-slate-950 border border-cyan-500/30 flex items-center justify-center font-mono font-black text-cyan-400 text-sm shadow-inner group-hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all">
                  03
                </div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                  IN-RAM KMS
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">Key Release & Rule</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  KMS releases decryption keys exclusively inside enclave RAM for instantaneous rule evaluation.
                </p>
              </div>
            </motion.div>

            {/* Step 4 Node */}
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="group p-6 rounded-[28px] bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-purple-500/50 transition-all shadow-2xl flex flex-col justify-between space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/15 transition-colors" />

              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-slate-950 border border-purple-500/30 flex items-center justify-center font-mono font-black text-purple-400 text-sm shadow-inner group-hover:shadow-[0_0_15px_rgba(192,132,252,0.3)] transition-all">
                  04
                </div>
                <span className="text-[10px] font-mono text-purple-400 font-bold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                  ECDSA PROOF
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-base group-hover:text-purple-300 transition-colors">Signed Proof Output</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enclave erases RAM and outputs an ECDSA-secp256k1 signed proof published to Flare Coston2.
                </p>
              </div>
            </motion.div>

          </div>
        </div>
      </motion.section>

      {/* ── FAQ SECTION: TERMINAL QUERY CONSOLE ── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
        className="relative max-w-4xl mx-auto"
      >
        {/* Ambient Radial Glow & Mesh Grid */}
        <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-teal-500/10 rounded-full blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
        </div>

        {/* Outer Terminal Window Frame */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-2xl shadow-2xl overflow-hidden text-left font-mono">

          {/* Terminal Window Header Chrome */}
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600/50" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600/50" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600/50" />
            </div>

            <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
              <Terminal className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-slate-300 font-semibold">veriflow://knowledge-base</span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>connected</span>
            </div>
          </div>

          {/* Console Body Area */}
          <div className="p-4 sm:p-6 bg-slate-950/95 space-y-4">
            {faqItems.map((item, idx) => {
              const isOpen = openFaq === idx;
              const accent = accentStyles[item.accent];

              return (
                <div
                  key={idx}
                  className={`rounded-xl border transition-all overflow-hidden ${isOpen
                      ? `${accent.rail} bg-slate-900/90 border-slate-800 shadow-xl`
                      : 'border-slate-900 bg-slate-950 hover:bg-slate-900/40 hover:border-slate-800'
                    }`}
                >
                  {/* Shell Query Prompt Button */}
                  <button
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    aria-expanded={isOpen}
                    className="w-full p-4 flex items-center justify-between text-left group cursor-pointer focus:outline-none"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      {/* Line Number Gutter */}
                      <span className="text-slate-600 text-xs select-none shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>

                      {/* Sigil + Alias + Question */}
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                        <span className={`font-black ${accent.sigil}`}>$</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${accent.badge} shrink-0`}>
                          {item.alias}
                        </span>
                        <span className="text-slate-200 font-sans font-medium group-hover:text-white transition-colors">
                          {item.question}
                        </span>
                      </div>
                    </div>

                    {/* Toggle Indicator Glyph */}
                    <div className={`p-1 rounded-md text-slate-500 group-hover:text-slate-300 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-teal-400' : ''}`}>
                      <ChevronDown size={16} />
                    </div>
                  </button>

                  {/* Console Output Answer Stream */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="overflow-hidden border-t border-slate-800/60 bg-slate-950/80"
                      >
                        <div className="p-4 sm:p-5 pl-8 sm:pl-10 flex items-start gap-2 text-xs text-slate-300 leading-relaxed font-sans">
                          <span className={`font-mono ${accent.sigil} select-none font-bold text-sm leading-none pt-0.5`}>›</span>
                          <div className="space-y-1">
                            <span>{item.answer}</span>
                            <span className={`inline-block w-2 h-3.5 ml-1.5 align-middle ${accent.cursor} animate-pulse`} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Console Footer */}
          <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>[UP/DOWN] Navigate queries</span>
            <span>UTF-8 · 165-Byte Proof Verified</span>
          </div>

        </div>
      </motion.section>

    </div>
  );
};

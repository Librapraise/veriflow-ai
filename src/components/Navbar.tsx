import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Wallet, 
  Key, 
  FileText, 
  BarChart3, 
  Bot, 
  Lock,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Layers
} from 'lucide-react';
import type { UserSession } from '../types/veriflow';
import { requestWalletConnection } from '../lib/siwe';

interface NavbarProps {
  activeTab: 'landing' | 'dashboard' | 'verify' | 'verifier' | 'history' | 'developer' | 'assistant';
  setActiveTab: (tab: 'landing' | 'dashboard' | 'verify' | 'verifier' | 'history' | 'developer' | 'assistant') => void;
  userSession: UserSession;
  setUserSession: React.Dispatch<React.SetStateAction<UserSession>>;
  onOpenAttestationModal: () => void;
}

type Tab = 'landing' | 'dashboard' | 'verify' | 'verifier' | 'history' | 'developer' | 'assistant';

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  userSession,
  setUserSession,
  onOpenAttestationModal,
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'solutions' | 'developers' | null>(null);

  const handleConnectWallet = async () => {
    setIsAuthenticating(true);
    try {
      const { connectMetaMaskWallet } = await import('../lib/wallet');
      const walletState = await connectMetaMaskWallet();
      if (walletState.isConnected) {
        setUserSession(prev => ({
          ...prev,
          address: walletState.address,
          isConnected: true,
          chainId: walletState.chainId,
        }));
      }
    } catch (e: any) {
      console.warn('MetaMask wallet connection fallback to SIWE simulation:', e);
      try {
        const wallet = await requestWalletConnection();
        setUserSession(prev => ({
          ...prev,
          address: wallet.address,
          isConnected: true,
          chainId: wallet.chainId,
        }));
      } catch (err) {
        console.error('Wallet error:', err);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnectWallet = () => {
    setUserSession({
      address: '',
      isConnected: false,
      chainId: 114,
      trustScore: 0,
      documentsCount: 0,
      verificationsCount: 0,
    });
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const handleNavClick = (tab: Tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">

            {/* ── Brand Logo ── */}
            <div
              className="flex items-center space-x-2.5 cursor-pointer shrink-0"
              onClick={() => handleNavClick('landing')}
            >
              <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-md shadow-teal-500/20 shrink-0">
                <ShieldCheck className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
              </div>
              <div className="leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                    VeriFlow<span className="text-teal-400 font-black">AI</span>
                  </span>
                </div>
                <p className="hidden sm:block text-[10px] text-slate-400 font-medium mt-0.5">Confidential Compute</p>
              </div>
            </div>

            {/* ── Floating Categorized Nav Bar ── */}
            <nav className="hidden lg:flex items-center gap-2 bg-slate-900/90 backdrop-blur-xl px-4 py-1.5 rounded-full border border-slate-800 shadow-xl">
              
              {/* 1. Dashboard Direct Link */}
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
                <span>Dashboard</span>
              </button>

              {/* 2. Solutions Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => setActiveDropdown('solutions')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    ['verify', 'verifier', 'history'].includes(activeTab) || activeDropdown === 'solutions'
                      ? 'bg-slate-800 text-teal-300 border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Solutions</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'solutions' ? 'rotate-180 text-teal-400' : 'text-slate-500'}`} />
                </button>

                {/* Dropdown Card */}
                {activeDropdown === 'solutions' && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-72 z-50 animate-fade-in">
                    <div className="p-2 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-slate-800 shadow-2xl space-y-1">
                      
                      <button
                        onClick={() => handleNavClick('verify')}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl transition-all text-left group ${
                          activeTab === 'verify' ? 'bg-teal-500/10 border border-teal-500/30' : 'hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <span>Verify Claim</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300">18+ Golden</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">Encrypt PII locally & evaluate enclave rule</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleNavClick('verifier')}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl transition-all text-left group ${
                          activeTab === 'verifier' ? 'bg-teal-500/10 border border-teal-500/30' : 'hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:scale-105 transition-transform">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <span>Public Verifier</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-teal-500/20 text-teal-300">Zero-Trust</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">Audit enclave ECDSA proof & Flare Coston2 hash</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleNavClick('history')}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl transition-all text-left group ${
                          activeTab === 'history' ? 'bg-teal-500/10 border border-teal-500/30' : 'hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 group-hover:scale-105 transition-transform">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Verification History</div>
                          <p className="text-[11px] text-slate-400 mt-0.5">View & manage all issued attestation certificates</p>
                        </div>
                      </button>

                    </div>
                  </div>
                )}
              </div>

              {/* 3. Developers & AI Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => setActiveDropdown('developers')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    ['developer', 'assistant'].includes(activeTab) || activeDropdown === 'developers'
                      ? 'bg-slate-800 text-purple-300 border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Developers & AI</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'developers' ? 'rotate-180 text-purple-400' : 'text-slate-500'}`} />
                </button>

                {/* Dropdown Card */}
                {activeDropdown === 'developers' && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-72 z-50 animate-fade-in">
                    <div className="p-2 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-slate-800 shadow-2xl space-y-1">
                      
                      <button
                        onClick={() => handleNavClick('developer')}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl transition-all text-left group ${
                          activeTab === 'developer' ? 'bg-purple-500/10 border border-purple-500/30' : 'hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform">
                          <Key className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Developer API Portal</div>
                          <p className="text-[11px] text-slate-400 mt-0.5">Manage API keys, webhooks, and REST endpoints</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleNavClick('assistant')}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl transition-all text-left group ${
                          activeTab === 'assistant' ? 'bg-purple-500/10 border border-purple-500/30' : 'hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-teal-500/20 text-purple-300 border border-purple-500/30 group-hover:scale-105 transition-transform">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Confidential AI Assistant</div>
                          <p className="text-[11px] text-slate-400 mt-0.5">Ask questions about Flare TEE attestation & code</p>
                        </div>
                      </button>

                    </div>
                  </div>
                )}
              </div>

            </nav>

            {/* ── Right Action Items ── */}
            <div className="flex items-center gap-2 shrink-0">

              {/* TEE Attestation badge */}
              <button
                onClick={onOpenAttestationModal}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-teal-500/30 hover:border-teal-500/60 text-xs font-semibold text-teal-300 transition-all cursor-pointer"
                title="Inspect live TEE Remote Attestation quote"
              >
                <Cpu className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                <span>
                  TEE: <strong className="text-emerald-400">PASSED</strong>
                </span>
              </button>

              {/* Wallet area */}
              {userSession.isConnected ? (
                <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700/60 p-1 rounded-xl">
                  <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-300 text-[10px] font-bold border border-orange-500/20 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                    <span>C2FLR</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 text-xs font-medium text-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="font-mono text-xs">{truncateAddress(userSession.address)}</span>
                  </div>
                  <button
                    onClick={handleDisconnectWallet}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 text-xs transition-all font-semibold"
                    title="Disconnect Wallet"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  disabled={isAuthenticating}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-teal-500/20 active:scale-95 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isAuthenticating ? 'Signing…' : 'Connect Wallet'}</span>
                </button>
              )}

              {/* Hamburger — mobile / tablet only */}
              <button
                onClick={() => setMobileMenuOpen(prev => !prev)}
                className="lg:hidden flex items-center justify-center w-8 h-8 rounded-xl bg-slate-800/70 hover:bg-slate-700/70 text-slate-300 border border-slate-700/50 transition-all"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile / Tablet Drawer ── */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-md px-4 py-4 space-y-1">

            {/* TEE attestation row inside mobile menu */}
            <button
              onClick={() => { onOpenAttestationModal(); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/80 border border-teal-500/20 text-sm font-semibold text-teal-300 hover:border-teal-500/50 transition-all"
            >
              <Cpu className="w-4 h-4 text-teal-400 animate-pulse shrink-0" />
              <span>TEE Attestation: <strong className="text-emerald-400">PASSED</strong></span>
              <ChevronRight className="w-4 h-4 ml-auto text-slate-500" />
            </button>

            <div className="w-full h-px bg-slate-800/60 my-2" />

            {/* Nav links */}
            {[
              { id: 'dashboard' as Tab, label: 'Dashboard', icon: <BarChart3 className="w-4 h-4 text-teal-400" /> },
              { id: 'verify' as Tab, label: 'Verify Claim (18+ Golden)', icon: <Lock className="w-4 h-4 text-emerald-400" /> },
              { id: 'verifier' as Tab, label: 'Public Verifier', icon: <ShieldCheck className="w-4 h-4 text-teal-400" /> },
              { id: 'history' as Tab, label: 'Verification History', icon: <FileText className="w-4 h-4 text-slate-400" /> },
              { id: 'developer' as Tab, label: 'Developer API Portal', icon: <Key className="w-4 h-4 text-purple-400" /> },
              { id: 'assistant' as Tab, label: 'AI Assistant', icon: <Bot className="w-4 h-4 text-purple-400" /> }
            ].map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-500/10 text-teal-300 border-teal-500/30 font-bold'
                      : 'border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                  <ChevronRight className={`w-4 h-4 ml-auto transition-all ${isActive ? 'text-teal-400' : 'text-slate-600'}`} />
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Backdrop overlay for mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

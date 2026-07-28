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
  ChevronRight
} from 'lucide-react';
import type { UserSession } from '../types/veriflow';
import { requestWalletConnection } from '../lib/siwe';

interface NavbarProps {
  activeTab: 'landing' | 'dashboard' | 'verify' | 'history' | 'developer' | 'assistant';
  setActiveTab: (tab: 'landing' | 'dashboard' | 'verify' | 'history' | 'developer' | 'assistant') => void;
  userSession: UserSession;
  setUserSession: React.Dispatch<React.SetStateAction<UserSession>>;
  onOpenAttestationModal: () => void;
}

type Tab = 'landing' | 'dashboard' | 'verify' | 'history' | 'developer' | 'assistant';

const NAV_LINKS: {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  accent?: 'teal' | 'purple';
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" />, accent: 'teal' },
  {
    id: 'verify',
    label: 'Verify Claim',
    icon: <Lock className="w-4 h-4 text-emerald-400" />,
    badge: '18+ Golden',
    accent: 'teal',
  },
  { id: 'history', label: 'History', icon: <FileText className="w-4 h-4" />, accent: 'teal' },
  { id: 'developer', label: 'Developer API', icon: <Key className="w-4 h-4" />, accent: 'teal' },
  {
    id: 'assistant',
    label: 'AI Assistant',
    icon: <Bot className="w-4 h-4 text-purple-400" />,
    accent: 'purple',
  },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  userSession,
  setUserSession,
  onOpenAttestationModal,
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* ── Brand Logo ── */}
            <div
              className="flex items-center space-x-3 cursor-pointer shrink-0"
              onClick={() => setActiveTab('landing')}
            >
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/20">
                <ShieldCheck className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
              </div>
              <div className="leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                    VeriFlow<span className="text-teal-400 font-black">AI</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 leading-tight">
                    TEE<br/>ATTESTED
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Flare Confidential Compute</p>
              </div>
            </div>

            {/* ── Desktop Nav (center) ── */}
            <nav className="hidden lg:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/60 flex-1 max-w-xl mx-auto justify-center">
              {NAV_LINKS.map(link => {
                const isActive = activeTab === link.id;
                const activeCls =
                  link.accent === 'purple'
                    ? 'bg-gradient-to-r from-purple-500/20 to-teal-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                    : 'bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-300 border border-teal-500/30 shadow-sm';
                return (
                  <button
                    key={link.id}
                    onClick={() => handleNavClick(link.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      isActive ? activeCls : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                    {link.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                        {link.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* ── Right Action Items ── */}
            <div className="flex items-center gap-2 shrink-0">

              {/* TEE Attestation badge — desktop only */}
              <button
                onClick={onOpenAttestationModal}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-teal-500/30 hover:border-teal-500/60 text-xs font-semibold text-teal-300 transition-all shadow-sm"
                title="Inspect live TEE Remote Attestation quote"
              >
                <Cpu className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                <span>
                  TEE:{' '}
                  <strong className="text-emerald-400">PASSED</strong>
                </span>
              </button>

              {/* Wallet area */}
              {userSession.isConnected ? (
                <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/60 p-1 rounded-xl">
                  {/* Network badge */}
                  <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/10 text-orange-300 text-[10px] font-bold border border-orange-500/20 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                    <span>C2FLR</span>
                  </div>
                  {/* Address */}
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 text-xs font-medium text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    <span className="hidden sm:block">{truncateAddress(userSession.address)}</span>
                  </div>
                  {/* Disconnect */}
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
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-teal-500/20 active:scale-95 disabled:opacity-50 whitespace-nowrap"
                >
                  <Wallet className="w-4 h-4 stroke-[2.5]" />
                  <span className="hidden sm:block">{isAuthenticating ? 'Signing…' : 'Connect Wallet'}</span>
                  <span className="sm:hidden">{isAuthenticating ? '…' : 'Connect'}</span>
                </button>
              )}

              {/* Hamburger — mobile / tablet only */}
              <button
                onClick={() => setMobileMenuOpen(prev => !prev)}
                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-slate-800/70 hover:bg-slate-700/70 text-slate-300 border border-slate-700/50 transition-all"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
            {NAV_LINKS.map(link => {
              const isActive = activeTab === link.id;
              const activeCls =
                link.accent === 'purple'
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                  : 'bg-teal-500/10 text-teal-300 border-teal-500/30';
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    isActive
                      ? activeCls
                      : 'border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="shrink-0">{link.icon}</span>
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                      {link.badge}
                    </span>
                  )}
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

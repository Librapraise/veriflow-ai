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
  Sparkles
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

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  userSession,
  setUserSession,
  onOpenAttestationModal
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

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
          chainId: walletState.chainId
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
          chainId: wallet.chainId
        }));
      } catch (err) {
        console.error('Wallet error:', err);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('landing')}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/20">
              <ShieldCheck className="w-6 h-6 text-slate-950 stroke-[2.5]" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  VeriFlow<span className="text-teal-400 font-black">AI</span>
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  TEE ATTESTED
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-1 font-medium">Flare Confidential Compute</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/60">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('verify')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'verify'
                  ? 'bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Verify Claim</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                18+ Golden
              </span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>History</span>
            </button>

            <button
              onClick={() => setActiveTab('developer')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'developer'
                  ? 'bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>Developer API</span>
            </button>

            <button
              onClick={() => setActiveTab('assistant')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'assistant'
                  ? 'bg-gradient-to-r from-purple-500/20 to-teal-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Bot className="w-4 h-4 text-purple-400" />
              <span>AI Assistant</span>
            </button>
          </nav>

          {/* Right Action Items */}
          <div className="flex items-center space-x-3">
            
            {/* Live Attestation Badge Button */}
            <button
              onClick={onOpenAttestationModal}
              className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-teal-500/30 hover:border-teal-500/60 text-xs font-semibold text-teal-300 transition-all shadow-sm"
              title="Inspect live TEE Remote Attestation quote"
            >
              <Cpu className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
              <span>TEE Attestation: <strong className="text-emerald-400">PASSED</strong></span>
            </button>

            {/* Wallet Button */}
            {userSession.isConnected ? (
              <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-700/60 p-1 rounded-xl">
                {/* Coston2 Network Badge */}
                <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-300 text-[10px] font-bold border border-orange-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                  <span>Coston2 C2FLR</span>
                </div>
                <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-medium text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{truncateAddress(userSession.address)}</span>
                </div>
                <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-300 text-xs font-bold border border-teal-500/20">
                  <Sparkles className="w-3 h-3 text-teal-400" />
                  <span>Trust: {userSession.trustScore}/100</span>
                </div>
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                disabled={isAuthenticating}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-teal-500/20 active:scale-95 disabled:opacity-50"
              >
                <Wallet className="w-4 h-4 stroke-[2.5]" />
                <span>{isAuthenticating ? 'Signing SIWE...' : 'Connect Wallet'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

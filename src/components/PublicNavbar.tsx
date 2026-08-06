import React from 'react';
import { Key, ShieldCheck, Wallet } from 'lucide-react';
import type { UserSession } from '../types/veriflow';

interface PublicNavbarProps { userSession: UserSession; onNavigate: (path: string) => void; onConnect: () => void }
export const PublicNavbar: React.FC<PublicNavbarProps> = ({ userSession, onNavigate, onConnect }) => (
  <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
      <button onClick={() => onNavigate('/')} className="flex items-center gap-2.5" aria-label="VeriFlow AI home">
        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-slate-950" /></span>
        <span className="font-black text-white">VeriFlow<span className="text-teal-400">AI</span></span>
      </button>
      <nav className="hidden sm:flex items-center gap-2"><button onClick={() => onNavigate('/verifier')} className="px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800">Public Verifier</button><button onClick={() => onNavigate('/app/developer')} className="px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800"><Key className="w-3 h-3 inline mr-1 text-purple-400" />Developers</button></nav>
      {userSession.isConnected ? <span className="px-3 py-2 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs text-emerald-300 font-mono">● {userSession.address.slice(0, 6)}…{userSession.address.slice(-4)}</span> : <button onClick={onConnect} className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 text-xs font-black"><Wallet className="w-3.5 h-3.5 inline mr-1" />Connect Wallet</button>}
    </div>
  </header>
);

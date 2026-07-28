import React from 'react';
import { 
  ShieldCheck, 
  ArrowUpRight, 
  Lock, 
  Sparkles, 
  Cpu, 
  Plus,
  Zap,
  Key,
  Clock
} from 'lucide-react';
import type { UserSession } from '../types/veriflow';
import { VeriFlowStore } from '../lib/apiStore';

interface DashboardProps {
  userSession: UserSession;
  setActiveTab: (tab: 'landing' | 'dashboard' | 'verify' | 'history' | 'developer' | 'assistant') => void;
  onOpenAttestationModal: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  userSession,
  setActiveTab,
  onOpenAttestationModal
}) => {
  const documents = VeriFlowStore.getDocuments();
  const verifications = VeriFlowStore.getVerifications();

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-slate-400">IDENTITY TRUST PROFILE ACTIVE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Welcome, <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">{userSession.address.substring(0, 6)}...{userSession.address.substring(userSession.address.length - 4)}</span>
          </h1>
          <p className="text-xs text-slate-400">All sensitive documents encrypted client-side. Zero raw document persistence.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab('verify')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-teal-500/20 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Verify New Claim</span>
          </button>
          
          <button
            onClick={onOpenAttestationModal}
            className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-teal-500/30 text-teal-300 font-bold text-xs flex items-center space-x-2 transition-all"
          >
            <Cpu className="w-4 h-4 text-teal-400" />
            <span>TEE Status</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Trust Score Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Identity Trust Score</span>
            <Sparkles className="w-4 h-4 text-teal-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white">{userSession.trustScore}</span>
            <span className="text-xs text-slate-400 font-semibold">/ 100</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-500" 
              style={{ width: `${userSession.trustScore}%` }}
            />
          </div>
          <p className="text-[11px] text-teal-400 font-medium">Verified by 4 enclave attestations</p>
        </div>

        {/* Documents Uploaded Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Encrypted Documents</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">{documents.length}</div>
          <p className="text-[11px] text-slate-400">AES-256-GCM Blobs stored on R2</p>
        </div>

        {/* Verifications Completed Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Signed Verifications</span>
            <ShieldCheck className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-3xl font-black text-white">{verifications.length}</div>
          <p className="text-[11px] text-emerald-400 font-medium">100% Attested TEE Signed</p>
        </div>

        {/* Wallet Connected Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Wallet SIWE Session</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="text-sm font-extrabold text-slate-200 truncate">
            {userSession.address.substring(0, 8)}...
          </div>
          <p className="text-[11px] text-slate-400">Flare Coston2 (Chain ID 14)</p>
        </div>

      </div>

      {/* Main Grid: Golden Path Quick Launch + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Golden Path & Claim Presets */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-teal-400" />
                Golden Path Verification Launchers
              </h3>
              <span className="text-[11px] text-slate-400">One-click proof</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Passport Age 18+ Launcher */}
              <div 
                onClick={() => setActiveTab('verify')}
                className="p-4 rounded-xl bg-gradient-to-br from-slate-950 to-teal-950/30 border border-teal-500/30 hover:border-teal-500/60 cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300">
                    GOLDEN PATH
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-teal-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <h4 className="text-sm font-bold text-white">Passport Age 18+ Check</h4>
                <p className="text-xs text-slate-400">Proves age requirement met without revealing passport scan or birthday.</p>
              </div>

              {/* Payslip Income Launcher */}
              <div 
                onClick={() => setActiveTab('verify')}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                    INCOME
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <h4 className="text-sm font-bold text-white">Income Threshold ($50k+)</h4>
                <p className="text-xs text-slate-400">Proves annual income exceeds threshold from payslip or bank statement.</p>
              </div>

              {/* Degree Certificate Launcher */}
              <div 
                onClick={() => setActiveTab('verify')}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                    EDUCATION
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <h4 className="text-sm font-bold text-white">Degree Verification</h4>
                <p className="text-xs text-slate-400">Verifies accredited degree credential from diploma certificate.</p>
              </div>

              {/* Developer API Launcher */}
              <div 
                onClick={() => setActiveTab('developer')}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
                    API INTEGRATION
                  </span>
                  <Key className="w-4 h-4 text-purple-400" />
                </div>
                <h4 className="text-sm font-bold text-white">Developer API Keys</h4>
                <p className="text-xs text-slate-400">Issue API keys for third-party verification requests.</p>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                Recent Verifications Activity
              </h3>
              <button 
                onClick={() => setActiveTab('history')}
                className="text-[11px] text-teal-400 font-bold hover:underline"
              >
                View All ({verifications.length})
              </button>
            </div>

            <div className="space-y-3">
              {verifications.slice(0, 4).map((v) => (
                <div key={v.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">{v.claimTitle}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                      TRUE
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{v.requesterOrg || 'Self Verification'}</span>
                    <span className="font-mono">{new Date(v.verifiedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};

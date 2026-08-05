import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowUpRight, 
  Cpu, 
  Plus,
  Zap,
  Key,
  Clock,
  ExternalLink
} from 'lucide-react';
import type { UserSession } from '../types/veriflow';
import { VeriFlowStore } from '../lib/apiStore';

interface DashboardProps {
  userSession: UserSession;
  setActiveTab: (tab: 'landing' | 'dashboard' | 'verify' | 'history' | 'developer' | 'assistant') => void;
  onOpenAttestationModal: () => void;
}

// --- Glass Card Wrapper Component ---
const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl ${className}`}>
    {children}
  </div>
);

// --- Stats Card Component ---
const StatsCard: React.FC<{ label: string; value: string | number; growth: string }> = ({ label, value, growth }) => (
  <GlassCard className="p-6">
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <div className="flex items-end justify-between">
      <h4 className="text-2xl sm:text-3xl font-extrabold text-white">{value}</h4>
      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${growth.includes('+') || growth === 'Secure' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-slate-400'}`}>
        {growth}
      </span>
    </div>
  </GlassCard>
);

// --- Log Item Component ---
const LogItem: React.FC<{ type: string; date: string; status: 'verified' | 'failed' | 'denied' }> = ({ type, date, status }) => (
  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5">
    <div className="flex items-center gap-3">
      <div className={`w-2.5 h-2.5 rounded-full ${status === 'verified' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-500'}`} />
      <div>
        <p className="text-sm font-medium text-white">{type}</p>
        <p className="text-[10px] text-slate-400 uppercase font-mono tracking-tight">{date}</p>
      </div>
    </div>
    <ExternalLink size={14} className="text-slate-500 group-hover:text-slate-300 cursor-pointer transition-colors" />
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({
  userSession,
  setActiveTab,
  onOpenAttestationModal
}) => {
  const documents = VeriFlowStore.getDocuments();
  const verifications = VeriFlowStore.getVerifications();
  const currentSession = VeriFlowStore.getUserSession();
  const activeTrustScore = currentSession.trustScore || userSession.trustScore;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      {/* Top Welcome Header */}
      <GlassCard className="p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">IDENTITY TRUST PROFILE ACTIVE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back, <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">{userSession.address.substring(0, 6)}...{userSession.address.substring(userSession.address.length - 4)}</span>
            </h1>
            <p className="text-xs text-slate-400">All sensitive documents encrypted on-device. Zero raw document persistence.</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab('verify')}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center space-x-2 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Verify New Claim</span>
            </button>
            
            <button
              onClick={onOpenAttestationModal}
              className="px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-teal-500/30 text-teal-300 font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-teal-400" />
              <span>TEE Status</span>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Summary Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Identity Trust Score" value={`${activeTrustScore}/100`} growth="Secure" />
        <StatsCard label="Encrypted Documents" value={documents.length} growth={documents.length > 0 ? `+${documents.length}` : '0'} />
        <StatsCard label="Signed Verifications" value={verifications.length} growth={verifications.length > 0 ? `+${verifications.length}` : '0'} />
        <StatsCard label="Network Connection" value="Flare Coston2" growth={`Chain ID ${userSession.chainId}`} />
      </div>

      {/* Main Grid: Golden Path Quick Launch + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Golden Path & Claim Presets */}
        <div className="lg:col-span-7 space-y-6">
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                Golden Path Verification Launchers
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">1-click proof</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Passport Age 18+ Launcher */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                onClick={() => setActiveTab('verify')}
                className="p-4 rounded-xl bg-gradient-to-br from-slate-950 to-emerald-950/20 border border-emerald-500/30 hover:border-emerald-500/60 cursor-pointer transition-all space-y-2 group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300">
                    GOLDEN PATH
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <h4 className="text-sm font-bold text-white">Passport Age 18+ Check</h4>
                <p className="text-xs text-slate-400">Proves age requirement met without revealing passport scan or birthday.</p>
              </motion.div>

              {/* Payslip Income Launcher */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                onClick={() => setActiveTab('verify')}
                className="p-4 rounded-xl bg-slate-950/80 border border-white/10 hover:border-white/20 cursor-pointer transition-all space-y-2 group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                    INCOME
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <h4 className="text-sm font-bold text-white">Income Threshold ($50k+)</h4>
                <p className="text-xs text-slate-400">Proves annual income exceeds threshold from payslip or bank statement.</p>
              </motion.div>

              {/* Degree Certificate Launcher */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                onClick={() => setActiveTab('verify')}
                className="p-4 rounded-xl bg-slate-950/80 border border-white/10 hover:border-white/20 cursor-pointer transition-all space-y-2 group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                    EDUCATION
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <h4 className="text-sm font-bold text-white">Degree Verification</h4>
                <p className="text-xs text-slate-400">Verifies accredited degree credential from diploma certificate.</p>
              </motion.div>

              {/* Developer API Launcher */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                onClick={() => setActiveTab('developer')}
                className="p-4 rounded-xl bg-slate-950/80 border border-white/10 hover:border-white/20 cursor-pointer transition-all space-y-2 group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
                    API INTEGRATION
                  </span>
                  <Key className="w-4 h-4 text-purple-400" />
                </div>
                <h4 className="text-sm font-bold text-white">Developer API Keys</h4>
                <p className="text-xs text-slate-400">Issue API keys for third-party verification requests.</p>
              </motion.div>

            </div>
          </GlassCard>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="lg:col-span-5 space-y-6">
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Recent Verifications Activity
              </h3>
              <button 
                onClick={() => setActiveTab('history')}
                className="text-[11px] text-emerald-400 font-bold hover:underline"
              >
                View All ({verifications.length})
              </button>
            </div>

            <div className="space-y-2">
              {verifications.slice(0, 4).map((v) => (
                <LogItem 
                  key={v.id} 
                  type={v.claimTitle} 
                  date={new Date(v.verifiedAt).toLocaleDateString()} 
                  status={v.result ? 'verified' : 'denied'} 
                />
              ))}
            </div>

          </GlassCard>
        </div>

      </div>

    </div>
  );
};

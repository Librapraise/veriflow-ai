import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { DocumentUpload } from './components/DocumentUpload';
import { VerificationHistory } from './components/VerificationHistory';
import { DeveloperPortal } from './components/DeveloperPortal';
import { AIAssistant } from './components/AIAssistant';
import { PublicVerifier } from './components/PublicVerifier';
import type { UserSession } from './types/veriflow';
import { AttestationViewer } from './components/AttestationViewer';
import { VeriFlowStore } from './lib/apiStore';

export function App() {
  const [activeTab, setActiveTab] = useState<'landing' | 'dashboard' | 'verify' | 'verifier' | 'history' | 'developer' | 'assistant'>('landing');
  const [userSession, setUserSession] = useState<UserSession>(VeriFlowStore.getUserSession());
  
  const [isAttestationModalOpen, setIsAttestationModalOpen] = useState<boolean>(false);
  const [simulatedFailAttestation, setSimulatedFailAttestation] = useState<boolean>(false);

  // Sync session changes and detect proof links in URL hash or query params
  useEffect(() => {
    VeriFlowStore.setUserSession(userSession);

    if (typeof window !== 'undefined') {
      if (window.location.hash.length > 1 || window.location.search.includes('verify_id=')) {
        setActiveTab('verifier');
      }
    }
  }, [userSession]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-slate-950">
      
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userSession={userSession}
        setUserSession={setUserSession}
        onOpenAttestationModal={() => setIsAttestationModalOpen(true)}
      />

      {/* Main View Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <LandingPage 
                setActiveTab={setActiveTab}
                onOpenAttestationModal={() => setIsAttestationModalOpen(true)}
              />
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <Dashboard 
                userSession={userSession}
                setActiveTab={setActiveTab}
                onOpenAttestationModal={() => setIsAttestationModalOpen(true)}
              />
            </motion.div>
          )}

          {activeTab === 'verify' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <DocumentUpload 
                setUserSession={setUserSession}
                onOpenAttestationModal={() => setIsAttestationModalOpen(true)}
                simulatedFailAttestation={simulatedFailAttestation}
              />
            </motion.div>
          )}

          {activeTab === 'verifier' && (
            <motion.div
              key="verifier"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <PublicVerifier />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <VerificationHistory 
                onOpenAttestationModal={() => setIsAttestationModalOpen(true)}
              />
            </motion.div>
          )}

          {activeTab === 'developer' && (
            <motion.div
              key="developer"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <DeveloperPortal />
            </motion.div>
          )}

          {activeTab === 'assistant' && (
            <motion.div
              key="assistant"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <AIAssistant 
                setActiveTab={setActiveTab}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* TEE Attestation Inspector Modal */}
      <AttestationViewer
        isOpen={isAttestationModalOpen}
        onClose={() => setIsAttestationModalOpen(false)}
        simulatedFailAttestation={simulatedFailAttestation}
        setSimulatedFailAttestation={setSimulatedFailAttestation}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            <span className="font-semibold text-slate-400">VeriFlow AI · Flare Summer Signal Hackathon 2026</span>
          </div>
          <p className="text-[11px]">
            Privacy-Preserving Verification powered by Flare Confidential Compute TEE Enclaves.
          </p>
        </div>
      </footer>

    </div>
  );
}

export default App;

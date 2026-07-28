import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { DocumentUpload } from './components/DocumentUpload';
import { VerificationHistory } from './components/VerificationHistory';
import { DeveloperPortal } from './components/DeveloperPortal';
import { AIAssistant } from './components/AIAssistant';
import type { UserSession } from './types/veriflow';
import { AttestationViewer } from './components/AttestationViewer';
import { VeriFlowStore } from './lib/apiStore';

export function App() {
  const [activeTab, setActiveTab] = useState<'landing' | 'dashboard' | 'verify' | 'history' | 'developer' | 'assistant'>('dashboard');
  const [userSession, setUserSession] = useState<UserSession>(VeriFlowStore.getUserSession());
  
  const [isAttestationModalOpen, setIsAttestationModalOpen] = useState<boolean>(false);
  const [simulatedFailAttestation, setSimulatedFailAttestation] = useState<boolean>(false);

  // Sync session changes
  useEffect(() => {
    VeriFlowStore.setUserSession(userSession);
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
        {activeTab === 'landing' && (
          <LandingPage 
            setActiveTab={setActiveTab}
            onOpenAttestationModal={() => setIsAttestationModalOpen(true)}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard 
            userSession={userSession}
            setActiveTab={setActiveTab}
            onOpenAttestationModal={() => setIsAttestationModalOpen(true)}
          />
        )}

        {activeTab === 'verify' && (
          <DocumentUpload 
            onOpenAttestationModal={() => setIsAttestationModalOpen(true)}
            simulatedFailAttestation={simulatedFailAttestation}
          />
        )}

        {activeTab === 'history' && (
          <VerificationHistory 
            onOpenAttestationModal={() => setIsAttestationModalOpen(true)}
          />
        )}

        {activeTab === 'developer' && (
          <DeveloperPortal />
        )}

        {activeTab === 'assistant' && (
          <AIAssistant 
            setActiveTab={setActiveTab}
          />
        )}
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

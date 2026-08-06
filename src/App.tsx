import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AIAssistant } from './components/AIAssistant';
import { AttestationViewer } from './components/AttestationViewer';
import { Dashboard } from './components/Dashboard';
import { DeveloperPortal } from './components/DeveloperPortal';
import { DocumentUpload } from './components/DocumentUpload';
import { LandingPage } from './components/LandingPage';
import { PublicNavbar } from './components/PublicNavbar';
import { PublicVerifier } from './components/PublicVerifier';
import { VerificationHistory } from './components/VerificationHistory';
import { VerificationRequestsPage } from './components/VerificationRequestsPage';
import { WorkspaceNavbar } from './components/WorkspaceNavbar';
import { requestWalletConnection } from './lib/siwe';
import { VeriFlowStore } from './lib/apiStore';
import { useAppRouter } from './lib/router';
import type { UserSession } from './types/veriflow';

const tabPaths: Record<string, string> = { landing: '/', dashboard: '/app/dashboard', verify: '/app/verify', verifier: '/verifier', history: '/app/history', developer: '/app/developer', assistant: '/app/assistant' };

export function App() {
  const { route, navigate } = useAppRouter();
  const [userSession, setUserSession] = useState<UserSession>(VeriFlowStore.getUserSession());
  const [isAttestationModalOpen, setIsAttestationModalOpen] = useState(false);
  const [simulatedFailAttestation, setSimulatedFailAttestation] = useState(false);
  const isWorkspace = route.path.startsWith('/app/');

  const navigateTab = (tab: string) => navigate(tabPaths[tab] || '/');
  const connectWallet = async () => {
    try {
      const { connectMetaMaskWallet } = await import('./lib/wallet');
      const wallet = await connectMetaMaskWallet();
      if (wallet.isConnected) {
        const session = { ...VeriFlowStore.getUserSession(), address: wallet.address, isConnected: true, chainId: wallet.chainId };
        VeriFlowStore.setUserSession(session); setUserSession(session); return;
      }
    } catch {
      const wallet = await requestWalletConnection();
      const session = { ...VeriFlowStore.getUserSession(), address: wallet.address, isConnected: true, chainId: wallet.chainId };
      VeriFlowStore.setUserSession(session); setUserSession(session);
    }
  };
  const disconnect = () => { const session: UserSession = { address: '', isConnected: false, chainId: 114, trustScore: 0, documentsCount: 0, verificationsCount: 0 }; VeriFlowStore.setUserSession(session); setUserSession(session); };

  const proofId = route.params.proofId || route.query.get('verify_id');
  const proofReport = proofId ? VeriFlowStore.getVerificationById(proofId) : undefined;
  const requestId = route.query.get('request_id') || undefined;

  const renderPage = () => {
    if (route.path === '/') return <LandingPage setActiveTab={navigateTab} onOpenAttestationModal={() => setIsAttestationModalOpen(true)} />;
    if (route.path === '/verifier' || route.path.startsWith('/verifier/')) return <PublicVerifier proofPayload={proofReport ? JSON.stringify(proofReport) : null} />;
    if (route.path === '/app/dashboard') return <Dashboard userSession={userSession} setActiveTab={navigateTab} onOpenAttestationModal={() => setIsAttestationModalOpen(true)} />;
    if (route.path === '/app/verify') return <DocumentUpload setUserSession={setUserSession} onOpenAttestationModal={() => setIsAttestationModalOpen(true)} simulatedFailAttestation={simulatedFailAttestation} requestId={requestId} />;
    if (route.path === '/app/history') return <VerificationHistory onOpenAttestationModal={() => setIsAttestationModalOpen(true)} />;
    if (route.path === '/app/requests') return <VerificationRequestsPage />;
    if (route.path === '/app/developer') return <DeveloperPortal />;
    if (route.path === '/app/assistant') return <AIAssistant setActiveTab={navigateTab} />;
    return isWorkspace
      ? <Dashboard userSession={userSession} setActiveTab={navigateTab} onOpenAttestationModal={() => setIsAttestationModalOpen(true)} />
      : <LandingPage setActiveTab={navigateTab} onOpenAttestationModal={() => setIsAttestationModalOpen(true)} />;
  };

  return <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-slate-950">
    {isWorkspace ? <WorkspaceNavbar userSession={userSession} current={route.path} onNavigate={navigate} onOpenAttestation={() => setIsAttestationModalOpen(true)} onDisconnect={disconnect} /> : <PublicNavbar userSession={userSession} onNavigate={navigate} onConnect={connectWallet} />}
    <main className={isWorkspace ? 'max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-7' : ''}>
      <AnimatePresence mode="wait"><motion.div key={route.path + route.query.toString()} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>{renderPage()}</motion.div></AnimatePresence>
    </main>
    <AttestationViewer isOpen={isAttestationModalOpen} onClose={() => setIsAttestationModalOpen(false)} simulatedFailAttestation={simulatedFailAttestation} setSimulatedFailAttestation={setSimulatedFailAttestation} />
  </div>;
}

export default App;

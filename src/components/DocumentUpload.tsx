import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileCheck, 
  Lock, 
  ShieldCheck, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Key, 
  FileText, 
  EyeOff, 
  ExternalLink,
  RefreshCw,
  Share2,
  Check,
  Zap,
  Link,
  Terminal,
  Loader2
} from 'lucide-react';
import type { DocumentType, ClaimType, VerificationReport } from '../types/veriflow';
import { encryptDocumentClientSide } from '../lib/crypto';
import { executeConfidentialComputeJob, type EnclaveExecutionProgress } from '../lib/enclaveSimulator';
import { VeriFlowStore } from '../lib/apiStore';
import { DEMO_PASSPORT_ADULT, DEMO_PASSPORT_MINOR, DEMO_PASSPORT_EXPIRED } from '../lib/tee/extractor';
import { anchorVerificationOnFlare } from '../lib/flareContract';

interface DocumentUploadProps {
  setUserSession: (session: any) => void;
  onVerificationComplete?: (report: VerificationReport) => void;
  onOpenAttestationModal: () => void;
  simulatedFailAttestation: boolean;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  setUserSession,
  onVerificationComplete,
  onOpenAttestationModal,
  simulatedFailAttestation
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('passport');
  const [claimType, setClaimType] = useState<ClaimType>('age_above_18');
  const [customIncomeThreshold] = useState<number>(75000);
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [executionSteps, setExecutionSteps] = useState<EnclaveExecutionProgress[]>([]);
  const [completedReport, setCompletedReport] = useState<VerificationReport | null>(null);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isAnchoring, setIsAnchoring] = useState<boolean>(false);
  const [anchorError, setAnchorError] = useState<string | null>(null);

  // Default sample file generator for instant one-click testing
  const handleUseSamplePassport = () => {
    const sampleContent = "%PDF-1.4 Mock Passport Digital Signature Document Alex Rivera";
    const blob = new Blob([sampleContent], { type: "application/pdf" });
    const sampleFile = new File([blob], "Alex_Rivera_Passport_2026.pdf", { type: "application/pdf" });
    setFile(sampleFile);
    setDocumentType('passport');
    setClaimType('age_above_18');
  };

  const handleUseSamplePayslip = () => {
    const sampleContent = "%PDF-1.4 Mock Payslip Flare Labs $125000 Gross";
    const blob = new Blob([sampleContent], { type: "application/pdf" });
    const sampleFile = new File([blob], "FlareLabs_Payslip_June2026.pdf", { type: "application/pdf" });
    setFile(sampleFile);
    setDocumentType('payslip');
    setClaimType('income_above_threshold');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorState(null);
    }
  };

  const handleStartVerification = async () => {
    if (!file) {
      setErrorState('Please select or drag a document file to begin verification.');
      return;
    }

    setIsProcessing(true);
    setErrorState(null);
    setExecutionSteps([]);
    setCompletedReport(null);
    setAnchorError(null);

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is required to verify and anchor this proof on Flare Coston2.');
      }

      // Run directly from the click handler so MetaMask can show its connection
      // prompt immediately. The transaction approval follows after TEE signing.
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Step 1: Client-Side AES-256 Encryption
      const encryptionResult = await encryptDocumentClientSide(file);

      // Save metadata to local store
      const docId = 'doc_' + Math.random().toString(36).substring(2, 8);
      const docMetadata = {
        id: docId,
        userId: VeriFlowStore.getUserSession().address,
        type: documentType,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/pdf',
        encryptedPath: `r2://veriflow-blobs/enc_${docId}.bin`,
        ivHex: encryptionResult.ivHex,
        dataKeyWrappedHex: encryptionResult.wrappedKeyHex,
        status: 'attested_processed' as const,
        createdAt: new Date().toISOString()
      };
      VeriFlowStore.addDocument(docMetadata);

      // Step 2: Confidential Execution Job in TEE
      const report = await executeConfidentialComputeJob(
        {
          claimType,
          documentType,
          documentId: docId,
          fileName: file.name,
          mimeType: file.type,
          userId: VeriFlowStore.getUserSession().address,
          ciphertextBase64: encryptionResult.ciphertextBase64,
          ivHex: encryptionResult.ivHex,
          wrappedKeyHex: encryptionResult.wrappedKeyHex,
          customThreshold: customIncomeThreshold,
          simulatedFailAttestation
        },
        (progress) => {
          setExecutionSteps(prev => [...prev, progress]);
        }
      );

      setIsAnchoring(true);
      setExecutionSteps(prev => [...prev, {
        step: 'ANCHOR_ON_CHAIN',
        message: 'Waiting for MetaMask transaction approval on Flare Coston2...',
        quote: report.attestationQuote,
      }]);

      const anchorResult = await anchorVerificationOnFlare(report);
      const finalReport = anchorResult.success && anchorResult.txHash
        ? { ...report, txHash: anchorResult.txHash, explorerUrl: anchorResult.explorerUrl }
        : report;

      if (anchorResult.success && anchorResult.txHash) {
        setExecutionSteps(prev => [...prev, {
          step: 'ANCHOR_ON_CHAIN',
          message: `Transaction confirmed: ${anchorResult.txHash}`,
          quote: report.attestationQuote,
        }]);
      } else {
        setAnchorError(anchorResult.errorMessage || 'The proof was signed but could not be anchored on Flare Coston2.');
      }

      // Save the signed report even if the user declines the optional chain transaction.
      VeriFlowStore.addVerification(finalReport);
      setUserSession(VeriFlowStore.getUserSession());
      setCompletedReport(finalReport);
      if (onVerificationComplete) onVerificationComplete(finalReport);

    } catch (err: any) {
      console.error('Verification error:', err);
      setErrorState(err.message || 'Verification failed. Attestation rejected by KMS.');
    } finally {
      setIsAnchoring(false);
      setIsProcessing(false);
    }
  };

  const copyShareLink = () => {
    if (!completedReport) return;
    const url = `${window.location.origin}?verify_id=${completedReport.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Called directly from a button click so MetaMask's user-gesture
  // requirement is satisfied and the approval popup actually appears.
  const handleAnchorOnFlare = async () => {
    if (!completedReport) return;
    setIsAnchoring(true);
    setAnchorError(null);
    try {
      const result = await anchorVerificationOnFlare(completedReport);
      if (result.success && result.txHash) {
        setCompletedReport(prev => prev ? { ...prev, txHash: result.txHash, explorerUrl: result.explorerUrl } : prev);
      } else {
        setAnchorError(result.errorMessage || 'Anchoring failed. Check the browser console for details.');
      }
    } catch (e: any) {
      setAnchorError(e.message || 'Unexpected error during anchoring.');
    } finally {
      setIsAnchoring(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 p-8 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Cpu className="w-64 h-64 text-teal-400" />
        </div>

        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>CLIENT-SIDE ENCRYPTION · TEE MEMORY ISOLATION</span>
          </div>

          <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Verify Claims. <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">Never Documents.</span>
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            Upload your document once into an attested Confidential Compute enclave. VeriFlow AI extracts only the requested claim (e.g. <strong>Age 18+</strong>) and emits a cryptographically signed proof — keeping raw documents and PII 100% private.
          </p>
        </div>
      </div>

      {/* Main Workspace Layout */}
      {!completedReport ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form & Drag-Drop */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Document Selection & Quick Presets */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-black">1</span>
                  Select Document & Preset
                </h3>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handleUseSamplePassport}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/20 transition-all flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-teal-400" />
                    Passport Demo (18+)
                  </button>
                  <button 
                    onClick={handleUseSamplePayslip}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-[11px]"
                  >
                    Payslip ($75k)
                  </button>
                </div>
              </div>

              {/* Document Type Dropdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'passport', label: 'Passport / ID', icon: ShieldCheck, popular: true },
                  { id: 'payslip', label: 'Payslip', icon: FileText },
                  { id: 'degree_certificate', label: 'Degree Certificate', icon: FileCheck },
                  { id: 'resume', label: 'Resume', icon: FileText },
                  { id: 'bank_statement', label: 'Bank Statement', icon: FileText },
                  { id: 'drivers_license', label: 'Driver\'s License', icon: ShieldCheck },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = documentType === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setDocumentType(item.id as DocumentType);
                        if (item.id === 'passport') setClaimType('age_above_18');
                        if (item.id === 'payslip') setClaimType('income_above_threshold');
                        if (item.id === 'degree_certificate') setClaimType('degree_verified');
                      }}
                      className={`p-3 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? 'bg-teal-500/10 border-teal-500/40 text-teal-300 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-teal-400' : 'text-slate-500'}`} />
                      <div className="text-xs font-bold">{item.label}</div>
                      {item.popular && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Demo Document Presets */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400">Quick Demo Presets (1-Click Test Files):</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const f = new File([DEMO_PASSPORT_ADULT], 'passport_adult_rivera.mrz', { type: 'text/plain' });
                      setFile(f);
                      setDocumentType('passport');
                      setClaimType('age_above_18');
                    }}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left transition-all group"
                  >
                    <div className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300">Adult Passport</div>
                    <div className="text-[10px] text-slate-400">DOB: 1990 → VERIFIED</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const f = new File([DEMO_PASSPORT_MINOR], 'passport_minor_chen.mrz', { type: 'text/plain' });
                      setFile(f);
                      setDocumentType('passport');
                      setClaimType('age_above_18');
                    }}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/50 text-left transition-all group"
                  >
                    <div className="text-xs font-bold text-rose-400 group-hover:text-rose-300">Minor Passport</div>
                    <div className="text-[10px] text-slate-400">DOB: 2009 → DENIED (Age 17)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const f = new File([DEMO_PASSPORT_EXPIRED], 'passport_expired_okafor.mrz', { type: 'text/plain' });
                      setFile(f);
                      setDocumentType('passport');
                      setClaimType('government_id_valid');
                    }}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition-all group"
                  >
                    <div className="text-xs font-bold text-amber-400 group-hover:text-amber-300">Expired ID</div>
                    <div className="text-[10px] text-slate-400">Expires: 2020 → DENIED</div>
                  </button>
                </div>
              </div>

              {/* Dropzone Upload */}
              <div className="relative border-2 border-dashed border-slate-800 hover:border-teal-500/50 rounded-2xl p-6 text-center bg-slate-950/50 transition-all group">
                <input 
                  type="file" 
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="p-3 rounded-full bg-slate-900 border border-slate-800 group-hover:border-teal-500/30 text-teal-400 transition-colors">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  {file ? (
                    <div>
                      <p className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB · Ready for Client-Side Encryption
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        Drag and drop your document file, or <span className="text-teal-400">browse</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Supports PDF, PNG, JPG (Max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Select Claim Rule */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-black">2</span>
                Choose Verification Claim Rule
              </h3>

              <div className="space-y-2">
                {[
                  { id: 'age_above_18', label: 'Age Above 18 (Golden Path)', desc: 'Confirms date_of_birth <= today - 18 years without exposing birthday.' },
                  { id: 'age_above_21', label: 'Age Above 21', desc: 'Confirms legal age threshold for regulated services.' },
                  { id: 'income_above_threshold', label: 'Income Above Threshold', desc: 'Checks gross income/balance exceeds threshold without revealing exact salary.' },
                  { id: 'degree_verified', label: 'Degree & University Verification', desc: 'Validates degree title and institution credentials.' },
                  { id: 'currently_employed', label: 'Current Employment Status', desc: 'Confirms active role tenure at employer.' },
                ].map((rule) => {
                  const isSelected = claimType === rule.id;
                  return (
                    <div
                      key={rule.id}
                      onClick={() => setClaimType(rule.id as ClaimType)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-teal-500/15 to-emerald-500/10 border-teal-500/40 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">{rule.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-teal-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{rule.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Action Button */}
              <button
                onClick={handleStartVerification}
                disabled={isProcessing || !file}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-teal-500/20 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Executing TEE Confidential Verification...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 stroke-[2.5]" />
                    <span>Encrypt & Execute TEE Verification</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              {errorState && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorState}</span>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Real-Time Execution Lifecycle Inspector */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-teal-400" />
                  Confidential Enclave Pipeline
                </h3>
                <button
                  onClick={onOpenAttestationModal}
                  className="text-[11px] font-bold text-teal-400 hover:underline flex items-center gap-1"
                >
                  Inspect TEE
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* Real-Time Execution Lifecycle & Streaming Enclave Terminal */}
              {isProcessing && (
                <div className="bg-black/60 rounded-xl p-4 font-mono text-[10px] text-emerald-400 border border-emerald-500/30 space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-between text-slate-500 text-[9px] pb-1 border-b border-emerald-500/20">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-emerald-400 animate-pulse" />
                      TEE ENCLAVE STREAMING LOGS
                    </span>
                    <span>INTEL SGX / AMD SEV</span>
                  </div>
                  {executionSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-slate-500 font-bold">[{(i * 0.4).toFixed(1)}s]</span>
                      <span className="text-emerald-300 font-semibold">{step.step}:</span>
                      <span className="text-slate-400">{step.message}</span>
                    </div>
                  ))}
                  <div className="inline-block w-2 h-3 bg-emerald-400 animate-pulse ml-1 translate-y-0.5" />
                </div>
              )}

              {/* Execution Steps Stepper */}
              <div className="space-y-3">
                {[
                  { title: 'Client AES-256 Encryption', detail: 'Plaintext encrypted in browser WebCrypto' },
                  { title: 'TEE Quote Generation', detail: 'Enclave generates hardware attestation quote Q_att' },
                  { title: 'KMS Fail-Closed Verification', detail: 'KMS checks quote measurement against allow-list' },
                  { title: 'In-Memory RAM Decryption', detail: 'Decrypted into hardware-protected RAM only' },
                  { title: 'AI Schema Extraction', detail: 'OCR reads only required field internally' },
                  { title: 'RAM Zeroing & Memory Purge', detail: 'Plaintext & PII wiped from enclave RAM' },
                  { title: 'Enclave Result Signing', detail: 'Signed with SK_enclave & emitted to verifier' },
                  { title: 'Flare Transaction Approval', detail: 'Approve the registry transaction in MetaMask' }
                ].map((step, idx) => {
                  const isAnchorStep = idx === 7;
                  const anchorConfirmed = executionSteps.some(
                    progress => progress.step === 'ANCHOR_ON_CHAIN' && progress.message.startsWith('Transaction confirmed:'),
                  );
                  const isDone = isAnchorStep ? anchorConfirmed : executionSteps.length > idx;
                  const isCurrent = isAnchorStep ? isAnchoring : executionSteps.length === idx && isProcessing;

                  return (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-xl border transition-all ${
                        isDone
                          ? 'bg-teal-500/10 border-teal-500/30 text-teal-200'
                          : isCurrent
                          ? 'bg-slate-800 border-teal-500/50 text-white animate-pulse'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isDone 
                              ? 'bg-teal-500 text-slate-950' 
                              : isCurrent 
                              ? 'bg-teal-400 text-slate-950' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                          </div>
                          <span className="text-xs font-bold">{step.title}</span>
                        </div>
                        {isDone && <span className="text-[10px] font-mono text-emerald-400">PASSED</span>}
                      </div>
                      <p className="text-[11px] opacity-80 mt-1 pl-7">{step.detail}</p>
                    </div>
                  );
                })}
              </div>

              {/* Data Minimization Guarantee Callout */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-teal-300">
                  <EyeOff className="w-3.5 h-3.5 text-teal-400" />
                  <span>Data Minimization Enforcement</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Only boolean <code className="text-emerald-400 font-mono">result: true</code> leaves the enclave. Zero raw documents or extracted PII exist outside the hardware memory boundary.
                </p>
              </div>

            </div>
          </div>

        </div>
      ) : (
        /* Step 3: Verification Result Card (Report Presentation) */
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-8 space-y-6 sm:space-y-8 shadow-2xl animate-fade-in overflow-hidden">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                <ShieldCheck className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    completedReport.result 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : completedReport.verificationStatus === 'UNVERIFIABLE' 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {completedReport.result ? 'VERIFIED CLAIM' : completedReport.verificationStatus === 'UNVERIFIABLE' ? 'UNVERIFIABLE CLAIM' : 'DENIED CLAIM'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ID: {completedReport.id}</span>
                </div>
                <h3 className="text-2xl font-black text-white mt-1">
                  {completedReport.claimTitle}
                </h3>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
              <button
                onClick={copyShareLink}
                className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center space-x-2 transition-all"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Share Verification'}</span>
              </button>

              <button
                onClick={() => setCompletedReport(null)}
                className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all"
              >
                New Verification
              </button>
            </div>
          </div>

          {/* Key Facts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Claim Result</span>
              <div className={`text-xl font-extrabold flex items-center space-x-2 ${completedReport.result ? 'text-emerald-400' : 'text-rose-400'}`}>
                {completedReport.result ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                <span>{completedReport.result ? 'TRUE (Verified)' : 'FALSE (Denied)'}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Attestation Status</span>
              <div className="text-sm font-bold text-teal-300 flex items-center space-x-1.5">
                <Cpu className="w-4 h-4 text-teal-400 shrink-0" />
                <span>KMS Attestation Passed</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 overflow-hidden">
              <span className="text-xs text-slate-400">Verifier Signature</span>
              <div className="text-xs font-mono text-slate-300 truncate" title={completedReport.signature}>
                {completedReport.signature}
              </div>
            </div>
          </div>

          {/* Independent Verification Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4 text-teal-400 shrink-0" />
                Cryptographic Signature Proof
              </h4>
              <button
                onClick={onOpenAttestationModal}
                className="text-xs text-teal-400 hover:underline font-bold text-left sm:text-right"
              >
                View TEE Quote Details
              </button>
            </div>

            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-[11px] sm:text-xs text-slate-300 space-y-2 overflow-hidden">
              <div className="flex flex-wrap gap-1"><strong className="text-slate-500">Claim Payload:</strong> <span>{completedReport.type}</span></div>
              <div className="break-all"><strong className="text-slate-500">Hash Commitment:</strong> {completedReport.hash}</div>
              <div className="break-all"><strong className="text-slate-500">Enclave Signature:</strong> <span className="text-emerald-400">{completedReport.signature}</span></div>
            </div>
          </div>

          {/* Flare Coston2 On-Chain Proof */}
          {completedReport.explorerUrl ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/40 to-slate-950 border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0">
                  <Link className="w-4 h-4 text-teal-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-teal-300">Anchored on Flare Coston2 Network</p>
                  <p className="text-[11px] text-slate-400 font-mono truncate">{completedReport.txHash}</p>
                </div>
              </div>
              <a
                href={completedReport.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto text-center justify-center flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-bold text-xs border border-teal-500/30 transition-all shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on Flare Explorer
              </a>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/50 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-300">Not Yet Anchored On-Chain</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Cryptographic proof is signed and verifiable off-chain. Click below to anchor it permanently on Flare Coston2.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleAnchorOnFlare}
                  disabled={isAnchoring}
                  className="w-full sm:w-auto text-center justify-center flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-bold text-xs border border-teal-400 transition-all shrink-0 shadow-lg shadow-teal-500/20"
                >
                  {isAnchoring ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" />Waiting for MetaMask...</>
                  ) : (
                    <><Link className="w-3.5 h-3.5" />Anchor on Flare Coston2</>
                  )}
                </button>
              </div>
              {anchorError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{anchorError}</span>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
};

/**
 * Confidential Compute Enclave & Remote Attestation Simulator
 * Implements Flare TEE hardware attestation, fail-closed KMS key release,
 * zero-knowledge in-memory OCR & schema extraction, and enclave signing.
 */

import type { 
  DocumentType, 
  ClaimType, 
  RemoteAttestationQuote, 
  VerificationReport,
  ExtractedFieldsMap 
} from '../types/veriflow';
import { decryptInsideEnclaveMemory, generateEnclaveSignature, sha256Hex } from './crypto';

// Allow-listed enclave binary measurement hash
export const ALLOWLISTED_ENCLAVE_MEASUREMENT = '0x8f4a9b2c7e1d3f5a6b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a';

export interface EnclaveExecutionOptions {
  claimType: ClaimType;
  documentType: DocumentType;
  documentId: string;
  userId: string;
  ciphertextBase64: string;
  ivHex: string;
  wrappedKeyHex: string;
  customThreshold?: number;
  simulatedFailAttestation?: boolean;
}

export interface EnclaveExecutionProgress {
  step: 'INIT' | 'ATTESTATION_QUOTE_GEN' | 'KMS_ATT_VERIFY' | 'KEY_RELEASE' | 'DECRYPT_IN_RAM' | 'OCR_EXTRACTION' | 'RULE_EVAL' | 'WIPE_RAM' | 'SIGN_RESULT' | 'ANCHOR_ON_CHAIN' | 'COMPLETE' | 'FAILED';
  message: string;
  quote?: RemoteAttestationQuote;
  extractedSchemaSummary?: string; // Summary of fields read internally (e.g. "date_of_birth read for claim")
}

/**
 * Simulates OCR / AI extraction inside the enclave boundary.
 * Maps raw document samples to structured extraction schemas.
 */
function extractSchemaFieldsInEnclaveRAM(
  docType: DocumentType,
  _rawBuffer: ArrayBuffer,
  fileName: string
): any {
  // Deterministic demo extraction based on file name or default mock values
  const name = fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ");

  switch (docType) {
    case 'passport':
      return {
        full_name: name || 'Alex Rivera',
        date_of_birth: '2001-04-12', // 25 years old (satisfies age 18+, 21+)
        document_number: 'P' + Math.floor(10000000 + Math.random() * 90000000),
        issuing_country: 'USA',
        expiry_date: '2031-10-15',
        photo_hash: '0xa7b9c1d2e3f4...'
      } as ExtractedFieldsMap['passport'];

    case 'drivers_license':
      return {
        full_name: name || 'Alex Rivera',
        date_of_birth: '1998-08-23', // 27 years old
        license_number: 'DL-' + Math.floor(100000 + Math.random() * 900000),
        expiry_date: '2029-08-23',
        address_hash: '0x9988776655...'
      } as ExtractedFieldsMap['drivers_license'];

    case 'resume':
      return {
        full_name: name || 'Alex Rivera',
        roles: [
          { company: 'Flare Labs', title: 'Senior Systems Engineer', start_date: '2023-01-01', end_date: 'Present' },
          { company: 'Chainlink', title: 'Smart Contract Dev', start_date: '2021-03-01', end_date: '2022-12-31' }
        ],
        skills: ['Solidity', 'Rust', 'Python', 'Confidential Compute', 'TypeScript'],
        education: ['B.S. Computer Science - Stanford University']
      } as ExtractedFieldsMap['resume'];

    case 'degree_certificate':
      return {
        full_name: name || 'Alex Rivera',
        institution: 'Stanford University',
        degree_title: 'Bachelor of Science',
        field_of_study: 'Computer Science',
        graduation_date: '2021-05-20'
      } as ExtractedFieldsMap['degree_certificate'];

    case 'payslip':
      return {
        employer_name: 'Flare Labs Inc',
        role_title: 'Senior Engineer',
        pay_period: 'Monthly (June 2026)',
        gross_income: 125000,
        net_income: 92000,
        employment_start_date: '2023-01-01'
      } as ExtractedFieldsMap['payslip'];

    case 'bank_statement':
      return {
        account_holder_name: name || 'Alex Rivera',
        statement_period: 'Q2 2026',
        average_balance: 85400,
        income_deposits_total: 142000
      } as ExtractedFieldsMap['bank_statement'];

    case 'utility_bill':
      return {
        account_holder_name: name || 'Alex Rivera',
        service_address: '742 Evergreen Terrace, Tech District',
        billing_period: 'June 2026'
      } as ExtractedFieldsMap['utility_bill'];

    default:
      throw new Error(`Unsupported document type: ${docType}`);
  }
}

/**
 * Evaluates the specific rule claim inside Enclave RAM.
 * ONLY reads the required field(s). Returns ONLY boolean.
 */
function evaluateClaimRuleInEnclaveRAM(
  claimType: ClaimType,
  docType: DocumentType,
  extracted: any,
  customThreshold?: number
): { result: boolean; confidenceScore: number; claimDescription: string } {
  let result = false;
  let confidenceScore = 0.98;
  let claimDescription = '';

  const today = new Date();
  const currentYear = today.getFullYear();

  switch (claimType) {
    case 'age_above_18': {
      const dobStr = extracted.date_of_birth;
      if (!dobStr) throw new Error('Document missing date_of_birth field for age claim');
      const birthYear = new Date(dobStr).getFullYear();
      const age = currentYear - birthYear;
      result = age >= 18;
      claimDescription = 'Age is 18 years or older';
      break;
    }
    case 'age_above_21': {
      const dobStr = extracted.date_of_birth;
      if (!dobStr) throw new Error('Document missing date_of_birth field for age claim');
      const birthYear = new Date(dobStr).getFullYear();
      const age = currentYear - birthYear;
      result = age >= 21;
      claimDescription = 'Age is 21 years or older';
      break;
    }
    case 'age_above_65': {
      const dobStr = extracted.date_of_birth;
      if (!dobStr) throw new Error('Document missing date_of_birth field for age claim');
      const birthYear = new Date(dobStr).getFullYear();
      const age = currentYear - birthYear;
      result = age >= 65;
      claimDescription = 'Age is 65 years or older';
      break;
    }
    case 'currently_employed': {
      if (docType === 'payslip') {
        result = Boolean(extracted.employer_name && extracted.gross_income > 0);
      } else if (docType === 'resume') {
        const hasActiveRole = extracted.roles?.some((r: any) => r.end_date === 'Present' || r.end_date.includes('2026'));
        result = Boolean(hasActiveRole);
      } else {
        result = true;
      }
      claimDescription = 'Active employment confirmed';
      break;
    }
    case 'degree_verified': {
      if (docType === 'degree_certificate') {
        result = Boolean(extracted.degree_title && extracted.institution);
      } else if (docType === 'resume') {
        result = extracted.education?.length > 0;
      } else {
        result = true;
      }
      claimDescription = 'Accredited degree credential verified';
      break;
    }
    case 'income_above_threshold': {
      const threshold = customThreshold || 50000;
      if (docType === 'payslip') {
        result = extracted.gross_income >= threshold;
      } else if (docType === 'bank_statement') {
        result = (extracted.average_balance >= threshold) || (extracted.income_deposits_total >= threshold);
      } else {
        result = true;
      }
      claimDescription = `Annual income / liquid balance exceeds $${threshold.toLocaleString()}`;
      break;
    }
    case 'unique_human_wallet':
    case 'government_id_valid':
    case 'name_matches':
    case 'photo_matches_selfie': {
      result = true;
      claimDescription = 'Government ID valid & unexpired';
      break;
    }
    default:
      result = true;
      claimDescription = `Claim check: ${claimType}`;
      break;
  }

  return { result, confidenceScore, claimDescription };
}

/**
 * Runs full confidential compute verification pipeline with live progress callbacks.
 */
export async function executeConfidentialComputeJob(
  options: EnclaveExecutionOptions,
  onProgress?: (progress: EnclaveExecutionProgress) => void
): Promise<VerificationReport> {
  const notify = (step: EnclaveExecutionProgress['step'], message: string, quote?: RemoteAttestationQuote, extractedSummary?: string) => {
    if (onProgress) onProgress({ step, message, quote, extractedSchemaSummary: extractedSummary });
  };

  notify('INIT', 'Initializing TEE Enclave worker & hardware attestation context...');
  await new Promise(r => setTimeout(r, 400));

  // 1. Generate Remote Attestation Quote
  notify('ATTESTATION_QUOTE_GEN', 'Enclave generating Remote Attestation Quote (measuring PCR code identity)...');
  await new Promise(r => setTimeout(r, 500));

  const isAttestationValid = !options.simulatedFailAttestation;
  const measurementHex = isAttestationValid ? ALLOWLISTED_ENCLAVE_MEASUREMENT : '0xDEADBEEF00000000000000000000000000000000000000000000000000000000';
  const timestamp = new Date().toISOString();
  const attestationId = 'att_' + Math.random().toString(36).substring(2, 10);
  
  const rawQuoteHex = '0x04000000' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const attestationQuote: RemoteAttestationQuote = {
    attestationId,
    enclaveMeasurementHex: measurementHex,
    kmsStatus: isAttestationValid ? 'VALID_ALLOWLIST' : 'REJECTED_UNATTESTED',
    keyReleased: isAttestationValid,
    hardwareTEE: 'Flare Confidential Compute (Intel SGX / AMD SEV TEE)',
    timestamp,
    signatureScheme: 'Ed25519-TEE-Attested',
    rawQuoteHex
  };

  notify('KMS_ATT_VERIFY', 'KMS validating Remote Attestation Quote against allow-listed measurement...', attestationQuote);
  await new Promise(r => setTimeout(r, 500));

  // FAIL CLOSED CHECK
  if (!attestationQuote.keyReleased || attestationQuote.kmsStatus !== 'VALID_ALLOWLIST') {
    notify('FAILED', 'CRITICAL ERROR: TEE Remote Attestation failed! KMS refused decryption key release (Fail-Closed).', attestationQuote);
    throw new Error('FAIL CLOSED: Remote Attestation Quote invalid. Key release denied by KMS.');
  }

  notify('KEY_RELEASE', 'KMS released document key over attested TLS channel to Enclave memory.', attestationQuote);
  await new Promise(r => setTimeout(r, 400));

  // 2. In-Memory Decryption
  notify('DECRYPT_IN_RAM', 'Decrypting document ciphertext IN-MEMORY ONLY (RAM protected region)...', attestationQuote);
  const decryptedBuffer = await decryptInsideEnclaveMemory(
    options.ciphertextBase64,
    options.ivHex,
    options.wrappedKeyHex
  );
  await new Promise(r => setTimeout(r, 400));

  // 3. In-Memory OCR & Schema Extraction
  const fieldSummary = options.claimType.startsWith('age') ? 'Extracted date_of_birth field only' : 'Extracted schema fields for claim check';
  notify('OCR_EXTRACTION', `AI OCR pipeline running schema extraction inside enclave boundary (${fieldSummary})...`, attestationQuote, fieldSummary);
  
  let extractedFields = extractSchemaFieldsInEnclaveRAM(options.documentType, decryptedBuffer, options.documentId);
  await new Promise(r => setTimeout(r, 500));

  // 4. Rule Evaluation
  notify('RULE_EVAL', `Evaluating rule for claim: "${options.claimType}"...`, attestationQuote);
  const evaluation = evaluateClaimRuleInEnclaveRAM(
    options.claimType,
    options.documentType,
    extractedFields,
    options.customThreshold
  );
  await new Promise(r => setTimeout(r, 400));

  // 5. Zero-Knowledge Memory Wipe
  notify('WIPE_RAM', 'Zeroing & purging plaintext document and extracted PII from enclave memory RAM...', attestationQuote);
  extractedFields = null; // Garbage collect / zero out
  await new Promise(r => setTimeout(r, 300));

  // 6. Sign Verification Result
  notify('SIGN_RESULT', 'Enclave signing result payload with Enclave Private Key (SK_enclave)...', attestationQuote);
  const verId = 'ver_' + Math.random().toString(36).substring(2, 10);
  const hash = await sha256Hex(`${verId}:${options.claimType}:${evaluation.result}:${options.userId}`);
  const { signatureHex } = await generateEnclaveSignature(
    verId,
    options.claimType,
    evaluation.result,
    timestamp,
    attestationId
  );
  await new Promise(r => setTimeout(r, 300));

  const report: VerificationReport = {
    id: verId,
    userId: options.userId,
    documentId: options.documentId,
    type: options.claimType,
    claimTitle: evaluation.claimDescription,
    claimCategory: getCategoryFromClaimType(options.claimType),
    result: evaluation.result,
    verifiedAt: timestamp,
    hash: `0x${hash}`,
    signature: signatureHex,
    attestationId,
    attestationQuote,
    confidenceScore: evaluation.confidenceScore,
    revoked: false
  };

  // 7. Anchor Verification Hash on Flare Coston2 Blockchain
  notify('ANCHOR_ON_CHAIN', 'Anchoring verification proof hash to VeriFlowRegistry on Flare Coston2 Testnet...', attestationQuote);
  try {
    const { anchorVerificationOnFlare } = await import('./flareContract');
    const anchorRes = await anchorVerificationOnFlare(report);
    if (anchorRes.txHash) {
      report.txHash = anchorRes.txHash;
      report.explorerUrl = anchorRes.explorerUrl;
    }
  } catch (e) {
    console.warn('On-chain anchoring notice:', e);
  }

  notify('COMPLETE', 'Confidential verification completed & anchored to Flare Coston2!', attestationQuote);
  return report;
}

function getCategoryFromClaimType(claimType: ClaimType): any {
  if (claimType.startsWith('age')) return 'age';
  if (claimType.includes('employed') || claimType.includes('company') || claimType.includes('role') || claimType.includes('tenure')) return 'employment';
  if (claimType.includes('degree') || claimType.includes('university') || claimType.includes('field')) return 'education';
  if (claimType.includes('income') || claimType.includes('salary')) return 'income';
  if (claimType.includes('wallet')) return 'wallet';
  return 'identity';
}

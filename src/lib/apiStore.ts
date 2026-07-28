/**
 * Central State & API Storage Store for VeriFlow AI
 * Persists documents, verifications, organizations, and API logs.
 */

import type { 
  EncryptedDocumentMetadata, 
  VerificationReport, 
  Organization, 
  ApiLog, 
  UserSession,
  ClaimType 
} from '../types/veriflow';
import { executeConfidentialComputeJob } from './enclaveSimulator';

const STORAGE_KEYS = {
  USER: 'veriflow_user_session',
  DOCUMENTS: 'veriflow_documents',
  VERIFICATIONS: 'veriflow_verifications',
  ORGS: 'veriflow_organizations',
  LOGS: 'veriflow_api_logs'
};

// Default initial session (Disconnected state so Connect Wallet button displays prominently)
const DEFAULT_USER: UserSession = {
  address: '',
  isConnected: false,
  chainId: 114, // Flare Coston2 / Testnet
  trustScore: 85,
  documentsCount: 0,
  verificationsCount: 0
};

const DEFAULT_DOCUMENTS: EncryptedDocumentMetadata[] = [
  {
    id: 'doc_pas_9f2c1a',
    userId: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    type: 'passport',
    fileName: 'Alex_Rivera_Passport.pdf',
    fileSize: 2450120,
    mimeType: 'application/pdf',
    encryptedPath: 'r2://veriflow-blobs/enc_doc_pas_9f2c1a.bin',
    ivHex: '4a9b2c7e1d3f5a6b0c9d8e7f',
    dataKeyWrappedHex: '8f4a9b2c7e1d3f5a6b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a',
    status: 'attested_processed',
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
  },
  {
    id: 'doc_deg_4b8e2d',
    userId: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    type: 'degree_certificate',
    fileName: 'Stanford_BS_Diploma.png',
    fileSize: 1845000,
    mimeType: 'image/png',
    encryptedPath: 'r2://veriflow-blobs/enc_doc_deg_4b8e2d.bin',
    ivHex: '1d3f5a6b0c9d8e7f4a9b2c7e',
    dataKeyWrappedHex: '7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a8f4a9b2c7e1d3f5a6b0c9d8e',
    status: 'attested_processed',
    createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString()
  },
  {
    id: 'doc_pay_6c1f9e',
    userId: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    type: 'payslip',
    fileName: 'FlareLabs_Payslip_June2026.pdf',
    fileSize: 890400,
    mimeType: 'application/pdf',
    encryptedPath: 'r2://veriflow-blobs/enc_doc_pay_6c1f9e.bin',
    ivHex: '0c9d8e7f4a9b2c7e1d3f5a6b',
    dataKeyWrappedHex: '3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a8f4a9b2c7e1d3f5a6b0c9d8e7f6a5b4c',
    status: 'attested_processed',
    createdAt: new Date(Date.now() - 3600000 * 24 * 12).toISOString()
  }
];

const DEFAULT_VERIFICATIONS: VerificationReport[] = [
  {
    id: 'ver_7ab1c9e4',
    userId: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    documentId: 'doc_pas_9f2c1a',
    type: 'age_above_18',
    claimTitle: 'Age is 18 years or older',
    claimCategory: 'age',
    result: true,
    verifiedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    hash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    signature: '0x4e9a2b7c1d0f8e9a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a',
    attestationId: 'att_22f09a1',
    attestationQuote: {
      attestationId: 'att_22f09a1',
      enclaveMeasurementHex: '0x8f4a9b2c7e1d3f5a6b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a',
      kmsStatus: 'VALID_ALLOWLIST',
      keyReleased: true,
      hardwareTEE: 'Flare Confidential Compute (Intel SGX / AMD SEV TEE)',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      signatureScheme: 'Ed25519-TEE-Attested',
      rawQuoteHex: '0x04000000a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8'
    },
    confidenceScore: 0.99,
    revoked: false,
    requesterOrg: 'Uber ID Check',
    txHash: '0x3a9f1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
    explorerUrl: 'https://coston2-explorer.flare.network/tx/0x3a9f1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2'
  },
  {
    id: 'ver_3f8e9a2d',
    userId: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    documentId: 'doc_deg_4b8e2d',
    type: 'degree_verified',
    claimTitle: 'Accredited degree credential verified',
    claimCategory: 'education',
    result: true,
    verifiedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    hash: '0x3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c',
    signature: '0x8f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a',
    attestationId: 'att_88c4b12',
    attestationQuote: {
      attestationId: 'att_88c4b12',
      enclaveMeasurementHex: '0x8f4a9b2c7e1d3f5a6b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a',
      kmsStatus: 'VALID_ALLOWLIST',
      keyReleased: true,
      hardwareTEE: 'Flare Confidential Compute (Intel SGX / AMD SEV TEE)',
      timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
      signatureScheme: 'Ed25519-TEE-Attested',
      rawQuoteHex: '0x04000000e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8a1b2c3d4'
    },
    confidenceScore: 0.98,
    revoked: false,
    requesterOrg: 'DeFi HR DAO'
  },
  {
    id: 'ver_9c4d1b8f',
    userId: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    documentId: 'doc_pay_6c1f9e',
    type: 'income_above_threshold',
    claimTitle: 'Annual income / liquid balance exceeds $100,000',
    claimCategory: 'income',
    result: true,
    verifiedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    hash: '0x5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e',
    signature: '0x7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a8f4a9b2c7e1d3f5a6b0c9d8e',
    attestationId: 'att_55a1d99',
    attestationQuote: {
      attestationId: 'att_55a1d99',
      enclaveMeasurementHex: '0x8f4a9b2c7e1d3f5a6b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a',
      kmsStatus: 'VALID_ALLOWLIST',
      keyReleased: true,
      hardwareTEE: 'Flare Confidential Compute (Intel SGX / AMD SEV TEE)',
      timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
      signatureScheme: 'Ed25519-TEE-Attested',
      rawQuoteHex: '0x04000000c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8a1b2c3d4e5f6a7b8'
    },
    confidenceScore: 0.97,
    revoked: false,
    requesterOrg: 'Aave Prime Risk'
  }
];

const DEFAULT_ORGS: Organization[] = [
  {
    id: 'org_acme_corp',
    name: 'Acme Financial Inc',
    apiKey: 'vf_live_9a8b7c6d5e4f3a2b1c0d9e8f',
    webhookUrl: 'https://api.acme.com/v1/veriflow-webhook',
    requestsCount: 142,
    createdAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'org_nexus_dao',
    name: 'Nexus DAO Onboarding',
    apiKey: 'vf_live_1a2b3c4d5e6f7a8b9c0d1e2f',
    webhookUrl: 'https://nexus.dao/webhooks/kyc',
    requestsCount: 89,
    createdAt: '2026-06-15T14:30:00Z'
  }
];

const DEFAULT_LOGS: ApiLog[] = [
  {
    id: 'log_1',
    organizationId: 'org_acme_corp',
    organizationName: 'Acme Financial Inc',
    verificationId: 'ver_7ab1c9e4',
    endpoint: '/v1/verify-age',
    statusCode: 200,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'log_2',
    organizationId: 'org_nexus_dao',
    organizationName: 'Nexus DAO Onboarding',
    verificationId: 'ver_3f8e9a2d',
    endpoint: '/v1/verify-degree',
    statusCode: 200,
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString()
  }
];

// Memory/Storage Helper
function getStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage set error:', e);
  }
}

export class VeriFlowStore {
  static getUserSession(): UserSession {
    return getStored(STORAGE_KEYS.USER, DEFAULT_USER);
  }

  static setUserSession(session: UserSession): void {
    setStored(STORAGE_KEYS.USER, session);
  }

  static getDocuments(): EncryptedDocumentMetadata[] {
    return getStored(STORAGE_KEYS.DOCUMENTS, DEFAULT_DOCUMENTS);
  }

  static addDocument(doc: EncryptedDocumentMetadata): void {
    const docs = this.getDocuments();
    const updated = [doc, ...docs];
    setStored(STORAGE_KEYS.DOCUMENTS, updated);
    
    // Update user stats
    const user = this.getUserSession();
    user.documentsCount = updated.length;
    this.setUserSession(user);
  }

  static deleteDocument(id: string): void {
    const docs = this.getDocuments().filter(d => d.id !== id);
    setStored(STORAGE_KEYS.DOCUMENTS, docs);
  }

  static getVerifications(): VerificationReport[] {
    return getStored(STORAGE_KEYS.VERIFICATIONS, DEFAULT_VERIFICATIONS);
  }

  static addVerification(report: VerificationReport): void {
    const verifications = this.getVerifications();
    const updated = [report, ...verifications];
    setStored(STORAGE_KEYS.VERIFICATIONS, updated);

    // Update user stats & trust score
    const user = this.getUserSession();
    user.verificationsCount = updated.length;
    user.trustScore = Math.min(100, 80 + updated.length * 4);
    this.setUserSession(user);
  }

  static revokeVerification(id: string): void {
    const verifications = this.getVerifications().map(v => {
      if (v.id === id) {
        return { ...v, revoked: true, revokedAt: new Date().toISOString() };
      }
      return v;
    });
    setStored(STORAGE_KEYS.VERIFICATIONS, verifications);
  }

  static getOrganizations(): Organization[] {
    return getStored(STORAGE_KEYS.ORGS, DEFAULT_ORGS);
  }

  static createOrganization(name: string, webhookUrl?: string): Organization {
    const orgs = this.getOrganizations();
    const newOrg: Organization = {
      id: 'org_' + Math.random().toString(36).substring(2, 10),
      name,
      apiKey: 'vf_live_' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0')).join(''),
      webhookUrl,
      requestsCount: 0,
      createdAt: new Date().toISOString()
    };
    setStored(STORAGE_KEYS.ORGS, [newOrg, ...orgs]);
    return newOrg;
  }

  static getApiLogs(): ApiLog[] {
    return getStored(STORAGE_KEYS.LOGS, DEFAULT_LOGS);
  }

  static logApiCall(orgId: string, orgName: string, verificationId: string, endpoint: string, statusCode: number = 200): void {
    const logs = this.getApiLogs();
    const newLog: ApiLog = {
      id: 'log_' + Math.random().toString(36).substring(2, 8),
      organizationId: orgId,
      organizationName: orgName,
      verificationId,
      endpoint,
      statusCode,
      createdAt: new Date().toISOString()
    };
    setStored(STORAGE_KEYS.LOGS, [newLog, ...logs]);

    // Increment org requests
    const orgs = this.getOrganizations().map(o => {
      if (o.id === orgId) return { ...o, requestsCount: o.requestsCount + 1 };
      return o;
    });
    setStored(STORAGE_KEYS.ORGS, orgs);
  }

  /**
   * Developer API Verification Simulator Endpoint Execution
   * Validates API Key, fetches document, dispatches enclave job, logs request.
   */
  static async processDeveloperApiRequest(params: {
    apiKey: string;
    endpoint: string;
    claimType: ClaimType;
    walletAddress: string;
    documentId?: string;
    threshold?: number;
  }): Promise<{ status: number; data: any }> {
    const orgs = this.getOrganizations();
    const org = orgs.find(o => o.apiKey === params.apiKey) || orgs[0];

    const docs = this.getDocuments();
    let doc = docs.find(d => d.id === params.documentId);
    if (!doc) {
      doc = docs[0]; // Fallback to primary demo document
    }

    // Generate a valid AES-256-GCM encrypted payload for the mock demo API request
    const mockFileBuffer = new TextEncoder().encode('%PDF-1.4 Mock VeriFlow AI Document Content');
    const rawKeyBuffer = new Uint8Array(32);
    crypto.getRandomValues(rawKeyBuffer);
    const wrappedKeyHex = Array.from(rawKeyBuffer).map(b => b.toString(16).padStart(2, '0')).join('');

    const ivBytes = new Uint8Array(12);
    crypto.getRandomValues(ivBytes);
    const ivHex = Array.from(ivBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    const aesKey = await crypto.subtle.importKey(
      'raw',
      rawKeyBuffer.buffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    const encryptedBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: ivBytes },
      aesKey,
      mockFileBuffer
    );
    const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuf)));

    // Execute TEE Enclave verification
    const report = await executeConfidentialComputeJob({
      claimType: params.claimType,
      documentType: doc ? doc.type : 'passport',
      documentId: doc ? doc.id : 'doc_demo_api',
      userId: params.walletAddress || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      ciphertextBase64,
      ivHex,
      wrappedKeyHex,
      customThreshold: params.threshold
    });

    // Save report & log API request
    report.requesterOrg = org.name;
    this.addVerification(report);
    this.logApiCall(org.id, org.name, report.id, params.endpoint, 200);

    return {
      status: 200,
      data: {
        verification_id: report.id,
        claim: report.type,
        result: report.result,
        timestamp: report.verifiedAt,
        signature: report.signature,
        attestation_id: report.attestationId,
        attestation_quote: {
          enclave_measurement: report.attestationQuote.enclaveMeasurementHex,
          kms_status: report.attestationQuote.kmsStatus,
          hardware_tee: report.attestationQuote.hardwareTEE
        }
      }
    };
  }
}

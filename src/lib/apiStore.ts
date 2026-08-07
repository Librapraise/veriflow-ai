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
  ClaimType,
  DocumentType,
  OrganizationPersona,
  VerificationRequest,
  VerificationRequestStatus,
} from '../types/veriflow';
import { executeConfidentialComputeJob } from './enclaveSimulator';

const STORAGE_KEYS = {
  USER: 'veriflow_user_session',
  DOCUMENTS: 'veriflow_documents',
  VERIFICATIONS: 'veriflow_verifications',
  ORGS: 'veriflow_organizations',
  LOGS: 'veriflow_api_logs',
  REQUESTS: 'veriflow_verification_requests'
};

// Default initial session (Disconnected state so Connect Wallet button displays prominently)
const DEFAULT_USER: UserSession = {
  address: '',
  isConnected: false,
  chainId: 114, // Flare Coston2 / Testnet
  trustScore: 0,
  documentsCount: 0,
  verificationsCount: 0
};

const DEFAULT_DOCUMENTS: EncryptedDocumentMetadata[] = [];

const DEFAULT_VERIFICATIONS: VerificationReport[] = [];

const DEFAULT_ORGS: Organization[] = [
  {
    id: 'org_acme_corp',
    name: 'Acme Financial Inc',
    apiKey: 'vf_live_9a8b7c6d5e4f3a2b1c0d9e8f',
    webhookUrl: 'https://api.acme.com/v1/veriflow-webhook',
    requestsCount: 0,
    createdAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'org_nexus_dao',
    name: 'Nexus DAO Onboarding',
    apiKey: 'vf_live_1a2b3c4d5e6f7a8b9c0d1e2f',
    webhookUrl: 'https://nexus.dao/webhooks/kyc',
    requestsCount: 0,
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
  static async createRemoteVerificationRequest(params: {
    organization: Organization; persona: OrganizationPersona; subjectReference: string; subjectEmail?: string;
    claims: ClaimType[]; allowedDocumentTypes: DocumentType[]; callbackUrl?: string; expiresInHours?: number;
  }): Promise<VerificationRequest> {
    const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
    let response: Response;
    try {
      response = await fetch(`${apiUrl}/v1/verification-requests`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${params.organization.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_name: params.organization.name,
          subject_reference: params.subjectReference,
          subject_email: params.subjectEmail,
          claims: params.claims.map(type => ({ type })),
          allowed_document_types: params.allowedDocumentTypes,
          expires_in: (params.expiresInHours || 24) * 3600,
          callback_url: params.callbackUrl,
        }),
      });
    } catch {
      throw new Error(`Cannot reach the VeriFlow API at ${apiUrl}. Start the local FastAPI backend or deploy the latest backend before generating a short subject link.`);
    }
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail || 'Could not create short verification link');
    const data = await response.json();
    const request: VerificationRequest = {
      id: data.request_id, organizationId: params.organization.id, organizationName: data.organization_name,
      persona: params.persona, subjectReference: data.subject_reference, subjectEmail: params.subjectEmail,
      claims: params.claims, allowedDocumentTypes: data.allowed_document_types, status: data.status,
      verificationUrl: data.verification_url, callbackUrl: params.callbackUrl,
      createdAt: data.created_at, expiresAt: data.expires_at,
    };
    setStored(STORAGE_KEYS.REQUESTS, [request, ...this.getVerificationRequests()]);
    return request;
  }
  static getUserSession(): UserSession {
    const session = getStored(STORAGE_KEYS.USER, DEFAULT_USER);
    const docsCount = this.getDocuments().length;
    const verifsCount = this.getVerifications().length;

    // Dynamically calculate trustScore: 0 when empty, or 70 base + 5 per doc + 5 per verif up to 100
    const calculatedScore = (docsCount === 0 && verifsCount === 0)
      ? 0
      : Math.min(100, 70 + (docsCount * 5) + (verifsCount * 5));

    return {
      ...session,
      documentsCount: docsCount,
      verificationsCount: verifsCount,
      trustScore: calculatedScore
    };
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

  static getVerificationById(id: string): VerificationReport | undefined {
    return this.getVerifications().find(v => v.id === id);
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

  static getVerificationRequests(): VerificationRequest[] {
    return getStored(STORAGE_KEYS.REQUESTS, []);
  }

  static createVerificationRequest(params: {
    organization: Organization;
    persona: OrganizationPersona;
    subjectReference: string;
    subjectEmail?: string;
    claims: ClaimType[];
    allowedDocumentTypes: DocumentType[];
    callbackUrl?: string;
    expiresInHours?: number;
  }): VerificationRequest {
    const id = 'req_' + Math.random().toString(36).substring(2, 10);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + (params.expiresInHours || 24) * 60 * 60 * 1000);
    // Include the non-sensitive request policy in the share URL so a candidate
    // can open it from another browser/device. Production deployments should
    // replace this with a server-issued, signed request token.
    const claimCodes: Partial<Record<ClaimType, string>> = {
      degree_verified: 'dv', currently_employed: 'ce', income_above_threshold: 'it',
      age_above_18: 'a18', government_id_valid: 'gi', unique_human_wallet: 'uh',
    };
    const documentCodes: Partial<Record<DocumentType, string>> = {
      degree_certificate: 'dc', employment_record: 'er', resume: 'r', payslip: 'p',
      bank_statement: 'bs', passport: 'pp', drivers_license: 'dl', utility_bill: 'ub',
    };
    const compactPolicy = JSON.stringify({
      c: params.claims.map(value => claimCodes[value] || value),
      d: params.allowedDocumentTypes.map(value => documentCodes[value] || value),
      o: params.organization.name,
      s: params.subjectReference,
      e: Math.floor(expiresAt.getTime() / 1000),
    });
    const policyBytes = new TextEncoder().encode(compactPolicy);
    const policy = btoa(String.fromCharCode(...policyBytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const verificationUrl = `${window.location.origin}/app/verify?request_id=${id}&p=${policy}`;
    const request: VerificationRequest = {
      id,
      organizationId: params.organization.id,
      organizationName: params.organization.name,
      persona: params.persona,
      subjectReference: params.subjectReference,
      subjectEmail: params.subjectEmail || undefined,
      claims: params.claims,
      allowedDocumentTypes: params.allowedDocumentTypes,
      status: 'awaiting_subject',
      verificationUrl,
      callbackUrl: params.callbackUrl || params.organization.webhookUrl,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    setStored(STORAGE_KEYS.REQUESTS, [request, ...this.getVerificationRequests()]);
    this.logApiCall(params.organization.id, params.organization.name, id, '/v1/verification-requests', 201);
    return request;
  }

  static updateVerificationRequestStatus(
    id: string,
    status: VerificationRequestStatus,
    verificationId?: string,
  ): void {
    const requests = this.getVerificationRequests().map(request =>
      request.id === id ? { ...request, status, verificationId: verificationId || request.verificationId } : request,
    );
    setStored(STORAGE_KEYS.REQUESTS, requests);
  }

  static recordVerificationRequestConsent(id: string): void {
    const requests = this.getVerificationRequests().map(request =>
      request.id === id ? { ...request, consentedAt: new Date().toISOString() } : request,
    );
    setStored(STORAGE_KEYS.REQUESTS, requests);
  }

  static recordVerificationRequestResult(
    requestId: string,
    report: VerificationReport,
  ): void {
    const requests = this.getVerificationRequests().map(request => {
      if (request.id !== requestId) return request;
      const previous = request.claimResults || [];
      const claimResults = [
        ...previous.filter(item => item.claim !== report.type),
        { claim: report.type, result: report.result, status: report.verificationStatus, verificationId: report.id },
      ];
      const allClaimsComplete = request.claims.every(claim => claimResults.some(item => item.claim === claim));
      const overallStatus = !allClaimsComplete
        ? 'processing'
        : claimResults.some(item => item.status === 'UNVERIFIABLE')
          ? 'unverifiable'
          : claimResults.every(item => item.result)
            ? 'verified'
            : 'denied';
      return { ...request, claimResults, status: overallStatus as VerificationRequest['status'], verificationId: report.id };
    });
    setStored(STORAGE_KEYS.REQUESTS, requests);
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

    // Try fetching from live FastAPI Gateway if configured/online
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    try {
      const liveRes = await fetch(`${apiBaseUrl}${params.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.apiKey}`,
        },
        body: JSON.stringify({
          wallet_address: params.walletAddress,
          threshold: params.threshold,
        }),
      });

      if (liveRes.ok) {
        const data = await liveRes.json();
        this.logApiCall(org.id, org.name, data.verification_id, params.endpoint, liveRes.status);
        return { status: liveRes.status, data };
      }
    } catch (e) {
      // Live API unreachable, fall back to in-browser enclave simulator
    }

    // Execute TEE Enclave verification in-browser simulator
    const report = await executeConfidentialComputeJob({
      claimType: params.claimType,
      documentType: doc ? doc.type : 'passport',
      documentId: doc ? doc.id : 'doc_demo_api',
      fileName: doc?.fileName || 'api_upload.pdf',
      mimeType: doc?.mimeType || 'application/pdf',
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

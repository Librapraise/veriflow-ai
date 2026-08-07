export type DocumentType = 
  | 'passport' 
  | 'drivers_license' 
  | 'resume' 
  | 'employment_record'
  | 'degree_certificate' 
  | 'payslip' 
  | 'bank_statement' 
  | 'utility_bill';

export type ClaimCategory = 'age' | 'employment' | 'education' | 'income' | 'identity' | 'wallet';

export type ClaimType = 
  | 'age_above_18' 
  | 'age_above_21' 
  | 'age_above_65'
  | 'currently_employed'
  | 'company_matches'
  | 'role_matches'
  | 'tenure_min_months'
  | 'degree_verified'
  | 'university_verified'
  | 'field_matches'
  | 'income_above_threshold'
  | 'employment_duration'
  | 'salary_band'
  | 'name_matches'
  | 'photo_matches_selfie'
  | 'government_id_valid'
  | 'unique_human_wallet';

export interface ExtractedFieldsMap {
  passport: {
    full_name: string;
    date_of_birth: string;
    document_number: string;
    issuing_country: string;
    expiry_date: string;
    photo_hash: string;
  };
  drivers_license: {
    full_name: string;
    date_of_birth: string;
    license_number: string;
    expiry_date: string;
    address_hash: string;
  };
  resume: {
    full_name: string;
    roles: Array<{ company: string; title: string; start_date: string; end_date: string }>;
    skills: string[];
    education: string[];
  };
  degree_certificate: {
    full_name: string;
    institution: string;
    degree_title: string;
    field_of_study: string;
    graduation_date: string;
  };
  payslip: {
    employer_name: string;
    role_title: string;
    pay_period: string;
    gross_income: number;
    net_income: number;
    employment_start_date: string;
  };
  bank_statement: {
    account_holder_name: string;
    statement_period: string;
    average_balance: number;
    income_deposits_total: number;
  };
  utility_bill: {
    account_holder_name: string;
    service_address: string;
    billing_period: string;
  };
}

export interface EncryptedDocumentMetadata {
  id: string;
  userId: string;
  type: DocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  encryptedPath: string; // Blob storage URL/identifier
  ivHex: string;         // AES-GCM Initialization Vector
  dataKeyWrappedHex: string; // Wrapped key for KMS
  status: 'encrypted_pending' | 'attested_processed' | 'revoked';
  createdAt: string;
}

/**
 * How the signing identity is hosted.
 *
 * Deliberately explicit: the cryptography is real secp256k1 ECDSA in BOTH modes.
 * The only difference is where the private key lives — and that is the entire
 * simulation boundary of this project.
 */
export type TeeHostingMode =
  /** Key held by the backend process. Real signing, no hardware isolation. */
  | 'Simulated TEE (server-held identity key)'
  /** Key held in-browser for offline demos. Real signing, NOT anchorable. */
  | 'Local TEE Simulator (ephemeral browser key)'
  /** Target production posture: key sealed to an attested confidential VM. */
  | 'Flare Confidential Compute (AMD SEV / Intel TDX via Confidential Space)';

export interface RemoteAttestationQuote {
  attestationId: string;
  /**
   * Approved code version — the container image digest, matching Flare FCC's
   * model. NOT an Intel SGX enclave measurement.
   */
  enclaveMeasurementHex: string;
  /** Whether the code version is allow-listed on-chain. */
  kmsStatus: 'VALID_ALLOWLIST' | 'REJECTED_UNATTESTED';
  keyReleased: boolean;
  hardwareTEE: TeeHostingMode;
  timestamp: string;
  /** EIP-191 personal-sign envelope over a keccak256 digest. */
  signatureScheme: 'ECDSA-secp256k1-EIP191';
  rawQuoteHex: string;
}

/**
 * The independently verifiable portion of a report.
 *
 * Everything needed to verify a claim WITHOUT trusting VeriFlow: recompute the
 * digest from `attestation`, recover the signer from `signature`, and compare it
 * to the `teeIdentity` registered in `registryAddress` on Flare. This is exactly
 * what the public verifier page and scripts/verifyProof.mjs do.
 */
export interface VerificationProof {
  /** The 8 signed fields. Hashes/addresses, never PII. */
  attestation: {
    verificationId: string;
    subject: string;
    claimHash: string;
    result: boolean;
    issuedAt: number;
    expiresAt: number;
    codeMeasurement: string;
    attestationHash: string;
  };
  /** 65-byte secp256k1 ECDSA signature (r||s||v). */
  signature: string;
  /** keccak256 of the packed attestation — recomputable by the verifier. */
  digest: string;
  /** Address recovered from `signature`. */
  signerAddress: string;
  /** Where the signing key lives. */
  teeMode: 'remote' | 'simulated';
  /**
   * False for browser-signed proofs: the ephemeral key is not the registered
   * TEE identity, so the registry would reject the anchor. See signer.ts.
   */
  anchorable: boolean;
  /** Registry the proof should be verified against. */
  registryAddress?: string;
}

export interface VerificationReport {
  id: string; // ver_7ab1...
  userId: string;
  documentId: string;
  type: ClaimType;
  claimTitle: string;
  claimCategory: ClaimCategory;
  result: boolean;
  verificationStatus: 'VERIFIED' | 'DENIED' | 'UNVERIFIABLE';
  verifiedAt: string;
  hash: string;              // Verification hash
  signature: string;         // 65-byte ECDSA signature (mirrors proof.signature)
  attestationId: string;
  attestationQuote: RemoteAttestationQuote;
  /** Present when a real signature was produced. Absent for UNVERIFIABLE. */
  proof?: VerificationProof;
  confidenceScore: number;   // OCR confidence (e.g. 0.98)
  revoked: boolean;
  revokedAt?: string;
  requesterOrg?: string;
  txHash?: string;
  explorerUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  apiKey: string;
  webhookUrl?: string;
  requestsCount: number;
  createdAt: string;
}

export type OrganizationPersona = 'hr' | 'fintech' | 'web3' | 'marketplace';
export type VerificationRequestStatus =
  | 'awaiting_subject'
  | 'document_submitted'
  | 'processing'
  | 'verified'
  | 'denied'
  | 'unverifiable'
  | 'expired'
  | 'revoked';

export interface VerificationRequest {
  id: string;
  organizationId: string;
  organizationName: string;
  persona: OrganizationPersona;
  subjectReference: string;
  subjectEmail?: string;
  claims: ClaimType[];
  allowedDocumentTypes: DocumentType[];
  status: VerificationRequestStatus;
  verificationUrl: string;
  callbackUrl?: string;
  createdAt: string;
  expiresAt: string;
  verificationId?: string;
  claimResults?: Array<{ claim: ClaimType; result: boolean; status: 'VERIFIED' | 'DENIED' | 'UNVERIFIABLE'; verificationId: string }>;
  consentedAt?: string;
}

export interface ApiLog {
  id: string;
  organizationId: string;
  organizationName: string;
  verificationId: string;
  endpoint: string;
  statusCode: number;
  createdAt: string;
}

export interface UserSession {
  address: string;
  isConnected: boolean;
  chainId: number;
  trustScore: number;
  documentsCount: number;
  verificationsCount: number;
}

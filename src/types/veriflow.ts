export type DocumentType = 
  | 'passport' 
  | 'drivers_license' 
  | 'resume' 
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

export interface RemoteAttestationQuote {
  attestationId: string;
  enclaveMeasurementHex: string; // PCR / Code Hash (e.g. SHA-256 of enclave binary)
  kmsStatus: 'VALID_ALLOWLIST' | 'REJECTED_UNATTESTED';
  keyReleased: boolean;
  hardwareTEE: 'Flare Confidential Compute (Intel SGX / AMD SEV TEE)' | 'Local TEE Simulator (Mock Hardware Attested)';
  timestamp: string;
  signatureScheme: 'Ed25519-TEE-Attested' | 'ECDSA-Secp256k1-Enclave';
  rawQuoteHex: string;
}

export interface VerificationReport {
  id: string; // ver_7ab1...
  userId: string;
  documentId: string;
  type: ClaimType;
  claimTitle: string;
  claimCategory: ClaimCategory;
  result: boolean;
  verifiedAt: string;
  hash: string;              // Verification hash
  signature: string;         // Cryptographic signature from Enclave SK
  attestationId: string;
  attestationQuote: RemoteAttestationQuote;
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

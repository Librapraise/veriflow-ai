/**
 * VeriFlow AI — Typed API Client for FastAPI Gateway
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DEFAULT_DEMO_KEY = 'vf_live_demo1234567890abcdef12345678';

export interface TeeIdentityResponse {
  tee_identity_address: string;
  code_measurement: string;
  registry_address: string;
  signature_scheme: string;
  chain_id: number;
}

export interface ExecuteTeeParams {
  wallet_address: string;
  claim_type: string;
  document_id?: string;
  threshold?: number;
  apiKey?: string;
}

export interface BackendVerifyResponse {
  verification_id: string;
  claim: string;
  result: boolean;
  timestamp: string;
  signature: string;
  attestation_id: string;
  attestation_quote: {
    enclave_measurement: string;
    kms_status: string;
    hardware_tee: string;
    signature_scheme: string;
    tee_identity: string;
    key_released: boolean;
  };
}

export interface CreateOrgResponse {
  organization_id: string;
  name: string;
  api_key: string;
  message: string;
}

/**
 * Fetches published TEE identity, container code measurement, and registry configuration.
 */
export async function getTeeIdentity(): Promise<TeeIdentityResponse> {
  const res = await fetch(`${API_BASE_URL}/v1/tee/identity`);
  if (!res.ok) {
    throw new Error(`Failed to fetch TEE identity: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Executes remote TEE verification job via FastAPI Gateway.
 */
export async function executeTeeVerification(
  params: ExecuteTeeParams
): Promise<BackendVerifyResponse> {
  const apiKey = params.apiKey || DEFAULT_DEMO_KEY;

  const res = await fetch(`${API_BASE_URL}/v1/tee/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      wallet_address: params.wallet_address,
      claim_type: params.claim_type,
      document_id: params.document_id,
      threshold: params.threshold,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorBody.detail || `API error ${res.status}`);
  }

  return res.json();
}

/**
 * Fetches a verification report by ID.
 */
export async function getVerificationReport(
  verificationId: string
): Promise<BackendVerifyResponse> {
  const res = await fetch(`${API_BASE_URL}/v1/verifications/${verificationId}`);
  if (!res.ok) {
    throw new Error(`Verification ${verificationId} not found`);
  }
  return res.json();
}

/**
 * Registers a new organization and issues a live API key.
 */
export async function createOrganization(name: string): Promise<CreateOrgResponse> {
  const res = await fetch(`${API_BASE_URL}/v1/organizations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create organization: ${res.statusText}`);
  }

  return res.json();
}

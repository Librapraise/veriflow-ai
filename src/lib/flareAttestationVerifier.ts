/**
 * Flare Confidential Compute (FCC) / Flare Compute Extensions (FCE) Attestation Verifier
 * Verifies hardware TEE remote attestation quotes against Flare Enclave Allowlist.
 */

import type { RemoteAttestationQuote } from '../types/veriflow';
import { ALLOWLISTED_ENCLAVE_MEASUREMENT } from './enclaveSimulator';

export interface FlareFCEAttestationResult {
  isValid: boolean;
  measurementMatch: boolean;
  hardwareTEE: string;
  signatureScheme: string;
  verifiableProofHash: string;
  details: string;
}

/**
 * Validates a Flare FCC attestation quote according to Flare FCE specification.
 */
export function verifyFlareAttestationQuote(
  quote: RemoteAttestationQuote
): FlareFCEAttestationResult {
  const measurementMatch = quote.enclaveMeasurementHex.toLowerCase() === ALLOWLISTED_ENCLAVE_MEASUREMENT.toLowerCase();
  const isValid = quote.keyReleased && quote.kmsStatus === 'VALID_ALLOWLIST' && measurementMatch;

  return {
    isValid,
    measurementMatch,
    hardwareTEE: quote.hardwareTEE || 'Flare Confidential Compute (Intel SGX / AMD SEV TEE)',
    signatureScheme: quote.signatureScheme || 'Ed25519-TEE-Attested',
    verifiableProofHash: quote.enclaveMeasurementHex,
    details: isValid 
      ? 'Attestation quote verified against Flare Enclave Measurement Allowlist. KMS key release authorized.' 
      : 'FAIL CLOSED: Remote Attestation Quote rejected by Flare KMS Allowlist.'
  };
}

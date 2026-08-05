/**
 * Active TEE identity & code version for this build.
 *
 * Holds the two pieces of identity the rest of the app needs:
 *   - the CODE MEASUREMENT (which approved code version produced a result)
 *   - the ACTIVE SIGNER    (which key custody mode is in use)
 *
 * Phase 5 swaps the signer to RemoteTeeSigner once the backend TEE executor is
 * live; until then the app signs in-browser with an ephemeral key, which is real
 * ECDSA but explicitly NOT anchorable (see signer.ts).
 */

import { ethers } from 'ethers';
import { CODE_MEASUREMENT, TEE_IDENTITY_ADDRESS } from '../../config/contracts';
import { SimulatedTeeSigner, type TeeSigner } from './signer';

/**
 * Source string for the code measurement when no deployed value is configured.
 * In production this is the container image digest; see backend/Dockerfile.
 */
export const CODE_MEASUREMENT_SOURCE = 'veriflow-backend:v2';

/**
 * The approved code version, as bytes32.
 * Falls back to keccak256(CODE_MEASUREMENT_SOURCE) before the registry is
 * deployed, so local development works with no configuration.
 */
export function getCodeMeasurement(): string {
  if (CODE_MEASUREMENT && /^0x[0-9a-fA-F]{64}$/.test(CODE_MEASUREMENT)) {
    return CODE_MEASUREMENT;
  }
  return ethers.keccak256(ethers.toUtf8Bytes(CODE_MEASUREMENT_SOURCE));
}

/** The TEE identity address registered on-chain, or null before deployment. */
export function getRegisteredTeeIdentity(): string | null {
  return TEE_IDENTITY_ADDRESS && ethers.isAddress(TEE_IDENTITY_ADDRESS)
    ? ethers.getAddress(TEE_IDENTITY_ADDRESS)
    : null;
}

// One signer per page load, so the identity is stable across verifications
// within a session.
let activeSigner: TeeSigner | null = null;

export function getActiveTeeSigner(): TeeSigner {
  if (!activeSigner) {
    activeSigner = new SimulatedTeeSigner();
  }
  return activeSigner;
}

/** Phase 5 uses this to install the RemoteTeeSigner. */
export function setActiveTeeSigner(signer: TeeSigner): void {
  activeSigner = signer;
}

/**
 * Human-readable description of the current simulation boundary, shown in the
 * UI so a reviewer is never misled about what is real.
 */
export function describeTeeMode(signer: TeeSigner = getActiveTeeSigner()): string {
  return signer.mode === 'remote'
    ? 'Signed by the backend-held TEE identity key. Anchorable on Flare Coston2.'
    : 'Signed in-browser with an ephemeral key: real ECDSA, but not the registered TEE identity, so it cannot be anchored on-chain.';
}

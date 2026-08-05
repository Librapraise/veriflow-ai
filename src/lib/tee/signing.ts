/**
 * VeriFlow AI — Canonical TEE Attestation Signing
 *
 * SINGLE SOURCE OF TRUTH for the attestation digest. This exact byte layout is
 * reproduced in three other places and MUST stay in sync:
 *   - contracts/VeriFlowRegistryV2.sol  (abi.encodePacked -> ecrecover)
 *   - backend/tee/signing.py            (eth_account, server-held key)
 *   - scripts/verifyProof.mjs           (deliberately independent verifier)
 *
 * Packed layout (abi.encodePacked — NOT abi.encode):
 *   bytes32 verificationId    keccak256(utf8("ver_..."))
 *   address subject           wallet the claim is about (anti cross-wallet replay)
 *   bytes32 claimHash         keccak256(utf8("age_above_18"))
 *   bool    result            the attested truth value
 *   uint64  issuedAt          unix seconds
 *   uint64  expiresAt         unix seconds
 *   bytes32 codeMeasurement   approved code version (Flare FCC model)
 *   bytes32 attestationHash   keccak256(utf8(attestation token))
 *
 * digest    = keccak256(packed)
 * signature = secp256k1 ECDSA over the EIP-191 envelope:
 *             keccak256("\x19Ethereum Signed Message:\n32" || digest)
 *
 * CRITICAL (see plan P1): the digest is signed as 32 RAW BYTES, never as a hex
 * string. Passing the 66-char hex string makes ethers prefix "\n66" instead of
 * "\n32", and on-chain ecrecover will never match. Always ethers.getBytes().
 */

import { ethers } from 'ethers';

/** Field types for abi.encodePacked. Order is load-bearing. */
export const ATTESTATION_PACKED_TYPES: readonly string[] = [
  'bytes32', // verificationId
  'address', // subject
  'bytes32', // claimHash
  'bool',    // result
  'uint64',  // issuedAt
  'uint64',  // expiresAt
  'bytes32', // codeMeasurement
  'bytes32', // attestationHash
];

/**
 * Attestations are long-lived on purpose: a judge (or any verifier) may open a
 * shared proof link weeks after it was issued. A short TTL would make a working
 * demo look broken. Production deployments should shorten this.
 */
export const ATTESTATION_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

export interface VerificationAttestation {
  verificationId: string;  // bytes32 hex
  subject: string;         // checksummed address
  claimHash: string;       // bytes32 hex
  result: boolean;
  issuedAt: number;        // uint64 unix seconds
  expiresAt: number;       // uint64 unix seconds
  codeMeasurement: string; // bytes32 hex
  attestationHash: string; // bytes32 hex
}

/** Shorter alias — reads better at call sites. */
export type Attestation = VerificationAttestation;

/**
 * Human-friendly input to buildAttestation(): plain values, not hashes.
 * buildAttestation() does the keccak/address normalisation.
 */
export interface AttestationInput {
  verificationId: string;  // "ver_7ab1c9e4"
  subject: string;         // wallet address the claim is about
  claim: string;           // "age_above_18"
  result: boolean;
  codeMeasurement: string; // bytes32 hex
  attestationId: string;   // "att_22f09a1"
  ttlSeconds?: number;
}

/** keccak256 of a UTF-8 string, as bytes32 hex. */
export function hashUtf8(value: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(value));
}

/** "ver_7ab1c9e4" -> bytes32 */
export const verificationIdToBytes32 = hashUtf8;

/** "age_above_18" -> bytes32. The CLAIM STRING is what gets attested. */
export const claimToClaimHash = hashUtf8;

/**
 * Compute the canonical attestation digest.
 * Must byte-for-byte match abi.encodePacked in VeriFlowRegistryV2.
 */
export function computeAttestationDigest(a: VerificationAttestation): string {
  return ethers.solidityPackedKeccak256(
    ATTESTATION_PACKED_TYPES as string[],
    [
      a.verificationId,
      a.subject,
      a.claimHash,
      a.result,
      a.issuedAt,
      a.expiresAt,
      a.codeMeasurement,
      a.attestationHash,
    ],
  );
}

/**
 * Alias matching the Solidity function name `attestationDigest()`.
 * Actual signing lives in ./signer.ts, which owns key custody.
 */
export const attestationDigest = computeAttestationDigest;

/**
 * Recover the signing address from an attestation + signature.
 * Returns null when the signature is malformed rather than throwing, so callers
 * can render "INVALID PROOF" instead of crashing.
 */
export function recoverAttestationSigner(
  attestation: VerificationAttestation,
  signature: string,
): string | null {
  try {
    const digest = computeAttestationDigest(attestation);
    return ethers.verifyMessage(ethers.getBytes(digest), signature);
  } catch {
    return null;
  }
}

/** True when `signature` was produced by `expectedSigner` over this attestation. */
export function isSignedBy(
  attestation: VerificationAttestation,
  signature: string,
  expectedSigner: string,
): boolean {
  const recovered = recoverAttestationSigner(attestation, signature);
  if (!recovered || !ethers.isAddress(expectedSigner)) return false;
  return recovered.toLowerCase() === expectedSigner.toLowerCase();
}

/** Build an attestation with sensible issuedAt/expiresAt defaults. */
export function buildAttestation(params: AttestationInput): Attestation {
  const issuedAt = Math.floor(Date.now() / 1000);
  return {
    verificationId: verificationIdToBytes32(params.verificationId),
    subject: ethers.isAddress(params.subject)
      ? ethers.getAddress(params.subject)
      : ethers.ZeroAddress,
    claimHash: claimToClaimHash(params.claim),
    result: params.result,
    issuedAt,
    expiresAt: issuedAt + (params.ttlSeconds ?? ATTESTATION_TTL_SECONDS),
    codeMeasurement: params.codeMeasurement,
    attestationHash: hashUtf8(params.attestationId),
  };
}

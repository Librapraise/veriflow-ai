/**
 * VeriFlow AI — Attestation digest & signature verification (independent impl).
 *
 * This is DELIBERATELY a second implementation of the layout defined in
 * src/lib/tee/signing.ts. Keeping it independent means the verifier does not
 * inherit a bug from the signer: if the two ever disagree, the frozen test
 * vector in scripts/testSigningParity.mjs fails loudly.
 *
 * Packed layout (abi.encodePacked — 165 bytes total):
 *   bytes32 verificationId | address subject | bytes32 claimHash | bool result
 *   uint64 issuedAt | uint64 expiresAt | bytes32 codeMeasurement | bytes32 attestationHash
 */

import { ethers } from "ethers";

export const ATTESTATION_PACKED_TYPES = [
  "bytes32", // verificationId
  "address", // subject
  "bytes32", // claimHash
  "bool", // result
  "uint64", // issuedAt
  "uint64", // expiresAt
  "bytes32", // codeMeasurement
  "bytes32", // attestationHash
];

/** abi.encodePacked is fixed-width & unpadded, so the size is invariant. */
export const EXPECTED_PACKED_BYTES = 32 + 20 + 32 + 1 + 8 + 8 + 32 + 32; // 165

const orderedValues = (a) => [
  a.verificationId,
  a.subject,
  a.claimHash,
  a.result,
  a.issuedAt,
  a.expiresAt,
  a.codeMeasurement,
  a.attestationHash,
];

/** The packed preimage. Exposed so tests can assert it is packed, not padded. */
export function packAttestation(a) {
  return ethers.solidityPacked(ATTESTATION_PACKED_TYPES, orderedValues(a));
}

/** keccak256 of the packed preimage. Must equal Solidity attestationDigest(). */
export function computeAttestationDigest(a) {
  return ethers.keccak256(packAttestation(a));
}

/**
 * The EIP-191 envelope, computed MANUALLY rather than via signMessage.
 *
 * This is the assertion that matters: the length prefix must be literally "32",
 * matching `"\x19Ethereum Signed Message:\n32"` in the Solidity contract. If a
 * caller ever signs the digest as a hex *string*, ethers prefixes "\n66" and
 * this envelope will not reproduce their signature.
 */
export function ethSignedDigest(a) {
  const digest = computeAttestationDigest(a);
  return ethers.keccak256(
    ethers.concat([ethers.toUtf8Bytes("\x19Ethereum Signed Message:\n32"), ethers.getBytes(digest)]),
  );
}

/** Recover the signer, or null when the signature is malformed. */
export function recoverAttestationSigner(a, signature) {
  try {
    return ethers.recoverAddress(ethSignedDigest(a), signature);
  } catch {
    return null;
  }
}

export function isSignedBy(a, signature, expectedSigner) {
  const recovered = recoverAttestationSigner(a, signature);
  if (!recovered || !ethers.isAddress(expectedSigner)) return false;
  return recovered.toLowerCase() === expectedSigner.toLowerCase();
}

export const hashUtf8 = (s) => ethers.keccak256(ethers.toUtf8Bytes(s));

/** Aliases matching the Solidity function names, for readability at call sites. */
export const attestationDigest = computeAttestationDigest;
export const packedPreimage = packAttestation;

export const DEFAULT_RPC_URL = "https://coston2-api.flare.network/ext/C/rpc";
export const EXPLORER_BASE_URL = "https://coston2-explorer.flare.network";

/** Minimal read-only ABI — only what an independent verifier needs. */
export const REGISTRY_V2_ABI = [
  "function teeIdentity() view returns (address)",
  "function approvedCodeMeasurement(bytes32) view returns (bool)",
  "function verifyRecord(bytes32 verificationId) view returns (bool exists, bool isValid, bool result, address subject, bytes32 claimHash, uint256 anchoredAt, uint64 expiresAt, bytes32 codeMeasurement)",
  "function verificationSignature(bytes32 verificationId) view returns (bytes)",
];

/**
 * Frozen test vector. Every field is fixed so the digest is deterministic.
 * If ANY implementation of the layout drifts, testSigningParity.mjs fails.
 */
export const TEST_VECTOR = {
  verificationId: hashUtf8("ver_paritytest01"),
  subject: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  claimHash: hashUtf8("age_above_18"),
  result: true,
  issuedAt: 1750000000,
  expiresAt: 1757776000,
  codeMeasurement: hashUtf8("veriflow-backend@sha256:paritytest"),
  attestationHash: hashUtf8("att_paritytest"),
};

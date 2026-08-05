/**
 * Flare Network Configuration & Smart Contract References
 */

export const FLARE_COSTON2_CONFIG = {
  chainId: 114,
  chainIdHex: '0x72',
  chainName: 'Flare Coston2 Testnet',
  nativeCurrency: {
    name: 'Coston2 Flare',
    symbol: 'C2FLR',
    decimals: 18
  },
  rpcUrls: [
    'https://coston2-api.flare.network/ext/C/rpc'
  ],
  blockExplorerUrls: [
    'https://coston2-explorer.flare.network'
  ]
};

/**
 * VeriFlowRegistry V1 — SUPERSEDED, kept for historical reference only.
 *
 * V1 accepted any caller and never verified the signature it stored, so an
 * anchored V1 record proves nothing about who produced it. V2 recovers the
 * signer on-chain and requires it to equal the registered TEE identity.
 * Nothing in the app writes to V1 any more.
 */
export const VERIFLOW_REGISTRY_V1_ADDRESS = '0xFc502748a4A8f28e00BA93E05F8fb98b3Abc79CD';

// ─── V2: the live registry ────────────────────────────────────────────────────
// Patched automatically by `node scripts/deployV2.js`.

/** Deployed VeriFlowRegistryV2 address on Flare Coston2. Empty until deployed. */
export const VERIFLOW_REGISTRY_V2_ADDRESS = '0x2d52308CcABaEC795369A0769861c2b2c75E500E';

/** The TEE identity whose signatures V2 accepts. Empty until deployed. */
export const TEE_IDENTITY_ADDRESS = '0x3FB763Adfc4190482a2e6758c7842c755B4aE1bE';

/** Approved code version (container image digest) registered at deploy. */
export const CODE_MEASUREMENT = '0xd84e5ababec001f7d94523e6c48f2a3de09060f032abc3744e5262a32fded72d';

export const VERIFLOW_REGISTRY_V2_ABI = [
  'function owner() view returns (address)',
  'function teeIdentity() view returns (address)',
  'function approvedCodeMeasurement(bytes32) view returns (bool)',
  'function attestationDigest((bytes32,address,bytes32,bool,uint64,uint64,bytes32,bytes32) a) pure returns (bytes32)',
  'function recoverSigner((bytes32,address,bytes32,bool,uint64,uint64,bytes32,bytes32) a, bytes signature) pure returns (address)',
  'function anchorVerification((bytes32,address,bytes32,bool,uint64,uint64,bytes32,bytes32) a, bytes signature) external',
  'function revokeVerification(bytes32 verificationId) external',
  'function verifyRecord(bytes32 verificationId) view returns (bool exists, bool isValid, bool result, address subject, bytes32 claimHash, uint256 anchoredAt, uint64 expiresAt, bytes32 codeMeasurement)',
  'function verificationSignature(bytes32 verificationId) view returns (bytes)',
  'event VerificationAnchored(bytes32 indexed verificationId, bytes32 indexed claimHash, address indexed subject, bool result, bytes32 codeMeasurement, bytes32 attestationHash, address caller, uint256 timestamp)',
  'event VerificationRevoked(bytes32 indexed verificationId, uint256 timestamp)',
  'event TeeIdentityRegistered(address indexed previous, address indexed current, bytes32 codeMeasurement)',
  'event CodeMeasurementApproved(bytes32 indexed codeMeasurement, bool approved)',
];

// ─── V1 (legacy) ──────────────────────────────────────────────────────────────

/** @deprecated Use VERIFLOW_REGISTRY_V2_ADDRESS. */
export const VERIFLOW_REGISTRY_ADDRESS = VERIFLOW_REGISTRY_V1_ADDRESS;

export const VERIFLOW_REGISTRY_ABI = [
  "function owner() view returns (address)",
  "function enclavePublicKey() view returns (bytes)",
  "function anchorVerification(bytes32 verificationId, bytes32 claimHash, bool result, bytes32 attestationHash, bytes signature) external",
  "function revokeVerification(bytes32 verificationId) external",
  "function verifyRecord(bytes32 verificationId) external view returns (bool exists, bool isValid, bool result, uint256 timestamp, bytes32 attestationHash)",
  "event VerificationAnchored(bytes32 indexed verificationId, bytes32 indexed claimHash, bool result, bytes32 attestationHash, address indexed caller, uint256 timestamp)",
  "event VerificationRevoked(bytes32 indexed verificationId, uint256 timestamp)"
];

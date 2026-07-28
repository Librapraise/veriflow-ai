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

// Deployed VeriFlowRegistry Contract Address on Flare Coston2 Testnet
export const VERIFLOW_REGISTRY_ADDRESS = '0xFBD03628412D82BcD94a1CdA61D865fBB5d41c47'; // Default initial fallback address

export const VERIFLOW_REGISTRY_ABI = [
  "function owner() view returns (address)",
  "function enclavePublicKey() view returns (bytes)",
  "function anchorVerification(bytes32 verificationId, bytes32 claimHash, bool result, bytes32 attestationHash, bytes signature) external",
  "function revokeVerification(bytes32 verificationId) external",
  "function verifyRecord(bytes32 verificationId) external view returns (bool exists, bool isValid, bool result, uint256 timestamp, bytes32 attestationHash)",
  "event VerificationAnchored(bytes32 indexed verificationId, bytes32 indexed claimHash, bool result, bytes32 attestationHash, uint256 timestamp)",
  "event VerificationRevoked(bytes32 indexed verificationId, uint256 timestamp)"
];

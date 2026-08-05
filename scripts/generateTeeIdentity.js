/**
 * Generate a fresh TEE identity keypair for VeriFlow AI.
 *
 * The resulting PRIVATE key is the "TEE identity" that signs verification
 * attestations. It must live ONLY in the server environment (Railway
 * ENCLAVE_SECRET_KEY). It must never be committed, and never be a key that has
 * appeared in git history, a log, or a chat transcript.
 *
 * Usage:  node scripts/generateTeeIdentity.js
 */

import { ethers } from "ethers";

const wallet = ethers.Wallet.createRandom();

// Uncompressed secp256k1 public key (0x04 || X || Y) — published so third
// parties can verify signatures without trusting our API.
const publicKey = wallet.signingKey.publicKey;

console.log(`
${"=".repeat(68)}
  VeriFlow AI — TEE Identity Keypair
${"=".repeat(68)}

  Address     (public, register on-chain):
    ${wallet.address}

  Public key  (publish for independent verification):
    ${publicKey}

  PRIVATE KEY (secret — server env only):
    ${wallet.privateKey}

${"=".repeat(68)}
  NEXT STEPS
${"=".repeat(68)}

  1. Set in the BACKEND environment (Railway → Variables), never in git:
       ENCLAVE_SECRET_KEY=${wallet.privateKey}

  2. Deploy the registry, which registers this address as the TEE identity:
       node scripts/deployV2.js

  3. Confirm the deployed contract reports the same address:
       teeIdentity() == ${wallet.address}

  WARNING: this key is printed once. Store it now. If it leaks, generate a new
  one and call registerTeeIdentity() to rotate.
${"=".repeat(68)}
`);

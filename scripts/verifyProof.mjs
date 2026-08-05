#!/usr/bin/env node
/**
 * VeriFlow AI — independent proof verifier.
 *
 * Verifies a VeriFlow attestation with NO trust in VeriFlow: no API call, no
 * wallet, no private key. It recomputes the digest locally, recovers the
 * signer, and checks it against the TEE identity registered in the on-chain
 * registry over a public Flare RPC.
 *
 * Usage:
 *   node scripts/verifyProof.mjs <proof.json>
 *   node scripts/verifyProof.mjs <proof.json> --rpc https://coston2-api.flare.network/ext/C/rpc
 *   node scripts/verifyProof.mjs <proof.json> --offline    # skip on-chain checks
 *
 * Exit code 0 = proof is cryptographically valid, non-zero = it is not.
 */

import fs from 'fs';
import 'dotenv/config';
import { ethers } from 'ethers';
import {
  attestationDigest,
  recoverAttestationSigner,
  packedPreimage,
  DEFAULT_RPC_URL,
  REGISTRY_V2_ABI,
} from './lib/attestation.mjs';

const DEPLOYED_REGISTRY_V2 = '0x2d52308CcABaEC795369A0769861c2b2c75E500E';

const args = process.argv.slice(2);
const proofPath = args.find((a) => !a.startsWith('--'));
const offline = args.includes('--offline');
const rpcUrl = (() => {
  const i = args.indexOf('--rpc');
  return i !== -1 && args[i + 1] ? args[i + 1] : DEFAULT_RPC_URL;
})();

if (!proofPath) {
  console.error(`
VeriFlow AI — independent proof verifier

Usage:
  node scripts/verifyProof.mjs <proof.json> [--rpc <url>] [--offline]

The proof JSON is what the app's "Share Verification" button copies, or the
payload embedded in a /verify#<base64url> link.
`);
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(proofPath, 'utf8'));

// Accept either a bare {attestation, signature} or a full report envelope.
const attestation = raw.attestation ?? raw;
const signature = raw.signature ?? raw.attestation?.signature;
const registryAddress =
  raw.registryAddress ?? process.env.VITE_REGISTRY_V2_ADDRESS ?? process.env.VITE_REGISTRY_CONTRACT_ADDRESS ?? DEPLOYED_REGISTRY_V2;

if (!signature) {
  console.error('✗ proof JSON has no `signature` field.');
  process.exit(1);
}

const checks = [];
const record = (ok, label, detail) => {
  checks.push({ ok, label, detail });
  const mark = ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`  ${mark} ${label}`);
  if (detail) console.log(`      ${detail}`);
};

console.log('\nVeriFlow AI — proof verification');
console.log('='.repeat(60));
console.log(`  proof : ${proofPath}`);
console.log(`  mode  : ${offline ? 'offline (local crypto only)' : `on-chain via ${rpcUrl}`}`);
console.log('');

// ── 1. Structure ────────────────────────────────────────────────────────────
const required = [
  'verificationId', 'subject', 'claimHash', 'result',
  'issuedAt', 'expiresAt', 'codeMeasurement', 'attestationHash',
];
const missing = required.filter((f) => attestation[f] === undefined);
record(missing.length === 0, 'Proof payload has all 8 attested fields',
  missing.length ? `missing: ${missing.join(', ')}` : undefined);
if (missing.length) finish();

// ── 2. Digest recomputed locally ────────────────────────────────────────────
let digest;
try {
  digest = attestationDigest(attestation);
  record(true, 'Canonical digest recomputed locally', digest);
  console.log(`      preimage: ${packedPreimage(attestation).length / 2 - 1} bytes (abi.encodePacked)`);
} catch (e) {
  record(false, 'Canonical digest recomputed locally', e.message);
  finish();
}

// ── 3. Signature recovers ──────────────────────────────────────────────────
// recoverAttestationSigner returns null (does NOT throw) on a malformed or
// forged signature, so this must be an explicit null check. A try/catch here
// would never fire and would report a forged proof as valid.
const recovered = recoverAttestationSigner(attestation, signature);
if (!recovered) {
  record(false, 'Signature is a valid secp256k1 ECDSA signature',
    'signature does not recover to any address — malformed or forged');
  finish();
}
record(true, 'Signature is a valid secp256k1 ECDSA signature', `signer: ${recovered}`);

// ── 4. Expiry ──────────────────────────────────────────────────────────────
const now = Math.floor(Date.now() / 1000);
const expiresAt = Number(attestation.expiresAt);
record(expiresAt > now, 'Attestation has not expired',
  `expires ${new Date(expiresAt * 1000).toISOString()}` +
  (expiresAt > now ? '' : ' — EXPIRED'));

// ── 5-7. On-chain checks ───────────────────────────────────────────────────
if (offline) {
  console.log('\n  \x1b[33m⚠\x1b[0m on-chain checks skipped (--offline). The signature is');
  console.log('     self-consistent, but nothing proves the signer is the');
  console.log('     registered TEE identity. Re-run without --offline.');
} else if (!registryAddress) {
  record(false, 'Registry address available',
    'set VITE_REGISTRY_V2_ADDRESS or include registryAddress in the proof');
} else {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const registry = new ethers.Contract(registryAddress, REGISTRY_V2_ABI, provider);

  try {
    const onChainIdentity = await registry.teeIdentity();
    const identityMatches = onChainIdentity.toLowerCase() === recovered.toLowerCase();
    record(identityMatches, 'Signer IS the TEE identity registered on Flare',
      identityMatches
        ? `${onChainIdentity} (registry ${registryAddress})`
        : `recovered ${recovered} !== registered ${onChainIdentity}`);

    const codeApproved = await registry.approvedCodeMeasurement(attestation.codeMeasurement);
    record(codeApproved, 'Code version is allow-listed on-chain',
      `codeMeasurement ${attestation.codeMeasurement.slice(0, 18)}…`);

    const verificationIdBytes32 = attestation.verificationId;
    const rec = await registry.verifyRecord(verificationIdBytes32);
    const [exists, isValid, onChainResult] = rec;

    record(exists, 'Verification is anchored on-chain',
      exists ? undefined : 'no record found — proof was signed but never anchored');

    if (exists) {
      record(onChainResult === attestation.result,
        'On-chain result matches the signed result',
        `on-chain: ${onChainResult}, signed: ${attestation.result}`);
      record(isValid, 'Record is not revoked and not expired on-chain');
    }
  } catch (e) {
    record(false, 'On-chain verification', `RPC/contract error: ${e.shortMessage || e.message}`);
  }
}

finish();

function finish() {
  const failed = checks.filter((c) => !c.ok);
  console.log('\n' + '='.repeat(60));

  // The attested truth value is NOT the same as proof validity. A valid proof
  // can attest `false` — that is a working credential system, not a failure.
  if (failed.length === 0) {
    const verdict = attestation.result ? 'CLAIM IS TRUE' : 'CLAIM IS FALSE';
    console.log(`  \x1b[32mPROOF VALID\x1b[0m — attested verdict: \x1b[1m${verdict}\x1b[0m`);
    console.log(`  subject: ${attestation.subject}`);
    console.log(`  claim  : ${attestation.claimHash}`);
    console.log('\n  Not disclosed to you: full name, date of birth, document');
    console.log('  number, and the document itself. Only the verdict above.');
    console.log('='.repeat(60) + '\n');
    process.exit(0);
  }

  console.log(`  \x1b[31mPROOF INVALID\x1b[0m — ${failed.length} check(s) failed:`);
  failed.forEach((c) => console.log(`    · ${c.label}`));
  console.log('='.repeat(60) + '\n');
  process.exit(1);
}

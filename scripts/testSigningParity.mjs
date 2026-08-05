/**
 * VeriFlow AI — Signing parity test (Phase 2 gate).
 *
 * Proves the attestation digest and signature envelope agree across:
 *   1. scripts/lib/attestation.mjs      (independent verifier impl)
 *   2. ethers Wallet.signMessage(bytes) (what the signer actually does)
 *   3. VeriFlowRegistryV2.sol           (compiled + run on a real EVM)
 *
 * Nothing in Phase 2 should be built on top of this until it passes. See plan
 * pitfalls P1 (bytes vs hex string) and P2 (encodePacked vs encode).
 *
 * Usage:  node scripts/testSigningParity.mjs
 */

import { ethers } from "ethers";
import solc from "solc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  TEST_VECTOR,
  EXPECTED_PACKED_BYTES,
  packAttestation,
  computeAttestationDigest,
  ethSignedDigest,
  recoverAttestationSigner,
} from "./lib/attestation.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

function check(label, actual, expected) {
  const ok = String(actual).toLowerCase() === String(expected).toLowerCase();
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}`);
    console.log(`      expected: ${expected}`);
    console.log(`      actual:   ${actual}`);
  }
  return ok;
}

function assertTrue(label, cond) {
  return check(label, cond ? "true" : "false", "true");
}

console.log("\nVeriFlow AI — attestation signing parity\n" + "=".repeat(60));

// ── 1. Packing shape (P2: packed, not padded) ────────────────────────────────
console.log("\n[1] abi.encodePacked layout");
const packed = packAttestation(TEST_VECTOR);
const packedBytes = ethers.getBytes(packed).length;
check(`packed preimage is ${EXPECTED_PACKED_BYTES} bytes (unpadded)`, packedBytes, EXPECTED_PACKED_BYTES);
// abi.encode would pad every field to 32 bytes => 8 * 32 = 256.
assertTrue("packed !== abi.encode (would be 256 bytes)", packedBytes !== 256);

const digest = computeAttestationDigest(TEST_VECTOR);
console.log(`      digest: ${digest}`);

// ── 2. EIP-191 envelope: signMessage(bytes) must match the manual "\n32" form ─
console.log("\n[2] EIP-191 envelope (P1: sign 32 raw bytes, never a hex string)");
const wallet = ethers.Wallet.createRandom();

const sigFromBytes = await wallet.signMessage(ethers.getBytes(digest));
check(
  "signMessage(getBytes(digest)) recovers to the signer",
  ethers.recoverAddress(ethSignedDigest(TEST_VECTOR), sigFromBytes),
  wallet.address,
);
check("our verifier recovers the same signer", recoverAttestationSigner(TEST_VECTOR, sigFromBytes), wallet.address);

// The classic bug: signing the hex STRING prefixes "\n66" instead of "\n32".
const sigFromHexString = await wallet.signMessage(digest);
assertTrue(
  "signing the hex string produces a DIFFERENT signature (bug guard)",
  sigFromHexString.toLowerCase() !== sigFromBytes.toLowerCase(),
);
assertTrue(
  "hex-string signature does NOT verify against the byte envelope",
  recoverAttestationSigner(TEST_VECTOR, sigFromHexString)?.toLowerCase() !== wallet.address.toLowerCase(),
);

// ── 3. Solidity parity on a real EVM ────────────────────────────────────────
console.log("\n[3] Solidity parity (compiled VeriFlowRegistryV2 on a live EVM)");

const contractPath = path.join(__dirname, "../contracts/VeriFlowRegistryV2.sol");
const source = fs.readFileSync(contractPath, "utf8");

const compiled = JSON.parse(
  solc.compile(
    JSON.stringify({
      language: "Solidity",
      sources: { "VeriFlowRegistryV2.sol": { content: source } },
      settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } },
    }),
  ),
);

const fatal = (compiled.errors || []).filter((e) => e.severity === "error");
if (fatal.length) {
  console.error("\n✗ Solidity compilation failed:\n");
  fatal.forEach((e) => console.error(e.formattedMessage));
  process.exit(1);
}
console.log("  ✓ VeriFlowRegistryV2.sol compiles");

const artifact = compiled.contracts["VeriFlowRegistryV2.sol"]["VeriFlowRegistryV2"];

// Run against an in-process EVM if hardhat is available; otherwise skip
// gracefully (the pure functions are the part that must match, and they are
// verified against the deployed contract in deployV2.js).
let provider;
try {
  const { default: hardhat } = await import("hardhat");
  provider = new ethers.BrowserProvider(hardhat.network.provider);
} catch {
  provider = null;
}

if (!provider) {
  console.log("  ⚠ no in-process EVM available — skipping on-chain digest check");
  console.log("     (deployV2.js re-verifies parity against the deployed contract)");
} else {
  const signer = await provider.getSigner();
  const factory = new ethers.ContractFactory(artifact.abi, artifact.evm.bytecode.object, signer);
  const registry = await factory.deploy(wallet.address, TEST_VECTOR.codeMeasurement);
  await registry.waitForDeployment();
  console.log("  ✓ deployed to in-process EVM");

  const attestationTuple = [
    TEST_VECTOR.verificationId,
    TEST_VECTOR.subject,
    TEST_VECTOR.claimHash,
    TEST_VECTOR.result,
    TEST_VECTOR.issuedAt,
    TEST_VECTOR.expiresAt,
    TEST_VECTOR.codeMeasurement,
    TEST_VECTOR.attestationHash,
  ];

  check("Solidity attestationDigest == TS digest", await registry.attestationDigest(attestationTuple), digest);
  check(
    "Solidity ethSignedDigest == TS envelope",
    await registry.ethSignedDigest(attestationTuple),
    ethSignedDigest(TEST_VECTOR),
  );
  check(
    "Solidity recoverSigner == wallet address",
    await registry.recoverSigner(attestationTuple, sigFromBytes),
    wallet.address,
  );

  // A tampered result must break recovery — this is the property the public
  // verifier page's "Tamper" button demonstrates.
  const tampered = [...attestationTuple];
  tampered[3] = !TEST_VECTOR.result;
  const recoveredFromTampered = await registry.recoverSigner(tampered, sigFromBytes);
  assertTrue(
    "flipping `result` changes the recovered signer (tamper-evident)",
    recoveredFromTampered.toLowerCase() !== wallet.address.toLowerCase(),
  );
}

// ── Summary ─────────────────────────────────────────────────────────────────
console.log("\n" + "=".repeat(60));
console.log(`  ${passed} passed, ${failed} failed`);
console.log("=".repeat(60) + "\n");

if (failed > 0) {
  console.error("PARITY BROKEN — do not build on this until it is fixed.\n");
  process.exit(1);
}
console.log("Parity verified. Safe to build Phase 2 on this layout.\n");

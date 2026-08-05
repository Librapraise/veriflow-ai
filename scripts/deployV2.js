/**
 * Deploy VeriFlowRegistryV2 to Flare Coston2 and PROVE digest parity on-chain.
 *
 * Unlike deployDirect.js (which deploys the superseded V1), this script:
 *   1. compiles VeriFlowRegistryV2.sol via solc (single source, no imports)
 *   2. deploys it with (teeIdentity, codeMeasurement)
 *   3. verifies the DEPLOYED contract's digest/envelope/recovery match the
 *      JavaScript implementation, using the frozen test vector
 *   4. patches src/config/contracts.ts with the new address
 *
 * Step 3 is the real gate: it runs against the actual EVM, so TS↔Solidity
 * agreement is proven on the chain judges will inspect.
 *
 * Required env (.env, gitignored):
 *   DEPLOYER_PRIVATE_KEY   funds the deployment (needs C2FLR)
 *   ENCLAVE_SECRET_KEY     TEE identity signing key (address derived from it)
 *                          — or set TEE_IDENTITY_ADDRESS directly
 * Optional:
 *   CODE_MEASUREMENT        bytes32 hex; else derived from CODE_MEASUREMENT_SOURCE
 *   CODE_MEASUREMENT_SOURCE default "veriflow-backend:v2"
 *
 * Usage:  node scripts/deployV2.js
 */

import { ethers } from "ethers";
import solc from "solc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import {
  TEST_VECTOR,
  computeAttestationDigest,
  ethSignedDigest,
  hashUtf8,
} from "./lib/attestation.mjs";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RPC_URL = process.env.VITE_FLARE_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
const EXPLORER = "https://coston2-explorer.flare.network";

function die(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

async function main() {
  // ── 1. Resolve the TEE identity ───────────────────────────────────────────
  let teeIdentityAddress = process.env.TEE_IDENTITY_ADDRESS;

  if (!teeIdentityAddress) {
    const enclaveKey = process.env.ENCLAVE_SECRET_KEY;
    if (!enclaveKey || !enclaveKey.startsWith("0x") || enclaveKey.length !== 66) {
      die(
        `No TEE identity configured.

Generate one (it prints the key ONCE — store it, never commit or paste it):
    node scripts/generateTeeIdentity.js

Then add to .env:
    ENCLAVE_SECRET_KEY=0x<the private key>

Or, if the key already lives only in your server env, set just the address:
    TEE_IDENTITY_ADDRESS=0x<the address>`,
      );
    }
    try {
      teeIdentityAddress = new ethers.Wallet(enclaveKey).address;
    } catch {
      die("ENCLAVE_SECRET_KEY is not a valid secp256k1 private key.");
    }
  }
  teeIdentityAddress = ethers.getAddress(teeIdentityAddress);

  // ── 2. Resolve the approved code measurement ──────────────────────────────
  const measurementSource = process.env.CODE_MEASUREMENT_SOURCE || "veriflow-backend:v2";
  const codeMeasurement = process.env.CODE_MEASUREMENT || hashUtf8(measurementSource);
  if (!/^0x[0-9a-fA-F]{64}$/.test(codeMeasurement)) {
    die(`CODE_MEASUREMENT must be 32-byte hex, got: ${codeMeasurement}`);
  }

  // ── 3. Compile ────────────────────────────────────────────────────────────
  console.log("📦 Compiling VeriFlowRegistryV2.sol...");
  const contractPath = path.join(__dirname, "../contracts/VeriFlowRegistryV2.sol");
  const sourceCode = fs.readFileSync(contractPath, "utf8");

  const output = JSON.parse(
    solc.compile(
      JSON.stringify({
        language: "Solidity",
        sources: { "VeriFlowRegistryV2.sol": { content: sourceCode } },
        settings: {
          optimizer: { enabled: true, runs: 200 },
          outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
        },
      }),
    ),
  );

  const fatal = (output.errors || []).filter((e) => e.severity === "error");
  if (fatal.length) {
    console.error("❌ Compilation errors:");
    fatal.forEach((e) => console.error(e.formattedMessage));
    process.exit(1);
  }
  (output.errors || [])
    .filter((e) => e.severity === "warning")
    .forEach((w) => console.warn("⚠️  " + w.formattedMessage.split("\n")[0]));

  const artifact = output.contracts["VeriFlowRegistryV2.sol"]["VeriFlowRegistryV2"];
  console.log("✅ Compiled");

  // ── 4. Connect ────────────────────────────────────────────────────────────
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) {
    die(
      `DEPLOYER_PRIVATE_KEY is not set in .env.

Your wallet needs C2FLR testnet gas: https://faucet.flare.network/
NEVER commit this key.`,
    );
  }

  console.log(`\n🌐 Connecting to Flare Coston2 (${RPC_URL})...`);
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(deployerKey, provider);

  const balance = await provider.getBalance(wallet.address);
  const balanceFLR = ethers.formatEther(balance);
  console.log(`👛 Deployer     : ${wallet.address}`);
  console.log(`💰 Balance      : ${balanceFLR} C2FLR`);
  console.log(`🔑 TEE identity : ${teeIdentityAddress}`);
  console.log(`📏 Code measure : ${codeMeasurement}`);
  console.log(`   (source      : "${measurementSource}")`);

  if (parseFloat(balanceFLR) < 0.01) {
    die(`Insufficient balance (${balanceFLR} C2FLR). Get free gas at https://faucet.flare.network/`);
  }

  // ── 5. Deploy ─────────────────────────────────────────────────────────────
  console.log("\n🚀 Deploying VeriFlowRegistryV2...");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.evm.bytecode.object, wallet);
  const contract = await factory.deploy(teeIdentityAddress, codeMeasurement);
  console.log(`⏳ tx: ${contract.deploymentTransaction()?.hash}`);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`✅ Deployed at ${address}`);

  // ── 6. Prove digest parity against the DEPLOYED contract ─────────────────
  console.log("\n🔬 Verifying TS ↔ Solidity digest parity on-chain...");
  const tuple = [
    TEST_VECTOR.verificationId,
    TEST_VECTOR.subject,
    TEST_VECTOR.claimHash,
    TEST_VECTOR.result,
    TEST_VECTOR.issuedAt,
    TEST_VECTOR.expiresAt,
    TEST_VECTOR.codeMeasurement,
    TEST_VECTOR.attestationHash,
  ];

  // Throwaway keypair, generated per run. Used ONLY to produce a signature for
  // the pure-function parity probe below; never funded, never registered.
  const probe = ethers.Wallet.createRandom();
  const probeSig = await probe.signMessage(ethers.getBytes(computeAttestationDigest(TEST_VECTOR)));

  const onChainDigest = await contract.attestationDigest(tuple);
  const onChainEnvelope = await contract.ethSignedDigest(tuple);
  const onChainSigner = await contract.recoverSigner(tuple, probeSig);

  const checks = [
    ["attestationDigest", onChainDigest, computeAttestationDigest(TEST_VECTOR)],
    ["ethSignedDigest", onChainEnvelope, ethSignedDigest(TEST_VECTOR)],
    ["recoverSigner", onChainSigner, probe.address],
  ];

  let parityOk = true;
  for (const [label, actual, expected] of checks) {
    const ok = String(actual).toLowerCase() === String(expected).toLowerCase();
    console.log(`   ${ok ? "✓" : "✗"} ${label}`);
    if (!ok) {
      console.log(`       expected: ${expected}`);
      console.log(`       on-chain: ${actual}`);
      parityOk = false;
    }
  }

  // Tamper-evidence: flipping `result` must change the recovered signer.
  const tampered = [...tuple];
  tampered[3] = !TEST_VECTOR.result;
  const tamperedSigner = await contract.recoverSigner(tampered, probeSig);
  const tamperOk = tamperedSigner.toLowerCase() !== probe.address.toLowerCase();
  console.log(`   ${tamperOk ? "✓" : "✗"} tampering with \`result\` breaks recovery`);
  if (!tamperOk) parityOk = false;

  // Sanity: the registered identity is what we intended.
  const registered = await contract.teeIdentity();
  const identityOk = registered.toLowerCase() === teeIdentityAddress.toLowerCase();
  console.log(`   ${identityOk ? "✓" : "✗"} teeIdentity() == configured identity`);
  if (!identityOk) parityOk = false;

  if (!parityOk) {
    die("PARITY BROKEN on the deployed contract. Do not ship this address.");
  }
  console.log("✅ Parity proven on-chain");

  // Patch contracts.ts with the deployed values.
  // IMPORTANT: assert each replace actually changed the string — a silent no-op
  // here means the frontend ships with empty config and anchoring silently fails.
  const configPath = path.join(__dirname, "../src/config/contracts.ts");
  if (fs.existsSync(configPath)) {
    let content = fs.readFileSync(configPath, "utf8");
    const before = content;

    const patches = [
      [
        /export const VERIFLOW_REGISTRY_V2_ADDRESS = '.*?';/,
        `export const VERIFLOW_REGISTRY_V2_ADDRESS = '${address}';`,
        "VERIFLOW_REGISTRY_V2_ADDRESS",
      ],
      [
        /export const TEE_IDENTITY_ADDRESS = '.*?';/,
        `export const TEE_IDENTITY_ADDRESS = '${teeIdentityAddress}';`,
        "TEE_IDENTITY_ADDRESS",
      ],
      [
        /export const CODE_MEASUREMENT = '.*?';/,
        `export const CODE_MEASUREMENT = '${codeMeasurement}';`,
        "CODE_MEASUREMENT",
      ],
    ];

    for (const [regex, replacement, name] of patches) {
      const patched = content.replace(regex, replacement);
      if (patched === content) {
        die(
          `Patcher: regex for ${name} did not match anything in src/config/contracts.ts.\n` +
            `  Expected a line matching: ${regex}\n` +
            `  The file may have been renamed or reformatted. Fix the regex in deployV2.js.`,
        );
      }
      content = patched;
    }

    if (content === before) {
      die("Patcher: no changes were made to src/config/contracts.ts — all three regexes no-opped.");
    }

    fs.writeFileSync(configPath, content, "utf8");
    console.log("✅ Patched src/config/contracts.ts (all 3 values confirmed changed)");
  }

  // ── 8. Persist the ABI for the verifier script ───────────────────────────
  const abiPath = path.join(__dirname, "../src/config/VeriFlowRegistryV2.abi.json");
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2), "utf8");
  console.log("✅ Wrote src/config/VeriFlowRegistryV2.abi.json");

  console.log(`
${"=".repeat(66)}
🎉  VeriFlowRegistryV2 live on Flare Coston2
${"=".repeat(66)}
  Address      : ${address}
  Explorer     : ${EXPLORER}/address/${address}
  TEE identity : ${teeIdentityAddress}
  Code measure : ${codeMeasurement}

  NEXT STEPS
  1. Verify the source on the explorer (flat / single-file, solc 0.8.20,
     optimizer ON @ 200 runs) so judges can read it.
  2. Set ENCLAVE_SECRET_KEY in the backend environment (Railway).
  3. Restart the dev server to pick up the new address.
${"=".repeat(66)}
`);
}

main().catch((err) => {
  console.error("\n❌ Deployment failed:", err.shortMessage || err.message || err);
  process.exit(1);
});

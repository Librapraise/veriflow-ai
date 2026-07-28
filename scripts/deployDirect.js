import { ethers } from "ethers";
import solc from "solc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // ── 1. Compile ────────────────────────────────────────────────────────────
  console.log("📦 Compiling VeriFlowRegistry.sol...");
  const contractPath = path.join(__dirname, "../contracts/VeriFlowRegistry.sol");
  const sourceCode = fs.readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: { "VeriFlowRegistry.sol": { content: sourceCode } },
    settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const fatal = output.errors.filter(e => e.severity === "error");
    if (fatal.length > 0) {
      console.error("❌ Compilation errors:", fatal.map(e => e.formattedMessage).join("\n"));
      process.exit(1);
    }
    output.errors.filter(e => e.severity === "warning").forEach(w =>
      console.warn("⚠️  Warning:", w.formattedMessage.split("\n")[0])
    );
  }

  const contractOutput = output.contracts["VeriFlowRegistry.sol"]["VeriFlowRegistry"];
  const abi = contractOutput.abi;
  const bytecode = contractOutput.evm.bytecode.object;
  console.log("✅ Compilation successful");

  // ── 2. Connect ────────────────────────────────────────────────────────────
  const rpcUrl = process.env.VITE_FLARE_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!privateKey) {
    console.error(`
❌  DEPLOYER_PRIVATE_KEY is not set in your .env file.

Add this line to your .env:
    DEPLOYER_PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY_HERE

Your wallet must have C2FLR testnet tokens. Get free tokens at:
    https://faucet.flare.network/

⚠️  NEVER commit your private key to git.
`);
    process.exit(1);
  }

  console.log(`\n🌐 Connecting to Flare Coston2 (${rpcUrl})...`);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const balance = await provider.getBalance(wallet.address);
  const balanceFLR = ethers.formatEther(balance);
  console.log(`👛 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${balanceFLR} C2FLR`);

  if (parseFloat(balanceFLR) < 0.01) {
    console.error(`\n❌ Insufficient balance (${balanceFLR} C2FLR). Get free C2FLR at https://faucet.flare.network/`);
    process.exit(1);
  }

  // ── 3. Deploy ─────────────────────────────────────────────────────────────
  // enclavePublicKey is a placeholder — can be updated later via setEnclavePublicKey()
  const enclavePublicKeyHex = "0x04";

  console.log("\n🚀 Deploying VeriFlowRegistry to Flare Coston2 Testnet...");
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(enclavePublicKeyHex);

  console.log(`⏳ Waiting for deployment confirmation... (tx: ${contract.deploymentTransaction()?.hash})`);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`🎉  VeriFlowRegistry DEPLOYED on Flare Coston2 Testnet!`);
  console.log(`📍  Address  : ${address}`);
  console.log(`🔗  Explorer : https://coston2-explorer.flare.network/address/${address}`);
  console.log(`${"=".repeat(60)}\n`);

  // ── 4. Auto-patch contracts.ts ────────────────────────────────────────────
  const configPath = path.join(__dirname, "../src/config/contracts.ts");
  if (fs.existsSync(configPath)) {
    let content = fs.readFileSync(configPath, "utf8");
    content = content.replace(
      /export const VERIFLOW_REGISTRY_ADDRESS = '.*?';/,
      `export const VERIFLOW_REGISTRY_ADDRESS = '${address}';`
    );
    fs.writeFileSync(configPath, content, "utf8");
    console.log("✅ Updated src/config/contracts.ts");
  }

  // ── 5. Auto-patch .env ────────────────────────────────────────────────────
  const envPath = path.join(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    let env = fs.readFileSync(envPath, "utf8");
    const addrLine = `VITE_REGISTRY_CONTRACT_ADDRESS=${address}`;
    const flareLine = `VITE_FLARE_CONTRACT_ADDRESS=${address}`;
    env = env.replace(/VITE_REGISTRY_CONTRACT_ADDRESS=.*/g, addrLine);
    env = env.replace(/VITE_FLARE_CONTRACT_ADDRESS=.*/g, flareLine);
    fs.writeFileSync(envPath, env, "utf8");
    console.log("✅ Updated .env");
  }

  console.log("\n👉 Next: restart the dev server for the new address to take effect.");
}

main().catch((err) => {
  console.error("\n❌ Deployment failed:", err.shortMessage || err.message || err);
  process.exit(1);
});

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
  console.log("Compiling VeriFlowRegistry.sol with solc...");

  const contractPath = path.join(__dirname, "../contracts/VeriFlowRegistry.sol");
  const sourceCode = fs.readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "VeriFlowRegistry.sol": { content: sourceCode }
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"]
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const fatal = output.errors.filter(e => e.severity === 'error');
    if (fatal.length > 0) {
      console.error("Compilation errors:", fatal);
      process.exit(1);
    }
  }

  const contractOutput = output.contracts["VeriFlowRegistry.sol"]["VeriFlowRegistry"];
  const abi = contractOutput.abi;
  const bytecode = contractOutput.evm.bytecode.object;

  console.log("Connecting to Flare Coston2 Testnet (Chain ID 114)...");
  const rpcUrl = process.env.VITE_FLARE_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const privateKey = process.env.ENCLAVE_SECRET_KEY && process.env.ENCLAVE_SECRET_KEY.startsWith("0x")
    ? process.env.ENCLAVE_SECRET_KEY
    : "0x4e9a2b7c1d0f8e9a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a";

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`Deployer address: ${wallet.address}`);

  const enclavePublicKeyHex = "0x0408a2f7c9e1b3a5d7f9e2b4c6a8d0e2f4a6c8e0b2d4f6a8c0e2f4a6b8d0e2f4a6c8e0b2d4f6a8c0e2f4a6b8d0e2f4a6c8e0b2d4f6a8c0e2f4a6b8d0e2";

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  console.log("Deploying contract to Flare Coston2...");
  const contract = await factory.deploy(enclavePublicKeyHex);

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("\n=======================================================");
  console.log(`🎉 VeriFlowRegistry DEPLOYED ON FLARE COSTON2 TESTNET!`);
  console.log(`Address: ${address}`);
  console.log(`Explorer: https://coston2-explorer.flare.network/address/${address}`);
  console.log("=======================================================\n");

  // Update src/config/contracts.ts
  const configPath = path.join(__dirname, "../src/config/contracts.ts");
  if (fs.existsSync(configPath)) {
    let content = fs.readFileSync(configPath, "utf8");
    content = content.replace(
      /export const VERIFLOW_REGISTRY_ADDRESS = '.*';/,
      `export const VERIFLOW_REGISTRY_ADDRESS = '${address}';`
    );
    fs.writeFileSync(configPath, content, "utf8");
    console.log(`Updated src/config/contracts.ts with deployed address!`);
  }
}

main().catch((err) => {
  console.error("Deployment error:", err);
  process.exit(1);
});

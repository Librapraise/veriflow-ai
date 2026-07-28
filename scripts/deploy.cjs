const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying VeriFlowRegistry smart contract to Flare Coston2 Testnet...");

  const enclavePublicKeyHex = "0x0408a2f7c9e1b3a5d7f9e2b4c6a8d0e2f4a6c8e0b2d4f6a8c0e2f4a6b8d0e2f4a6c8e0b2d4f6a8c0e2f4a6b8d0e2f4a6c8e0b2d4f6a8c0e2f4a6b8d0e2";

  const VeriFlowRegistry = await hre.ethers.getContractFactory("VeriFlowRegistry");
  const registry = await VeriFlowRegistry.deploy(enclavePublicKeyHex);

  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  console.log(`VeriFlowRegistry successfully deployed to Flare Coston2 at: ${contractAddress}`);

  // Update src/config/contracts.ts with the deployed contract address
  const configPath = path.join(__dirname, "../src/config/contracts.ts");
  if (fs.existsSync(configPath)) {
    let content = fs.readFileSync(configPath, "utf8");
    content = content.replace(
      /export const VERIFLOW_REGISTRY_ADDRESS = '.*';/,
      `export const VERIFLOW_REGISTRY_ADDRESS = '${contractAddress}';`
    );
    fs.writeFileSync(configPath, content, "utf8");
    console.log(`Updated src/config/contracts.ts with address: ${contractAddress}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

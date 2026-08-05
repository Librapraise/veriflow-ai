require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    coston2: {
      url: process.env.VITE_FLARE_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc",
      chainId: 114,
      accounts: process.env.ENCLAVE_SECRET_KEY && process.env.ENCLAVE_SECRET_KEY.startsWith("0x")
        ? [process.env.ENCLAVE_SECRET_KEY]
        : [] // Never hardcode a fallback key. Deploy with DEPLOYER_PRIVATE_KEY (see scripts/deployDirect.js).
    }
  }
};

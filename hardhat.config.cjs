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
        : ["0x4e9a2b7c1d0f8e9a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a"]
    }
  }
};

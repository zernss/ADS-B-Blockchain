require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {
      accounts: {
        mnemonic: process.env.SEED_PHRASE || "test test test test test test test test test test test junk",
      },
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    adsb: {
      url: process.env.ADSB_RPC_URL || "http://127.0.0.1:8545",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: parseInt(process.env.CHAIN_ID || "1337"),
    }
  },
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  }
};

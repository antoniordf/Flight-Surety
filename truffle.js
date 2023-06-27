require("dotenv").config();
const { MNEMONIC, PROJECT_ID } = process.env;

const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1", // Localhost (default: none)
      port: 9545, // Standard Ethereum port (default: none)
      network_id: "*", // Any network (default: none)
    },

    ganache: {
      host: "127.0.0.1", // Localhost
      port: 8545, // Port for Ganache GUI
      network_id: "*", // Match any network id
    },

    sepolia: {
      provider: () =>
        new HDWalletProvider({
          mnemonic: {
            phrase: MNEMONIC,
          },
          providerOrUrl: `wss://sepolia.infura.io/v3/${PROJECT_ID}`,
        }),
      network_id: 11155111,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
  },

  compilers: {
    solc: {
      version: "^0.8.19",
    },
  },
};

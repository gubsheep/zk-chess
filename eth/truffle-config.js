const HDWalletProvider = require("@truffle/hdwallet-provider");
require("dotenv").config({ path: `./.env.prod` });

module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchain for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */

  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 5000000,
      gasPrice: 5e9,
    },
    xdai: {
      provider: () =>
        new HDWalletProvider(
          process.env.deployer_mnemonic,
          "https://xdai.poanetwork.dev/"
        ),
      network_id: 100,
      gas: 8000000,
      gasPrice: 1e9,
    },
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.6.7", // Fetch exact version from solc-bin (default: truffle's version)
      settings: {
        // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: false,
          runs: 200,
        },
      },
    },
  },
};

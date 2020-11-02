const util = require("util");
const fs = require("fs");
const rawExec = util.promisify(require("child_process").exec);

const ZKChessGameFactory = artifacts.require("ZKChessGameFactory");

const exec = async (command) => {
  const { error, stdout, stderr } = await rawExec(command);
  console.log(">> ", command);

  if (error) {
    console.error(`{command} failed with error ${error} and stderr ${stderr}.`);
    throw "";
  } else {
    return stdout.trim();
  }
};

module.exports = async function (deployer, network, accounts) {
  const factory = await ZKChessGameFactory.deployed();

  const gameAddr = await factory.gameIdToAddr(69);
  console.log(gameAddr);

  await exec("mkdir -p ../client/src/utils");
  fs.writeFileSync(
    "../client/src/utils/local_contract_addr.ts",
    `export const contractAddress = '${gameAddr}'\n`
  );
  await exec("mkdir -p ../client/public/contracts");
  await exec("cp build/contracts/ZKChessGame.json ../client/public/contracts/");
};

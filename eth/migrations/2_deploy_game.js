const util = require("util");
const fs = require("fs");
const rawExec = util.promisify(require("child_process").exec);

const ZKChessCore = artifacts.require("ZKChessCore");
const Verifier = artifacts.require("Verifier");
const Hasher = artifacts.require("Hasher");
const genContract = require("circomlib/src/mimcsponge_gencontract.js");

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
  const SEED = "mimcsponge";
  Hasher.abi = genContract.abi;
  Hasher.bytecode = genContract.createCode(SEED, 220);
  await deployer.deploy(Hasher);
  await ZKChessCore.link(Hasher, Hasher.address);

  await deployer.deploy(Verifier);
  await ZKChessCore.link(Verifier, Verifier.address);
  const coreContract = await deployer.deploy(ZKChessCore, false);
  console.log("ZKChessCore's address ", coreContract.address);

  await exec("mkdir -p ../client/src/utils");
  fs.writeFileSync(
    "../client/src/utils/local_contract_addr.ts",
    `export const contractAddress = '${coreContract.address}'\n`
  );
  await exec("mkdir -p ../client/public/contracts");
  await exec("cp build/contracts/ZKChessCore.json ../client/public/contracts/");
};

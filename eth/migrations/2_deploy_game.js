const util = require("util");
const fs = require("fs");
const rawExec = util.promisify(require("child_process").exec);

const ZKChessGame = artifacts.require("ZKChessGame");
const ZKChessGameFactory = artifacts.require("ZKChessGameFactory");
const ZKChessUtils = artifacts.require("ZKChessUtils");
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
  const hasher = await Hasher.deployed();
  await ZKChessUtils.link(Hasher, hasher.address);

  await deployer.deploy(ZKChessUtils);
  const zkChessUtils = await ZKChessUtils.deployed();
  await ZKChessGame.link(ZKChessUtils, zkChessUtils.address);

  await deployer.deploy(Verifier);
  const verifier = await Verifier.deployed();
  await ZKChessGame.link(Verifier, verifier.address);

  await deployer.deploy(ZKChessGame);
  const coreContract = await ZKChessGame.deployed();
  await coreContract.initialize(false);
  console.log(`ZKChessGame impl address is ${coreContract.address}`);

  await deployer.deploy(ZKChessGameFactory, coreContract.address);
  const factory = await ZKChessGameFactory.deployed();
  await factory.createGame();
};

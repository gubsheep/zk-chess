const util = require("util");
const fs = require("fs");
const rawExec = util.promisify(require("child_process").exec);

const ZKChessGame = artifacts.require("ZKChessGame");
const ZKChessGameFactory = artifacts.require("ZKChessGameFactory");
const ZKChessInit = artifacts.require("ZKChessInit");
const ZKChessChecks = artifacts.require("ZKChessChecks");
const ZKChessActions = artifacts.require("ZKChessActions");
const Verifier = artifacts.require("Verifier");

const exec = async (command) => {
  const { error, stdout, stderr } = await rawExec(command);
  console.log(">> ", command);

  if (error) {
    console.error(
      `${command} failed with error ${error} and stderr ${stderr}.`
    );
    throw "";
  } else {
    return stdout.trim();
  }
};

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(Verifier);
  const verifier = await Verifier.deployed();
  await ZKChessChecks.link(Verifier, verifier.address);
  await ZKChessActions.link(Verifier, verifier.address);

  await deployer.deploy(ZKChessInit);
  const zkChessInit = await ZKChessInit.deployed();
  await ZKChessGame.link(ZKChessInit, zkChessInit.address);

  await deployer.deploy(ZKChessChecks);
  const zkChessChecks = await ZKChessChecks.deployed();
  await ZKChessGame.link(ZKChessChecks, zkChessChecks.address);

  await deployer.deploy(ZKChessActions);
  const zkChessActions = await ZKChessActions.deployed();
  await ZKChessGame.link(ZKChessActions, zkChessActions.address);

  await deployer.deploy(ZKChessGame);
  const coreContract = await ZKChessGame.deployed();
  console.log(`ZKChessGame impl address is ${coreContract.address}`);

  await deployer.deploy(ZKChessGameFactory, coreContract.address);
  const factory = await ZKChessGameFactory.deployed();
  await factory.createGame(69);
};

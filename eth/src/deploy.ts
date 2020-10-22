import util from "util";
const rawExec = util.promisify(require("child_process").exec);
import fs from "fs";
import readlineSync from "readline-sync";
//@ts-ignore
import HDWalletProvider from "@truffle/hdwallet-provider";

const isProd = process.env.NODE_ENV === "production";

require("dotenv").config({
    path: isProd ? ".env.prod" : ".env.example",
});

enum Network {
    xDAI = "xdai",
    Ropsten = "ropsten",
    Development = "development",
    PersonalGanache = "personalGanache",
}

const NETWORK: Network = process.env.network as Network;
const PROJECT_ID = process.env.project_id;
const DEPLOYER_MNEMONIC = process.env.deployer_mnemonic;
const CORE_CONTROLLER_MNEMONIC = process.env.core_controller_mnemonic;
const OZ_ADMIN_MNEMONIC = process.env.oz_admin_mnemonic;
const DISABLE_ZK_CHECKS =
    process.env.DISABLE_ZK_CHECKS === undefined
        ? undefined
        : process.env.DISABLE_ZK_CHECKS === "true";

if (
    !NETWORK ||
    !PROJECT_ID ||
    !DEPLOYER_MNEMONIC ||
    !CORE_CONTROLLER_MNEMONIC ||
    !OZ_ADMIN_MNEMONIC ||
    DISABLE_ZK_CHECKS === undefined
) {
    console.error("environment variables not found!");
    console.log(NETWORK);
    console.log(PROJECT_ID);
    console.log(DEPLOYER_MNEMONIC);
    console.log(CORE_CONTROLLER_MNEMONIC);
    console.log(OZ_ADMIN_MNEMONIC);
    console.log(DISABLE_ZK_CHECKS);
    throw "";
}

if (DISABLE_ZK_CHECKS) {
    console.log("WARNING: ZK checks disabled.");
}

let network_url = "http://localhost:8545";

if (NETWORK === Network.Ropsten) {
    network_url = `https://ropsten.infura.io/v3/${PROJECT_ID}`;
} else if (NETWORK === Network.xDAI) {
    network_url = "https://dai.poa.network/";
}

const exec = async (command: string) => {
    const { error, stdout, stderr } = await rawExec(command);
    console.log(">> ", command);

    if (error) {
        console.error(
            `{command} failed with error ${error} and stderr ${stderr}.`
        );
        throw "";
    } else {
        return stdout.trim();
    }
};

const run = async () => {
    await exec(`oz compile --optimizer on --no-interactive`);
    console.log("Deploy mnemonics: ", DEPLOYER_MNEMONIC);
    const deployerWallet = new HDWalletProvider(DEPLOYER_MNEMONIC, network_url);
    const coreControllerWallet = new HDWalletProvider(
        CORE_CONTROLLER_MNEMONIC,
        network_url
    );
    const ozAdminWallet = new HDWalletProvider(OZ_ADMIN_MNEMONIC, network_url);
    if (isProd) {
        console.log(`Give some eth to ${deployerWallet.getAddress()}`);
        readlineSync.question("Press enter when you're done.");
    }
    const coreControllerAddress = coreControllerWallet.getAddress();
    const coreContractAddress = await deployCore(coreControllerAddress);
    await exec("mkdir -p ../client/src/utils");
    fs.writeFileSync(
        isProd
            ? "../client/src/utils/prod_contract_addr.ts"
            : "../client/src/utils/local_contract_addr.ts",
        `export const contractAddress = '${coreContractAddress}'`
    );
    await exec("mkdir -p ../client/public/contracts");
    await exec(
        "cp build/contracts/ZKChessCore.json ../client/public/contracts/"
    );

    const ozAdminAddress = ozAdminWallet.getAddress();

    await exec(
        `oz set-admin ${coreControllerAddress} ${ozAdminAddress} --network ${NETWORK} --no-interactive --force`
    );

    console.log("Deploy over. You can quit this process.");
    //process.exit()
};

const deployCore = async (coreControllerAddress: string): Promise<string> => {
    await exec(`oz add ZKChessCore`);
    await exec(`oz push -n ${NETWORK} --no-interactive --reset --force`);
    const dfCoreAddress = await exec(
        `oz deploy ZKChessCore -k upgradeable -n ${NETWORK} --no-interactive`
    );
    await exec(
        `oz send-tx -n ${NETWORK} --to ${dfCoreAddress} --method initialize --args ${coreControllerAddress},${DISABLE_ZK_CHECKS} --no-interactive`
    );
    console.log(`DFCore deployed to ${dfCoreAddress}.`);
    return dfCoreAddress;
};

run();

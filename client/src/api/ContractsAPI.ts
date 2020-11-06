//import * as EventEmitter from 'events';
import {EventEmitter} from 'events';
import {
  ChessGameContractData,
  ContractGhost,
  EthAddress,
  Objective,
  Piece,
} from '../_types/global/GlobalTypes';
// NOTE: DO NOT IMPORT FROM ETHERS SUBPATHS. see https://github.com/ethers-io/ethers.js/issues/349 (these imports trip up webpack)
// in particular, the below is bad!
// import {TransactionReceipt, Provider, TransactionResponse, Web3Provider} from "ethers/providers";
import {Contract, providers, BigNumber as EthersBN} from 'ethers';
import _ from 'lodash';

import {address, emptyAddress} from '../utils/CheckedTypeUtils';
import {
  TxIntent,
  ContractsAPIEvent,
  SubmittedTx,
  ContractEvent,
  RawPiece,
  RawObjective,
  UnsubmittedMove,
  UnsubmittedJoin,
  UnsubmittedGhostAttack,
  GhostMoveArgs,
  UnsubmittedGhostMove,
  UnsubmittedCreateGame,
  UnsubmittedAction,
} from '../_types/darkforest/api/ContractsAPITypes';
import EthereumAccountManager from './EthereumAccountManager';
import mimcHash from '../hash/mimc';

type QueuedTxRequest = {
  actionId: string;
  contract: Contract;
  method: string; // make this an enum

  /* eslint-disable @typescript-eslint/no-explicit-any */
  args: any[];
  overrides: providers.TransactionRequest;
};

class TxExecutor extends EventEmitter {
  private txRequests: QueuedTxRequest[];
  private pendingExec: boolean;
  private nonce: number;
  private nonceLastUpdated: number;

  constructor(nonce: number) {
    super();

    this.txRequests = [];
    this.pendingExec = false;
    this.nonce = nonce;
    this.nonceLastUpdated = Date.now();
  }

  makeRequest(
    txRequest: QueuedTxRequest
  ): Promise<providers.TransactionResponse> {
    this.txRequests.push(txRequest);
    if (!this.pendingExec) {
      const toExec = this.txRequests.shift();
      if (toExec) this.execute(toExec);
    }
    return new Promise<providers.TransactionResponse>((resolve, reject) => {
      this.once(
        txRequest.actionId,
        (res: providers.TransactionResponse, e: Error) => {
          if (res) {
            resolve(res);
          } else {
            reject(e);
          }
        }
      );
    });
  }

  async execute(txRequest: QueuedTxRequest) {
    this.pendingExec = true;
    try {
      console.log('executing tx');
      // check if balance too low
      const ethConnection = EthereumAccountManager.getInstance();
      const balance = await ethConnection.getBalance(
        ethConnection.getAddress()
      );
      /*
      if (balance < 0.002) {
        throw new Error('xDAI balance too low!');
      }
      */

      if (Date.now() - this.nonceLastUpdated > 30000) {
        this.nonce = await EthereumAccountManager.getInstance().getNonce();
      }
      // await this.popupConfirmationWindow(txRequest);
      try {
        const res = await txRequest.contract[txRequest.method](
          ...txRequest.args,
          {
            ...txRequest.overrides,
            nonce: this.nonce,
          }
        );
        this.nonce += 1;
        this.nonceLastUpdated = Date.now();
        this.emit(txRequest.actionId, res);
      } catch (e) {
        console.error('error while submitting tx:');
        console.error(e);
        throw e;
      }
    } catch (e) {
      this.emit(txRequest.actionId, undefined, e);
    }
    this.pendingExec = false;
    const next = this.txRequests.shift();
    if (next) {
      this.execute(next);
    }
  }
}

class ContractsAPI extends EventEmitter {
  readonly account: EthAddress;
  private factoryContract: Contract;
  private gameContract: Contract | null;
  private readonly txRequestExecutor: TxExecutor;
  private unminedTxs: Map<string, TxIntent>;

  private constructor(
    account: EthAddress,
    factoryContract: Contract,
    nonce: number
  ) {
    super();
    this.account = account;
    this.factoryContract = factoryContract;
    this.gameContract = null;
    this.txRequestExecutor = new TxExecutor(nonce);
    this.unminedTxs = new Map<string, TxIntent>();
  }

  static async create(): Promise<ContractsAPI> {
    const ethConnection = EthereumAccountManager.getInstance();
    const factoryContract: Contract = await ethConnection.loadFactoryContract();

    const account: EthAddress = ethConnection.getAddress();
    const nonce: number = await ethConnection.getNonce();

    const contractsAPI: ContractsAPI = new ContractsAPI(
      account,
      factoryContract,
      nonce
    );
    ethConnection.on('ChangedRPCEndpoint', async () => {
      contractsAPI.factoryContract = await ethConnection.loadFactoryContract();
      if (contractsAPI.gameContract) {
        const gameAddress = contractsAPI.gameContract.address;
        contractsAPI.gameContract = await ethConnection.loadGameContract(
          gameAddress
        );
      }
    });

    factoryContract.on(
      ContractEvent.CreatedGame,
      async (rawGameId: EthersBN) => {
        contractsAPI.emit(ContractsAPIEvent.CreatedGame, rawGameId.toNumber());
      }
    );

    return contractsAPI;
  }

  destroy(): void {
    this.removeGameContractListeners();
    this.factoryContract.removeAllListeners();
  }

  private setupGameContractListeners(): void {
    if (this.gameContract) {
      this.gameContract.on(ContractEvent.GameStart, () => {
        this.emit(ContractsAPIEvent.GameStart);
      });
      this.gameContract.on(ContractEvent.MoveMade, () => {
        this.emit(ContractsAPIEvent.MoveMade);
      });
      this.gameContract.on(ContractEvent.GameFinished, () => {
        this.emit(ContractsAPIEvent.GameFinished);
      });
    }
  }

  removeGameContractListeners(): void {
    if (this.gameContract) {
      this.gameContract.removeAllListeners();
    }
  }

  public getGameAddress(): EthAddress | null {
    if (this.gameContract) {
      return address(this.gameContract.address);
    }
    return null;
  }

  public getFactoryAddress(): EthAddress {
    return address(this.factoryContract.address);
  }

  public onTxInit(unminedTx: TxIntent): void {
    this.unminedTxs.set(unminedTx.txIntentId, unminedTx);
    this.emit(ContractsAPIEvent.TxInitialized, unminedTx);
  }

  public onTxSubmit(action: TxIntent, txHash: string): void {
    const unminedTx = {
      ...action,
      txHash,
      sentAtTimestamp: Math.floor(Date.now() / 1000),
    };
    // TODO encapsulate this into terminalemitter
    this.unminedTxs.set(unminedTx.txIntentId, unminedTx);
    this.emit(ContractsAPIEvent.TxSubmitted, unminedTx);
    EthereumAccountManager.getInstance()
      .waitForTransaction(unminedTx.txHash)
      .then((receipt) => {
        this.onTxConfirmation(unminedTx, receipt.status === 1);
      });
  }

  private onTxConfirmation(unminedTx: SubmittedTx, success: boolean) {
    this.unminedTxs.delete(unminedTx.txIntentId);
    if (success) this.emit(ContractsAPIEvent.TxConfirmed, unminedTx);
    else this.emit(ContractsAPIEvent.TxFailed, new Error('tx reverted'));
  }

  public async getAllGameIds(): Promise<string[]> {
    const factory = this.factoryContract;
    return (await factory.getAllGameIds()).map((id: EthersBN) => id.toString());
  }

  public async getGameState(): Promise<ChessGameContractData> {
    const contract = this.gameContract;
    if (!contract) {
      throw new Error('no contract set');
    }
    const gameId = (await contract.gameId()).toNumber();
    const player1Addr = address(await contract.player1());
    const player2Addr = address(await contract.player2());
    const rawPieces: RawPiece[] = await contract.getPieces();
    const rawObjectives: RawObjective[] = await contract.getObjectives();
    const turnNumber = await contract.turnNumber();
    const gameState = await contract.gameState();

    const pieces: Piece[] = [];
    let myContractGhost: ContractGhost = {
      id: -1,
      owner: null,
      commitment: mimcHash(3, 3, '0').toString(),
    }; // dummy value
    for (const rawPiece of rawPieces) {
      const piece = this.rawPieceToPiece(rawPiece);
      if (piece) {
        pieces.push(piece);
      } else {
        // is a ghost
        if (address(rawPiece[2]) === this.account) {
          // my ghost
          myContractGhost = {
            id: rawPiece[0],
            owner: address(rawPiece[2]),
            commitment: rawPiece[6].toString(),
          };
        }
      }
    }

    const objectives = [];
    for (const rawObjective of rawObjectives) {
      const objective = this.rawObjectiveToPiece(rawObjective);
      objectives.push(objective);
    }

    return {
      gameAddress: address(contract.address),
      gameId,
      myAddress: this.account,
      player1: {address: player1Addr},
      player2: {address: player2Addr},
      pieces,
      turnNumber,
      gameStatus: gameState,
      myContractGhost,
      objectives,
    };
  }

  public async setGame(gameId: string): Promise<void> {
    const ethConnection = EthereumAccountManager.getInstance();
    const contract = this.factoryContract;
    const gameAddr = address(await contract.gameIdToAddr(gameId));
    if (gameAddr === emptyAddress) {
      throw new Error('not a valid game');
    }
    const gameContract: Contract = await ethConnection.loadGameContract(
      gameAddr
    );
    this.removeGameContractListeners();
    this.gameContract = gameContract;
    this.setupGameContractListeners();
  }

  public async createGame(
    action: UnsubmittedCreateGame
  ): Promise<providers.TransactionReceipt> {
    const overrides: providers.TransactionRequest = {
      gasPrice: 1000000000,
      gasLimit: 2000000,
    };
    console.log('creating game');
    const tx: providers.TransactionResponse = await this.txRequestExecutor.makeRequest(
      {
        actionId: action.txIntentId,
        contract: this.factoryContract,
        method: 'createGame',
        args: [action.gameId],
        overrides,
      }
    );

    if (tx.hash) {
      this.onTxSubmit(action, tx.hash);
    }
    return tx.wait();
  }

  public async joinGame(
    action: UnsubmittedJoin
  ): Promise<providers.TransactionReceipt> {
    if (!this.gameContract) {
      throw new Error('no game contract set');
    }
    const overrides: providers.TransactionRequest = {
      gasPrice: 1000000000,
      gasLimit: 2000000,
    };
    const tx: providers.TransactionResponse = await this.txRequestExecutor.makeRequest(
      {
        actionId: action.txIntentId,
        contract: this.gameContract,
        method: 'joinGame',
        args: [],
        overrides,
      }
    );

    if (tx.hash) {
      this.onTxSubmit(action, tx.hash);
    }
    return tx.wait();
  }

  public async doAction(
    action: UnsubmittedAction
  ): Promise<providers.TransactionReceipt> {
    if (!this.gameContract) {
      throw new Error('no game contract set');
    }
    const overrides: providers.TransactionRequest = {
      gasPrice: 1000000000,
      gasLimit: 2000000,
    };
    const tx: providers.TransactionResponse = await this.txRequestExecutor.makeRequest(
      {
        actionId: action.txIntentId,
        contract: this.gameContract,
        method: 'act',
        args: [
          [
            action.pieceId,
            action.doesMove,
            action.moveToRow,
            action.moveToCol,
            action.doesAttack,
            action.attackRow,
            action.attackCol,
            action.moveZkp,
            action.attackZkp,
          ],
        ],
        overrides,
      }
    );

    if (tx.hash) {
      this.onTxSubmit(action, tx.hash);
    }
    return tx.wait();
  }

  /*
  public async ghostAttack(
    action: UnsubmittedGhostAttack
  ): Promise<providers.TransactionReceipt> {
    if (!this.gameContract) {
      throw new Error('no game contract set');
    }
    const overrides: providers.TransactionRequest = {
      gasPrice: 1000000000,
      gasLimit: 2000000,
    };
    const tx: providers.TransactionResponse = await this.txRequestExecutor.makeRequest(
      {
        actionId: action.txIntentId,
        contract: this.gameContract,
        method: 'ghostAttack',
        args: [
          action.pieceId.toString(),
          action.at[1].toString(),
          action.at[0].toString(),
          action.salt,
        ],
        overrides,
      }
    );

    if (tx.hash) {
      this.onTxSubmit(action, tx.hash);
    }
    return tx.wait();
  }

  public async moveGhost(args: GhostMoveArgs, action: UnsubmittedGhostMove) {
    if (!this.gameContract) {
      throw new Error('no game contract set');
    }
    const overrides: providers.TransactionRequest = {
      gasPrice: 1000000000,
      gasLimit: 2000000,
    };

    const tx: providers.TransactionResponse = await this.txRequestExecutor.makeRequest(
      {
        actionId: action.txIntentId,
        contract: this.gameContract,
        method: 'moveGhost',
        args: [...args, action.pieceId.toString()],
        overrides,
      }
    );

    if (tx.hash) {
      this.onTxSubmit(action, tx.hash);
    }
    return tx.wait();
  }
  */

  private rawPieceToPiece(rawPiece: RawPiece): Piece | null {
    // returns null if ghost
    if (rawPiece[1] === 2) {
      // this is a ghost
      return null;
    }
    let owner: EthAddress | null = address(rawPiece[2]);
    if (owner === emptyAddress) {
      owner = null;
    }
    return {
      id: rawPiece[0],
      owner,
      location: [rawPiece[4], rawPiece[3]],
      pieceType: rawPiece[1],
      captured: !rawPiece[5],
    };
  }

  private rawObjectiveToPiece(rawObjective: RawObjective): Objective {
    let owner: EthAddress | null = address(rawObjective[4]);
    if (owner === emptyAddress) {
      owner = null;
    }
    return {
      id: rawObjective[0],
      owner,
      location: [rawObjective[3], rawObjective[2]],
      value: rawObjective[1],
    };
  }
}

export default ContractsAPI;

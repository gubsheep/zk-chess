//import * as EventEmitter from 'events';
import {EventEmitter} from 'events';
import {
  ChessGameContractData,
  EthAddress,
  PieceType,
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
  UnsubmittedJoin,
  UnsubmittedCreateGame,
  UnsubmittedMove,
  UnsubmittedEndTurn,
  UnsubmittedSummon,
} from '../_types/darkforest/api/ContractsAPITypes';
import EthereumAccountManager from './EthereumAccountManager';

type QueuedTxRequest = {
  txIntentId: string;
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
        txRequest.txIntentId,
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
        this.emit(txRequest.txIntentId, res);
      } catch (e) {
        // TODO increment nonce if this is a revert
        // don't increment if tx wasn't mined
        console.error('error while submitting tx:');
        console.error(e);
        throw e;
      }
    } catch (e) {
      this.emit(txRequest.txIntentId, undefined, e);
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
      this.gameContract.on(ContractEvent.ActionMade, () => {
        this.emit(ContractsAPIEvent.ActionMade);
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
    const turnNumber = await contract.turnNumber();
    const gameState = await contract.gameState();

    const pieces: Piece[] = [];
    for (const rawPiece of rawPieces) {
      const piece = this.rawPieceToPiece(rawPiece);
      console.log(rawPiece);
      pieces.push(piece);
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
        txIntentId: action.txIntentId,
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
        txIntentId: action.txIntentId,
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

  public async doSummon(
    action: UnsubmittedSummon
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
        txIntentId: action.txIntentId,
        contract: this.gameContract,
        method: 'doSummon',
        args: [
          [
            action.turnNumber,
            action.pieceId,
            action.pieceType,
            action.isZk ? 0 : action.row,
            action.isZk ? 0 : action.col,
            await action.zkp,
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

  public async doMove(
    action: UnsubmittedMove
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
        txIntentId: action.txIntentId,
        contract: this.gameContract,
        method: 'doMove',
        args: [
          [
            action.turnNumber,
            action.pieceId,
            action.isZk ? [] : action.moveToRow,
            action.isZk ? [] : action.moveToCol,
            await action.zkp,
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

  public async endTurn(
    action: UnsubmittedEndTurn
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
        txIntentId: action.txIntentId,
        contract: this.gameContract,
        method: 'endTurn',
        args: [action.turnNumber],
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
  */

  private rawPieceToPiece(rawPiece: RawPiece): Piece {
    let owner: EthAddress | null = address(rawPiece[2]);
    if (owner === emptyAddress) {
      owner = null;
    }
    const pieceType = rawPiece[1];
    if (pieceType === PieceType.Ghost) {
      // return a ZKPiece that is not Locatable
      return {
        id: rawPiece[0],
        owner,
        pieceType,
        alive: rawPiece[5],
        commitment: rawPiece[6].toString(),
      };
    } else {
      return {
        id: rawPiece[0],
        owner,
        pieceType,
        alive: rawPiece[5],
        location: [rawPiece[4], rawPiece[3]],
      };
    }
  }
}

export default ContractsAPI;

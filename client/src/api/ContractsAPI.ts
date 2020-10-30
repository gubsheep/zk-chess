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
import {Contract, providers} from 'ethers';
import _ from 'lodash';

import {address, emptyAddress} from '../utils/CheckedTypeUtils';
import {
  UnsubmittedAction,
  ContractsAPIEvent,
  SubmittedTx,
  ContractEvent,
  ProofArgs,
  RawPiece,
  RawObjective,
  UnsubmittedMove,
  UnsubmittedProve,
  UnsubmittedJoin,
  UnsubmittedGhostAttack,
  GhostMoveArgs,
  UnsubmittedGhostMove,
} from '../_types/darkforest/api/ContractsAPITypes';
import EthereumAccountManager from './EthereumAccountManager';

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
  private coreContract: Contract;
  private readonly txRequestExecutor: TxExecutor;
  private unminedTxs: Map<string, UnsubmittedAction>;

  private constructor(
    account: EthAddress,
    coreContract: Contract,
    nonce: number
  ) {
    super();
    this.account = account;
    this.coreContract = coreContract;
    this.txRequestExecutor = new TxExecutor(nonce);
    this.unminedTxs = new Map<string, UnsubmittedAction>();
  }

  static async create(): Promise<ContractsAPI> {
    const ethConnection = EthereumAccountManager.getInstance();
    const contract: Contract = await ethConnection.loadCoreContract();

    const account: EthAddress = ethConnection.getAddress();
    const nonce: number = await ethConnection.getNonce();

    const contractsAPI: ContractsAPI = new ContractsAPI(
      account,
      contract,
      nonce
    );
    ethConnection.on('ChangedRPCEndpoint', async () => {
      contractsAPI.coreContract = await ethConnection.loadCoreContract();
    });
    contractsAPI.setupContractEventListeners();

    return contractsAPI;
  }

  destroy(): void {
    this.removeEventListeners();
  }

  private setupContractEventListeners(): void {
    this.coreContract.on(
      ContractEvent.ProofVerified,
      async (pfsVerified, _: Event) => {
        console.log(pfsVerified);
        this.emit(ContractsAPIEvent.ProofVerified);
      }
    );
    this.coreContract.on(ContractEvent.GameStart, () => {
      this.emit(ContractsAPIEvent.GameStart);
    });
    this.coreContract.on(ContractEvent.MoveMade, () => {
      this.emit(ContractsAPIEvent.MoveMade);
    });
    this.coreContract.on(ContractEvent.GameFinished, () => {
      this.emit(ContractsAPIEvent.GameFinished);
    });
  }

  removeEventListeners(): void {
    this.coreContract.removeAllListeners(ContractEvent.ProofVerified);
  }

  public getContractAddress(): EthAddress {
    return address(this.coreContract.address);
  }

  public onTxInit(unminedTx: UnsubmittedAction): void {
    this.unminedTxs.set(unminedTx.actionId, unminedTx);
    this.emit(ContractsAPIEvent.TxInitialized, unminedTx);
  }

  public onTxSubmit(action: UnsubmittedAction, txHash: string): void {
    const unminedTx = {
      ...action,
      txHash,
      sentAtTimestamp: Math.floor(Date.now() / 1000),
    };
    // TODO encapsulate this into terminalemitter
    this.unminedTxs.set(unminedTx.actionId, unminedTx);
    this.emit(ContractsAPIEvent.TxSubmitted, unminedTx);
    EthereumAccountManager.getInstance()
      .waitForTransaction(unminedTx.txHash)
      .then((receipt) => {
        this.onTxConfirmation(unminedTx, receipt.status === 1);
      });
  }

  private onTxConfirmation(unminedTx: SubmittedTx, success: boolean) {
    this.unminedTxs.delete(unminedTx.actionId);
    if (success) this.emit(ContractsAPIEvent.TxConfirmed, unminedTx);
    else this.emit(ContractsAPIEvent.TxFailed, new Error('tx reverted'));
  }

  public async getGameState(): Promise<ChessGameContractData> {
    const contract = this.coreContract;
    const player1Addr = address(await contract.player1());
    const player2Addr = address(await contract.player2());
    const rawPieces: RawPiece[] = await contract.getPieces();
    const rawObjectives: RawObjective[] = await contract.getObjectives();
    const turnNumber = await contract.turnNumber();
    const gameState = await contract.gameState();

    const player1pieces: Piece[] = [];
    const player2pieces: Piece[] = [];
    let myContractGhost: ContractGhost = {
      id: -1,
      owner: null,
      commitment: '',
    }; // dummy value
    for (const rawPiece of rawPieces) {
      const piece = this.rawPieceToPiece(rawPiece);
      if (piece) {
        if (piece.owner === player1Addr) {
          player1pieces.push(piece);
        } else if (piece.owner === player2Addr) {
          player2pieces.push(piece);
        }
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
      myAddress: this.account,
      player1: {address: player1Addr},
      player2: {address: player2Addr},
      player1pieces,
      player2pieces,
      turnNumber,
      gameStatus: gameState,
      myContractGhost,
      objectives,
    };
  }

  public async joinGame(
    action: UnsubmittedJoin
  ): Promise<providers.TransactionReceipt> {
    const overrides: providers.TransactionRequest = {
      gasPrice: 1000000000,
      gasLimit: 2000000,
    };
    const tx: providers.TransactionResponse = await this.txRequestExecutor.makeRequest(
      {
        actionId: action.actionId,
        contract: this.coreContract,
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

  public async movePiece(
    pieceId: number,
    toRow: number,
    toCol: number,
    action: UnsubmittedMove
  ): Promise<providers.TransactionReceipt> {
    const overrides: providers.TransactionRequest = {
      gasPrice: 1000000000,
      gasLimit: 2000000,
    };
    const tx: providers.TransactionResponse = await this.txRequestExecutor.makeRequest(
      {
        actionId: action.actionId,
        contract: this.coreContract,
        method: 'movePiece',
        args: [pieceId.toString(), toRow.toString(), toCol.toString()],
        overrides,
      }
    );

    if (tx.hash) {
      this.onTxSubmit(action, tx.hash);
    }
    return tx.wait();
  }

  public async ghostAttack(
    pieceId: number,
    row: number,
    col: number,
    salt: string,
    action: UnsubmittedGhostAttack
  ): Promise<providers.TransactionReceipt> {
    console.log(row, col, salt);
    const overrides: providers.TransactionRequest = {
      gasPrice: 1000000000,
      gasLimit: 2000000,
    };
    const tx: providers.TransactionResponse = await this.txRequestExecutor.makeRequest(
      {
        actionId: action.actionId,
        contract: this.coreContract,
        method: 'ghostAttack',
        args: [pieceId.toString(), row.toString(), col.toString(), salt],
        overrides,
      }
    );

    if (tx.hash) {
      this.onTxSubmit(action, tx.hash);
    }
    return tx.wait();
  }

  public async moveGhost(
    args: GhostMoveArgs,
    pieceId: number,
    action: UnsubmittedGhostMove
  ) {
    const overrides: providers.TransactionRequest = {
      gasPrice: 1000000000,
      gasLimit: 2000000,
    };

    const tx: providers.TransactionResponse = await this.txRequestExecutor.makeRequest(
      {
        actionId: action.actionId,
        contract: this.coreContract,
        method: 'moveGhost',
        args: [...args, pieceId],
        overrides,
      }
    );

    if (tx.hash) {
      this.onTxSubmit(action, tx.hash);
    }
    return tx.wait();
  }

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
      captured: rawPiece[5],
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

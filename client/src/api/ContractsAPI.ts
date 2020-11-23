//import * as EventEmitter from 'events';
import {EventEmitter} from 'events';
import {
  ChessGameContractData,
  EthAddress,
  PieceType,
  ContractPiece,
  PieceStatDefaults,
  Objective,
  CardPrototype,
  GameStatus,
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
  RawDefaults,
  UnsubmittedAttack,
  RawObjective,
  RawGameInfo,
  GameMetadata,
  RawGameMetadata,
  RawCardPrototype,
  UnsubmittedCardDraw,
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
    return new Promise<providers.TransactionResponse>((resolve, reject) => {
      setTimeout(() => {
        reject('tx submission timed out');
      }, 10000);
      this.txRequests.push(txRequest);
      if (!this.pendingExec) {
        const toExec = this.txRequests.shift();
        if (toExec) this.execute(toExec);
      }
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

      if (Date.now() - this.nonceLastUpdated > 10000) {
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
  private cachedStatDefaults: Record<PieceType, PieceStatDefaults> | null;
  private cachedObjectives: Objective[] | null;
  private cachedCardPrototypes: CardPrototype[] | null;
  private cachedGameMetadata: GameMetadata | null;

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
    this.cachedStatDefaults = null;
    this.cachedObjectives = null;
    this.cachedGameMetadata = null;
    this.cachedCardPrototypes = null;
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
      this.gameContract.on(ContractEvent.DidCardDraw, (...args) => {
        this.emit(ContractsAPIEvent.DidCardDraw, ...args);
      });
      this.gameContract.on(ContractEvent.DidSummon, (...args) => {
        this.emit(ContractsAPIEvent.DidSummon, ...args);
      });
      this.gameContract.on(ContractEvent.DidMove, (...args) => {
        this.emit(ContractsAPIEvent.DidMove, ...args);
      });
      this.gameContract.on(ContractEvent.DidAttack, (...args) => {
        this.emit(ContractsAPIEvent.DidAttack, ...args);
      });
      this.gameContract.on(ContractEvent.DidEndTurn, (...args) => {
        this.emit(ContractsAPIEvent.DidEndTurn, ...args);
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
    // TODO: Throw error if txs time out
    this.unminedTxs.set(unminedTx.txIntentId, unminedTx);
    this.emit(ContractsAPIEvent.TxSubmitted, unminedTx);
    EthereumAccountManager.getInstance()
      .waitForTransaction(unminedTx.txHash)
      .then((receipt) => {
        this.onTxConfirmation(unminedTx, receipt.status === 1);
      });
  }

  public onTxSubmitFail(action: TxIntent, error: Error) {
    this.emit(ContractsAPIEvent.TxSubmitFailed, action, error);
  }

  private onTxConfirmation(submittedTx: SubmittedTx, success: boolean) {
    this.unminedTxs.delete(submittedTx.txIntentId);
    if (success) this.emit(ContractsAPIEvent.TxConfirmed, submittedTx);
    else
      this.emit(
        ContractsAPIEvent.TxReverted,
        submittedTx,
        new Error('tx reverted')
      );
  }

  public async getAllGameIds(): Promise<string[]> {
    const factory = this.factoryContract;
    return (await factory.getAllGameIds()).map((id: EthersBN) => id.toString());
  }

  public async getGameState(): Promise<ChessGameContractData> {
    // console.log('getting game state from contract');
    const contract = this.gameContract;
    if (!contract) {
      throw new Error('no contract set');
    }
    const gameInfo: RawGameInfo = await contract.getInfo();

    const turnNumber = gameInfo[0];
    const sequenceNumber = gameInfo[1];
    const gameState = gameInfo[2];
    const player1Mana = gameInfo[3];
    const player2Mana = gameInfo[4];
    const player1HasDrawn = gameInfo[5];
    const player2HasDrawn = gameInfo[6];
    const player1HandCommit = gameInfo[7].toString();
    const player2HandCommit = gameInfo[8].toString();
    const lastTurnTimestamp = gameInfo[9].toNumber();

    const rawPieces: RawPiece[] = await contract.getPieces();
    const pieces: ContractPiece[] = rawPieces.map(this.rawPieceToPiece);

    if (
      !this.cachedGameMetadata ||
      gameState === GameStatus.WAITING_FOR_PLAYERS ||
      address(this.cachedGameMetadata.player2) === emptyAddress
    ) {
      // we don't yet have 2 players / game hasn't started
      const rawMetadata: RawGameMetadata = await contract.getMetadata();
      this.cachedGameMetadata = {
        gameId: rawMetadata[0].toString(),
        NROWS: rawMetadata[1],
        NCOLS: rawMetadata[2],
        player1: address(rawMetadata[3]),
        player2: address(rawMetadata[4]),
        player1SeedCommit: rawMetadata[5].toString(),
        player2SeedCommit: rawMetadata[6].toString(),
      };
    }

    if (!this.cachedCardPrototypes) {
      const rawCards: RawCardPrototype[] = await contract.getCards();
      this.cachedCardPrototypes = rawCards.map((rawCard) => ({
        id: rawCard[0],
        atkBuff: rawCard[1],
        damage: rawCard[2],
        heal: rawCard[3],
      }));
    }

    if (!this.cachedObjectives) {
      const rawObjectives: RawObjective[] = await contract.getObjectives();
      this.cachedObjectives = rawObjectives.map(this.rawObjectiveToObjective);
    }

    if (!this.cachedStatDefaults) {
      const rawDefaults: RawDefaults[] = await contract.getDefaults();
      // TODO these names suck
      const defaultsRaw: Partial<Record<PieceType, PieceStatDefaults>> = {};
      for (const rawDefault of rawDefaults) {
        const defStats = this.rawDefaultToDefault(rawDefault);
        defaultsRaw[defStats.pieceType] = defStats;
      }

      this.cachedStatDefaults = defaultsRaw as Record<
        PieceType,
        PieceStatDefaults
      >;
    }

    return {
      gameAddress: address(contract.address),
      gameId: this.cachedGameMetadata.gameId,
      nRows: this.cachedGameMetadata.NROWS,
      nCols: this.cachedGameMetadata.NCOLS,
      myAddress: this.account,
      player1: {address: this.cachedGameMetadata.player1},
      player2: {address: this.cachedGameMetadata.player2},
      player1Mana,
      player2Mana,
      player1HasDrawn,
      player2HasDrawn,
      player1HandCommit,
      player2HandCommit,
      pieces,
      cardPrototypes: this.cachedCardPrototypes,
      objectives: this.cachedObjectives,
      defaults: this.cachedStatDefaults,
      turnNumber,
      sequenceNumber,
      gameStatus: gameState,
      lastTurnTimestamp,
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
    this.cachedObjectives = null;
    this.cachedStatDefaults = null;
    this.cachedGameMetadata = null;
    this.removeGameContractListeners();
    this.gameContract = gameContract;
    this.setupGameContractListeners();
    this.unminedTxs = new Map<string, TxIntent>();
  }

  public async createGame(
    action: UnsubmittedCreateGame
  ): Promise<providers.TransactionReceipt> {
    try {
      const overrides: providers.TransactionRequest = {
        gasPrice: 1000000000,
        gasLimit: 2000000,
      };
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
    } catch (e) {
      this.onTxSubmitFail(action, e);
      throw e;
    }
  }

  public async joinGame(
    action: UnsubmittedJoin
  ): Promise<providers.TransactionReceipt> {
    if (!this.gameContract) {
      throw new Error('no game contract set');
    }
    try {
      const overrides: providers.TransactionRequest = {
        gasPrice: 1000000000,
        gasLimit: 2000000,
      };
      const tx: providers.TransactionResponse = await this.txRequestExecutor.makeRequest(
        {
          txIntentId: action.txIntentId,
          contract: this.gameContract,
          method: 'joinGame',
          args: [action.seedCommit],
          overrides,
        }
      );

      if (tx.hash) {
        this.onTxSubmit(action, tx.hash);
      }
      return tx.wait();
    } catch (e) {
      this.onTxSubmitFail(action, e);
      throw e;
    }
  }

  public async doCardDraw(
    action: UnsubmittedCardDraw
  ): Promise<providers.TransactionReceipt> {
    if (!this.gameContract) {
      throw new Error('no game contract set');
    }
    try {
      const overrides: providers.TransactionRequest = {
        gasPrice: 1000000000,
        gasLimit: 2000000,
      };
      const tx: providers.TransactionResponse = await this.txRequestExecutor.makeRequest(
        {
          txIntentId: action.txIntentId,
          contract: this.gameContract,
          method: 'doCardDraw',
          args: [[action.turnNumber, action.sequenceNumber, await action.zkp]],
          overrides,
        }
      );

      if (tx.hash) {
        this.onTxSubmit(action, tx.hash);
      }
      return tx.wait();
    } catch (e) {
      this.onTxSubmitFail(action, e);
      throw e;
    }
  }

  public async doSummon(
    action: UnsubmittedSummon
  ): Promise<providers.TransactionReceipt> {
    if (!this.gameContract) {
      throw new Error('no game contract set');
    }
    try {
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
              action.sequenceNumber,
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
    } catch (e) {
      this.onTxSubmitFail(action, e);
      throw e;
    }
  }

  public async doMove(
    action: UnsubmittedMove
  ): Promise<providers.TransactionReceipt> {
    if (!this.gameContract) {
      throw new Error('no game contract set');
    }
    try {
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
              action.sequenceNumber,
              action.pieceId,
              action.isZk ? [] : action.moveToRow,
              action.isZk ? [] : action.moveToCol,
              // TODO: this is bad, because if an action is fired while this is awaiting
              // then the later action will end up getting executed first
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
    } catch (e) {
      this.onTxSubmitFail(action, e);
      throw e;
    }
  }

  public async doAttack(
    action: UnsubmittedAttack
  ): Promise<providers.TransactionReceipt> {
    if (!this.gameContract) {
      throw new Error('no game contract set');
    }
    try {
      const overrides: providers.TransactionRequest = {
        gasPrice: 1000000000,
        gasLimit: 2000000,
      };
      const tx: providers.TransactionResponse = await this.txRequestExecutor.makeRequest(
        {
          txIntentId: action.txIntentId,
          contract: this.gameContract,
          method: 'doAttack',
          args: [
            [
              action.turnNumber,
              action.sequenceNumber,
              action.pieceId,
              action.attackedId,
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
    } catch (e) {
      this.onTxSubmitFail(action, e);
      throw e;
    }
  }

  public async endTurn(
    action: UnsubmittedEndTurn
  ): Promise<providers.TransactionReceipt> {
    if (!this.gameContract) {
      throw new Error('no game contract set');
    }
    try {
      const overrides: providers.TransactionRequest = {
        gasPrice: 1000000000,
        gasLimit: 2000000,
      };
      const tx: providers.TransactionResponse = await this.txRequestExecutor.makeRequest(
        {
          txIntentId: action.txIntentId,
          contract: this.gameContract,
          method: 'endTurn',
          args: [action.turnNumber, action.sequenceNumber],
          overrides,
        }
      );

      if (tx.hash) {
        this.onTxSubmit(action, tx.hash);
      }
      return tx.wait();
    } catch (e) {
      this.onTxSubmitFail(action, e);
      throw e;
    }
  }

  private rawPieceToPiece(rawPiece: RawPiece): ContractPiece {
    let owner: EthAddress | null = address(rawPiece[2]);
    if (owner === emptyAddress) {
      owner = null;
    }
    const pieceType = rawPiece[1];
    if (pieceType === PieceType.Submarine_04) {
      // return a ZKPiece that is not Locatable
      return {
        id: rawPiece[0],
        owner,
        pieceType,
        alive: rawPiece[5],
        commitment: rawPiece[9].toString(),
        hp: rawPiece[7],
        atk: rawPiece[8],
        lastMove: rawPiece[10],
        lastAttack: rawPiece[11],
      };
    } else {
      return {
        id: rawPiece[0],
        owner,
        pieceType,
        alive: rawPiece[5],
        location: [rawPiece[4], rawPiece[3]],
        hp: rawPiece[7],
        atk: rawPiece[8],
        lastMove: rawPiece[10],
        lastAttack: rawPiece[11],
      };
    }
  }

  private rawObjectiveToObjective(rawObjective: RawObjective): Objective {
    return {location: [rawObjective[1], rawObjective[0]]};
  }

  private rawDefaultToDefault(rawDefault: RawDefaults): PieceStatDefaults {
    return {
      pieceType: rawDefault[0],
      mvRange: rawDefault[1],
      atkMinRange: rawDefault[2],
      atkMaxRange: rawDefault[3],
      hp: rawDefault[4],
      atk: rawDefault[5],
      cost: rawDefault[6],
      isZk: rawDefault[7],
      kamikaze: rawDefault[8],
    };
  }
}

export default ContractsAPI;

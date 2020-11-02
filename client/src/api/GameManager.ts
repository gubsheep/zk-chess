import {EventEmitter} from 'events';
import {
  BoardLocation,
  ChessGame,
  EthAddress,
} from '../_types/global/GlobalTypes';
import ContractsAPI from './ContractsAPI';
import SnarkHelper from './SnarkArgsHelper';
import _ from 'lodash';

import AbstractGameManager, {GameManagerEvent} from './AbstractGameManager';

import {
  ContractsAPIEvent,
  EthTxType,
  SubmittedTx,
  UnsubmittedAction,
  UnsubmittedCreateGame,
  UnsubmittedGhostAttack,
  UnsubmittedGhostMove,
  UnsubmittedJoin,
  UnsubmittedMove,
} from '../_types/darkforest/api/ContractsAPITypes';
import {emptyAddress} from '../utils/CheckedTypeUtils';
import {getRandomActionId} from '../utils/Utils';
import {BigInteger} from 'big-integer';
import bigInt from 'big-integer';
import mimcHash from '../hash/mimc';
import {LOCATION_ID_UB} from '../utils/constants';

class GameManager extends EventEmitter implements AbstractGameManager {
  private readonly account: EthAddress | null;
  private gameIds: string[];

  private readonly contractsAPI: ContractsAPI;
  private readonly snarkHelper: SnarkHelper;

  private gameState: ChessGame | null;
  private ghostCommitmentsMap: Map<string, [number, number, BigInteger]>;

  private constructor(
    account: EthAddress | null,
    gameIds: string[],
    contractsAPI: ContractsAPI,
    snarkHelper: SnarkHelper,
    ghostCommitmentsMap: Map<string, [number, number, BigInteger]>
  ) {
    super();

    this.account = account;
    this.gameIds = gameIds;

    this.contractsAPI = contractsAPI;
    this.snarkHelper = snarkHelper;

    this.gameState = null;
    this.ghostCommitmentsMap = ghostCommitmentsMap;
  }

  static async create(): Promise<GameManager> {
    // initialize dependencies according to a DAG

    const contractsAPI = await ContractsAPI.create();
    const gameIds = await contractsAPI.getAllGameIds();
    const account = contractsAPI.account;
    const snarkHelper = SnarkHelper.create();
    const ghostCommitmentsMap = new Map<string, [number, number, BigInteger]>();
    ghostCommitmentsMap.set(mimcHash(3, 3, 0).toString(), [3, 3, bigInt(0)]);

    // get data from the contract
    const gameManager = new GameManager(
      account,
      gameIds,
      contractsAPI,
      snarkHelper,
      ghostCommitmentsMap
    );

    // set up listeners: whenever ContractsAPI reports some game state update, do some logic
    contractsAPI.on(ContractsAPIEvent.CreatedGame, async (gameId: number) => {
      console.log('created game');
      await gameManager.refreshGameIdList();
      gameManager.emit(GameManagerEvent.CreatedGame, gameId);
    });
    contractsAPI.on(ContractsAPIEvent.GameStart, async () => {
      console.log('game started');
      await gameManager.refreshGameState();
      gameManager.emit(GameManagerEvent.GameStart, gameManager.getGameState());
    });
    contractsAPI.on(ContractsAPIEvent.MoveMade, async () => {
      console.log('move made');
      await gameManager.refreshGameState();
      gameManager.emit(GameManagerEvent.MoveMade, gameManager.getGameState());
    });
    contractsAPI.on(ContractsAPIEvent.GameFinished, async () => {
      console.log('game finished');
      await gameManager.refreshGameState();
      gameManager.emit(
        GameManagerEvent.GameFinished,
        gameManager.getGameState()
      );
    });

    contractsAPI.on(
      ContractsAPIEvent.TxInitialized,
      async (unminedTx: UnsubmittedAction) => {
        gameManager.emit(GameManagerEvent.TxInitialized, unminedTx);
      }
    );
    contractsAPI.on(
      ContractsAPIEvent.TxInitFailed,
      async (unminedTx: UnsubmittedAction, error: Error) => {
        gameManager.emit(GameManagerEvent.TxInitFailed, unminedTx, error);
      }
    );
    contractsAPI.on(
      ContractsAPIEvent.TxSubmitted,
      async (unminedTx: SubmittedTx) => {
        gameManager.emit(GameManagerEvent.TxSubmitted, unminedTx);
      }
    );
    contractsAPI.on(
      ContractsAPIEvent.TxFailed,
      async (unminedTx: SubmittedTx, error: Error) => {
        gameManager.emit(GameManagerEvent.TxFailed, unminedTx, error);
      }
    );
    contractsAPI.on(
      ContractsAPIEvent.TxConfirmed,
      async (unminedTx: SubmittedTx) => {
        gameManager.emit(GameManagerEvent.TxConfirmed, unminedTx);
      }
    );

    // @ts-ignore
    window['gm'] = gameManager;

    return gameManager;
  }

  public destroy(): void {
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.CreatedGame);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.GameStart);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.MoveMade);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.GameFinished);

    this.contractsAPI.removeAllListeners(ContractsAPIEvent.TxInitialized);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.TxInitFailed);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.TxSubmitted);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.TxFailed);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.TxConfirmed);

    this.contractsAPI.destroy();
    this.snarkHelper.destroy();
  }

  getAccount(): EthAddress | null {
    return this.account;
  }

  getEnemyAccount(): EthAddress | null {
    return emptyAddress;
  }

  async refreshGameIdList(): Promise<void> {
    this.gameIds = await this.contractsAPI.getAllGameIds();
  }

  getAllGameIds(): string[] {
    return this.gameIds;
  }

  getGameAddr(): EthAddress | null {
    return this.contractsAPI.getGameAddress();
  }

  getGameState(): ChessGame {
    if (!this.gameState) throw new Error('no game set');
    return this.gameState;
  }

  async refreshGameState(): Promise<ChessGame> {
    const contractGameState = await this.contractsAPI.getGameState();
    let salt = '0';
    let location: BoardLocation = [3, 3];
    const commitmentsMapEntry = this.ghostCommitmentsMap.get(
      contractGameState.myContractGhost.commitment
    );
    if (commitmentsMapEntry) {
      location = [commitmentsMapEntry[0], commitmentsMapEntry[1]];
      salt = commitmentsMapEntry[2].toString();
    }
    this.gameState = {
      ...contractGameState,
      myGhost: {
        ...contractGameState.myContractGhost,
        location,
        salt,
      },
    };
    return this.gameState;
  }

  async setGame(gameId: string): Promise<void> {
    await this.contractsAPI.setGame(gameId);
    await this.refreshGameState();
  }

  createGame(): Promise<void> {
    const unsubmittedCreateGame: UnsubmittedCreateGame = {
      actionId: getRandomActionId(),
      gameId: Math.floor(Math.random() * 1000000),
      type: EthTxType.CREATE_GAME,
    };
    console.log('creating game');
    this.contractsAPI.onTxInit(unsubmittedCreateGame);
    this.contractsAPI.createGame(unsubmittedCreateGame);
    return Promise.resolve();
  }

  joinGame(): Promise<void> {
    const unsubmittedJoin: UnsubmittedJoin = {
      actionId: getRandomActionId(),
      type: EthTxType.JOIN_GAME,
    };
    this.contractsAPI.onTxInit(unsubmittedJoin);
    this.contractsAPI.joinGame(unsubmittedJoin);
    return Promise.resolve();
  }

  movePiece(pieceId: number, to: BoardLocation): Promise<void> {
    const unsubmittedMove: UnsubmittedMove = {
      actionId: getRandomActionId(),
      type: EthTxType.MOVE,
      pieceId,
      to,
    };
    this.contractsAPI.onTxInit(unsubmittedMove);
    this.contractsAPI.movePiece(unsubmittedMove);
    return Promise.resolve();
  }

  moveGhost(ghostId: number, to: BoardLocation): Promise<void> {
    if (!this.gameState) throw new Error('no game set');
    const newSalt = bigInt.randBetween(bigInt(0), LOCATION_ID_UB).toString();
    this.ghostCommitmentsMap.set(mimcHash(to[1], to[0], newSalt).toString(), [
      to[1],
      to[0],
      bigInt(newSalt),
    ]);
    const unsubmittedGhostMove: UnsubmittedGhostMove = {
      actionId: getRandomActionId(),
      type: EthTxType.GHOST_MOVE,
      pieceId: ghostId,
      to,
      newSalt,
    };
    this.contractsAPI.onTxInit(unsubmittedGhostMove);

    const {myGhost} = this.gameState;
    const oldLoc = myGhost.location;
    this.snarkHelper
      .getGhostMoveProof(
        oldLoc[1],
        oldLoc[0],
        myGhost.salt,
        to[1],
        to[0],
        newSalt
      )
      .then((args) => {
        console.log(args);
        this.contractsAPI.moveGhost(args, unsubmittedGhostMove);
      });
    return Promise.resolve();
  }

  ghostAttack(): Promise<void> {
    if (!this.gameState) throw new Error('no game set');
    const {myGhost} = this.gameState;
    const pieceId = myGhost.id;
    const attackAt = myGhost.location;
    const unsubmittedGhostAttack: UnsubmittedGhostAttack = {
      actionId: getRandomActionId(),
      type: EthTxType.GHOST_ATTACK,
      pieceId,
      at: attackAt,
      salt: myGhost.salt,
    };
    this.contractsAPI.onTxInit(unsubmittedGhostAttack);
    this.contractsAPI.ghostAttack(unsubmittedGhostAttack);
    return Promise.resolve();
  }
}

export default GameManager;

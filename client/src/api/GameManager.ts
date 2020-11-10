import {EventEmitter} from 'events';
import {
  BoardLocation,
  ChessGame,
  EthAddress,
  isZKPiece,
  Piece,
  isKnown,
  PieceType,
  KnownZKPiece,
} from '../_types/global/GlobalTypes';
import ContractsAPI from './ContractsAPI';
import SnarkHelper from './SnarkArgsHelper';
import _, {defaults} from 'lodash';

import AbstractGameManager, {GameManagerEvent} from './AbstractGameManager';

import {
  ContractsAPIEvent,
  createEmptyMove,
  createEmptySummon,
  EthTxType,
  GhostSummonArgs,
  SubmittedTx,
  TxIntent,
  UnsubmittedCreateGame,
  UnsubmittedEndTurn,
  UnsubmittedJoin,
} from '../_types/darkforest/api/ContractsAPITypes';
import {emptyAddress} from '../utils/CheckedTypeUtils';
import {getRandomTxIntentId} from '../utils/Utils';
import bigInt from 'big-integer';
import mimcHash from '../hash/mimc';
import {LOCATION_ID_UB, SIZE} from '../utils/constants';
import {getAdjacentTiles} from '../utils/ChessUtils';

class GameManager extends EventEmitter implements AbstractGameManager {
  private readonly account: EthAddress | null;
  private gameIds: string[];

  private readonly contractsAPI: ContractsAPI;
  private readonly snarkHelper: SnarkHelper;

  private gameState: ChessGame | null;

  private constructor(
    account: EthAddress | null,
    gameIds: string[],
    contractsAPI: ContractsAPI,
    snarkHelper: SnarkHelper
  ) {
    super();

    this.account = account;
    this.gameIds = gameIds;

    this.contractsAPI = contractsAPI;
    this.snarkHelper = snarkHelper;

    this.gameState = null;
  }

  static async create(): Promise<GameManager> {
    // initialize dependencies according to a DAG

    const contractsAPI = await ContractsAPI.create();
    const gameIds = await contractsAPI.getAllGameIds();
    const account = contractsAPI.account;
    const snarkHelper = SnarkHelper.create();
    localStorage.setItem(
      `COMMIT_${mimcHash(3, 3, 0).toString()}`,
      JSON.stringify([3, 3, '0'])
    );

    // get data from the contract
    const gameManager = new GameManager(
      account,
      gameIds,
      contractsAPI,
      snarkHelper
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
    contractsAPI.on(ContractsAPIEvent.ActionMade, async () => {
      console.log('move made');
      await gameManager.refreshGameState();
      gameManager.emit(GameManagerEvent.ActionMade, gameManager.getGameState());
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
      async (unminedTx: TxIntent) => {
        gameManager.emit(GameManagerEvent.TxInitialized, unminedTx);
      }
    );
    contractsAPI.on(
      ContractsAPIEvent.TxInitFailed,
      async (unminedTx: TxIntent, error: Error) => {
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
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.ActionMade);
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
    const pieces: Piece[] = [];
    for (let i = 0; i < contractGameState.pieces.length; i++) {
      let contractPiece = contractGameState.pieces[i];
      const defaultsForPiece = contractGameState.defaults.get(
        contractPiece.pieceType
      );
      if (!defaultsForPiece) continue;
      const piece: Piece = {
        ...contractPiece,
        mvRange: defaultsForPiece.mvRange,
        atkRange: defaultsForPiece.atkRange,
        atk: defaultsForPiece.atk,
      } as Piece;
      if (isZKPiece(piece)) {
        const commitment = piece.commitment;
        const commitmentDataStr = localStorage.getItem(`COMMIT_${commitment}`);
        if (commitmentDataStr) {
          const commitData = JSON.parse(commitmentDataStr) as [
            number,
            number,
            string
          ];
          const location: BoardLocation = [commitData[1], commitData[0]];
          const salt = commitData[2];
          const knownPiece = {
            ...piece,
            location,
            salt,
          };
          // zk piece with known location
          pieces.push(knownPiece);
        } else {
          // zk piece with unknown location
          pieces.push(piece);
        }
      } else {
        // visible piece
        pieces.push(piece);
      }
    }
    this.gameState = {
      ...contractGameState,
      pieces,
    };
    return this.gameState;
  }

  async setGame(gameId: string): Promise<void> {
    await this.contractsAPI.setGame(gameId);
    await this.refreshGameState();
  }

  createGame(): Promise<void> {
    const unsubmittedCreateGame: UnsubmittedCreateGame = {
      txIntentId: getRandomTxIntentId(),
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
      txIntentId: getRandomTxIntentId(),
      type: EthTxType.JOIN_GAME,
    };
    this.contractsAPI.onTxInit(unsubmittedJoin);
    this.contractsAPI.joinGame(unsubmittedJoin);
    return Promise.resolve();
  }

  private findPath(
    from: BoardLocation,
    to: BoardLocation,
    ignoreObstacles: boolean = false
  ): BoardLocation[] | null {
    if (!this.gameState) {
      throw new Error('game not set');
    }
    const distBoard: number[][] = [];
    for (let i = 0; i < SIZE; i++) {
      distBoard.push([]);
      for (let j = 0; j < SIZE; j++) {
        distBoard[i].push(-1);
      }
    }
    if (!ignoreObstacles) {
      for (let piece of this.gameState.pieces) {
        if (!isZKPiece(piece)) {
          distBoard[piece.location[1]][piece.location[0]] = -2;
        }
      }
    }

    // floodfill
    distBoard[from[1]][from[0]] = 0;
    let current: BoardLocation;
    const queue: BoardLocation[] = [from];
    do {
      current = queue.shift() as BoardLocation; // else typescript mad lol
      const currentDist = distBoard[current[1]][current[0]];

      for (const loc of getAdjacentTiles(current)) {
        if (loc[0] >= SIZE || loc[0] < 0 || loc[1] >= SIZE || loc[1] < 0) {
          continue;
        }
        if (distBoard[loc[1]][loc[0]] === -1) {
          distBoard[loc[1]][loc[0]] = currentDist + 1;
          queue.push(loc);
        }
        if (loc[0] === to[0] && loc[1] === to[1]) {
          break;
        }
      }
    } while (queue.length > 0);

    if (distBoard[to[1]][to[0]] < 0) {
      console.log('no path between these two locations');
      return null;
    }

    // retrace path
    const path: BoardLocation[] = [];
    path.push(to);
    for (let i = distBoard[to[1]][to[0]] - 1; i > 0; i--) {
      const current = path[path.length - 1];
      for (const loc of getAdjacentTiles(current)) {
        if (
          loc[0] >= 0 &&
          loc[0] < SIZE &&
          loc[1] >= 0 &&
          loc[1] < SIZE &&
          distBoard[loc[1]][loc[0]] === i
        ) {
          path.push(loc);
          break;
        }
      }
    }
    return path.reverse();
  }

  summonPiece(pieceType: PieceType, at: BoardLocation): Promise<void> {
    if (!this.gameState) throw new Error('no game set');
    const newPieceId = Math.max(...this.gameState.pieces.map((p) => p.id)) + 1;
    let unsubmittedSummon = createEmptySummon();
    unsubmittedSummon.turnNumber = this.gameState.turnNumber;
    unsubmittedSummon.pieceId = newPieceId;
    unsubmittedSummon.pieceType = pieceType;
    unsubmittedSummon.row = at[1];
    unsubmittedSummon.col = at[0];
    console.log(unsubmittedSummon);
    if (pieceType === PieceType.Ghost) {
      unsubmittedSummon.isZk = true;
      const newSalt = bigInt.randBetween(bigInt(0), LOCATION_ID_UB).toString();
      const zkp = this.snarkHelper.getDist1Proof(
        at[1],
        at[0],
        newSalt,
        this.gameState.myAddress === this.gameState.player1.address ? 0 : 6,
        3,
        1,
        SIZE
      );
      localStorage.setItem(
        `COMMIT_${mimcHash(at[1], at[0], newSalt).toString()}`,
        JSON.stringify([at[1], at[0], newSalt])
      );
      unsubmittedSummon.zkp = zkp;
    }
    this.contractsAPI.onTxInit(unsubmittedSummon);
    this.contractsAPI.doSummon(unsubmittedSummon);
    return Promise.resolve();
  }

  movePiece(pieceId: number, to: BoardLocation): Promise<void> {
    if (!this.gameState) throw new Error('no game set');
    let piece: Piece | null = null;
    for (const p of this.gameState.pieces) {
      if (p.id === pieceId) piece = p;
    }
    if (!piece) throw new Error('piece not found');
    let unsubmittedMove = createEmptyMove();
    if (isZKPiece(piece) && !isKnown(piece))
      throw new Error('cant find ghost piece');
    const path = this.findPath(piece.location, to, isZKPiece(piece));
    if (!path) throw new Error('no path found');
    unsubmittedMove.turnNumber = this.gameState.turnNumber;
    unsubmittedMove.pieceId = pieceId;
    unsubmittedMove.moveToRow = path.map((loc) => loc[1]);
    unsubmittedMove.moveToCol = path.map((loc) => loc[0]);
    if (isZKPiece(piece)) {
      const newSalt = bigInt.randBetween(bigInt(0), LOCATION_ID_UB).toString();
      const zkp = this.snarkHelper.getDist2Proof(
        piece.location[1],
        piece.location[0],
        (piece as KnownZKPiece).salt,
        to[1],
        to[0],
        newSalt,
        Math.abs(to[1] - piece.location[1]) +
          Math.abs(to[0] - piece.location[0]),
        SIZE
      );
      localStorage.setItem(
        `COMMIT_${mimcHash(to[1], to[0], newSalt).toString()}`,
        JSON.stringify([to[1], to[0], newSalt])
      );
      unsubmittedMove.isZk = true;
      unsubmittedMove.zkp = zkp;
    }
    this.contractsAPI.onTxInit(unsubmittedMove);
    this.contractsAPI.doMove(unsubmittedMove);
    return Promise.resolve();
  }

  endTurn(): Promise<void> {
    if (!this.gameState) throw new Error('no game set');
    const unsubmittedEndTurn: UnsubmittedEndTurn = {
      txIntentId: getRandomTxIntentId(),
      type: EthTxType.END_TURN,
      turnNumber: this.gameState.turnNumber,
    };
    this.contractsAPI.onTxInit(unsubmittedEndTurn);
    this.contractsAPI.endTurn(unsubmittedEndTurn);
    return Promise.resolve();
  }
}

export default GameManager;

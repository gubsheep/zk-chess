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
  GameAction,
  GameActionType,
  SummonAction,
  MoveAction,
  Locatable,
  AttackAction,
  EndTurnAction,
  isLocatable,
} from '../_types/global/GlobalTypes';
import ContractsAPI from './ContractsAPI';
import SnarkHelper from './SnarkArgsHelper';
import _ from 'lodash';

import AbstractGameManager, {GameManagerEvent} from './AbstractGameManager';

import {
  ContractsAPIEvent,
  createEmptyAttack,
  createEmptyMove,
  createEmptySummon,
  EthTxType,
  isAttack,
  isEndTurn,
  isMove,
  isSummon,
  SubmittedTx,
  TxIntent,
  UnsubmittedCreateGame,
  UnsubmittedEndTurn,
  UnsubmittedJoin,
} from '../_types/darkforest/api/ContractsAPITypes';
import {address} from '../utils/CheckedTypeUtils';
import {findPath, getRandomTxIntentId, taxiDist} from '../utils/Utils';
import bigInt from 'big-integer';
import mimcHash from '../hash/mimc';
import {LOCATION_ID_UB, SIZE} from '../utils/constants';
import {GameState} from './GameState';

class GameManager extends EventEmitter implements AbstractGameManager {
  private readonly account: EthAddress | null;
  private gameIds: string[];

  private readonly contractsAPI: ContractsAPI;
  private readonly snarkHelper: SnarkHelper;

  private gameState: GameState | null;
  private gameActions: GameAction[];

  private refreshInterval: ReturnType<typeof setInterval> | null;

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
    this.gameActions = [];

    this.gameState = null;
    this.refreshInterval = null;
    this.setupEventListeners();
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

    // @ts-ignore
    window['gm'] = gameManager;

    return gameManager;
  }

  private setupEventListeners(): void {
    const contractsAPI = this.contractsAPI;
    // set up listeners: whenever ContractsAPI reports some game state update, do some logic
    contractsAPI.on(ContractsAPIEvent.CreatedGame, async (gameId: number) => {
      console.log('created game');
      await this.refreshGameIdList();
      this.emit(GameManagerEvent.CreatedGame, gameId);
    });
    contractsAPI.on(ContractsAPIEvent.GameStart, async () => {
      console.log('game started');
      await this.refreshGameState();
      this.emit(GameManagerEvent.GameStart, this.getGameState());
    });
    contractsAPI.on(
      ContractsAPIEvent.DidSummon,
      async (
        player: string,
        pieceId: number,
        sequenceNumber: number,
        pieceType: number,
        atRow: number,
        atCol: number
      ) => {
        if (!this.gameState) throw new Error('no game set');
        const action: SummonAction = {
          sequenceNumber,
          actionType: GameActionType.SUMMON,
          fromLocalData: false,
          pieceId,
          player: address(player),
          pieceType,
        };
        if (!this.gameState.defaults.get(pieceType)?.isZk) {
          action.at = [atCol, atRow];
        }
        this.gameState.addGameAction(action);
      }
    );
    contractsAPI.on(
      ContractsAPIEvent.DidMove,
      async (
        sequenceNumber: number,
        pieceId: number,
        fromRow: number,
        fromCol: number,
        toRow: number,
        toCol: number
      ) => {
        if (!this.gameState) throw new Error('no game set');
        const action: MoveAction = {
          sequenceNumber,
          actionType: GameActionType.MOVE,
          fromLocalData: false,
          pieceId,
        };
        const piece = this.gameState.pieceById.get(pieceId);
        if (!piece) throw new Error('piece not foun');
        if (isZKPiece(piece)) {
          action.from = [fromCol, fromRow];
          action.to = [toCol, toRow];
        }
        this.gameState.addGameAction(action);
      }
    );
    contractsAPI.on(
      ContractsAPIEvent.DidAttack,
      async (
        sequenceNumber: number,
        attackerId: number,
        attackedId: number,
        attackerHp: number,
        attackedHp: number
      ) => {
        if (!this.gameState) throw new Error('no game set');
        const action: AttackAction = {
          sequenceNumber,
          actionType: GameActionType.ATTACK,
          fromLocalData: false,
          attackerId,
          attackedId,
          attackerHp,
          attackedHp,
        };
        this.gameState.addGameAction(action);
      }
    );
    contractsAPI.on(
      ContractsAPIEvent.DidEndTurn,
      async (player: string, turnNumber: number, sequenceNumber: number) => {
        if (!this.gameState) throw new Error('no game set');
        const action: EndTurnAction = {
          sequenceNumber,
          actionType: GameActionType.END_TURN,
          fromLocalData: false,
          player: address(player),
          turnNumber,
        };
        this.gameState.addGameAction(action);
      }
    );

    contractsAPI.on(
      ContractsAPIEvent.TxInitialized,
      async (txIntent: TxIntent) => {
        if (isSummon(txIntent)) {
          if (!this.gameState) throw new Error('no game set');
          const action: SummonAction = {
            sequenceNumber: txIntent.sequenceNumber,
            actionType: GameActionType.SUMMON,
            player: this.gameState.myAddress,
            fromLocalData: true,
            pieceType: txIntent.pieceType,
            pieceId: txIntent.pieceId,
            at: [txIntent.col, txIntent.row],
          };
          this.gameState.addGameAction(action);
        } else if (isMove(txIntent)) {
          if (!this.gameState) throw new Error('no game set');
          const piece = this.gameState.pieceById.get(txIntent.pieceId);
          const toRow = txIntent.moveToRow[txIntent.moveToRow.length - 1];
          const toCol = txIntent.moveToCol[txIntent.moveToCol.length - 1];
          if (piece) {
            const action: MoveAction = {
              sequenceNumber: txIntent.sequenceNumber,
              actionType: GameActionType.MOVE,
              pieceId: piece.id,
              fromLocalData: true,
              from: (piece as Locatable).location,
              to: [toCol, toRow],
            };
            this.gameState.addGameAction(action);
          }
        } else if (isAttack(txIntent)) {
          if (!this.gameState) throw new Error('no game set');
          const attacker = this.gameState.pieceById.get(txIntent.pieceId);
          const attacked = this.gameState.pieceById.get(txIntent.attackedId);
          if (
            attacker &&
            attacked &&
            isLocatable(attacker) &&
            isLocatable(attacked)
          ) {
            let attackerHp = attacker.hp;
            let attackedHp = attacked.hp;
            const dist = taxiDist(attacker.location, attacked.location);
            attackedHp = Math.max(0, attackedHp - attacker.atk);
            if (dist <= attacked.atkRange)
              attackerHp = Math.max(0, attackerHp - attacked.atk);
            if (attacker.kamikaze) attackerHp = 0;
            const action: AttackAction = {
              sequenceNumber: txIntent.sequenceNumber,
              actionType: GameActionType.ATTACK,
              fromLocalData: true,
              attackerId: attacker.id,
              attackedId: attacked.id,
              attackerHp,
              attackedHp,
            };
            this.gameState.addGameAction(action);
          }
        } else if (isEndTurn(txIntent)) {
          if (!this.gameState) throw new Error('no game set');
          const action: EndTurnAction = {
            sequenceNumber: txIntent.sequenceNumber,
            actionType: GameActionType.END_TURN,
            fromLocalData: true,
            turnNumber: txIntent.turnNumber,
            player: this.gameState.myAddress,
          };
          this.gameState.addGameAction(action);
        }
        this.emit(GameManagerEvent.TxInitialized, txIntent);
      }
    );
    contractsAPI.on(
      ContractsAPIEvent.TxInitFailed,
      async (unminedTx: TxIntent, error: Error) => {
        // TODO: handle error
        this.emit(GameManagerEvent.TxInitFailed, unminedTx, error);
      }
    );
    contractsAPI.on(
      ContractsAPIEvent.TxSubmitted,
      async (unminedTx: SubmittedTx) => {
        this.emit(GameManagerEvent.TxSubmitted, unminedTx);
      }
    );
    contractsAPI.on(
      ContractsAPIEvent.TxFailed,
      async (unminedTx: SubmittedTx, error: Error) => {
        // TODO: handle submit errors and reverts separately!
        this.emit(GameManagerEvent.TxFailed, unminedTx, error);
      }
    );
    contractsAPI.on(
      ContractsAPIEvent.TxConfirmed,
      async (unminedTx: SubmittedTx) => {
        this.emit(GameManagerEvent.TxConfirmed, unminedTx);
      }
    );
  }

  public destroy(): void {
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.CreatedGame);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.GameStart);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.DidSummon);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.DidMove);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.DidAttack);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.DidEndTurn);

    this.contractsAPI.removeAllListeners(ContractsAPIEvent.TxInitialized);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.TxInitFailed);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.TxSubmitted);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.TxFailed);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.TxConfirmed);

    this.contractsAPI.destroy();
    this.snarkHelper.destroy();
  }

  async refreshGameIdList(): Promise<void> {
    this.gameIds = await this.contractsAPI.getAllGameIds();
  }

  getAllGameIds(): string[] {
    return this.gameIds;
  }

  getGameState(): ChessGame {
    if (!this.gameState) throw new Error('no game set');
    return this.gameState.getGameState();
  }

  getLatestGameState(): ChessGame {
    if (!this.gameState) throw new Error('no game set');
    return this.gameState.getLatestState();
  }

  getActions(): (GameAction | undefined)[] {
    if (!this.gameState) throw new Error('no game set');
    return this.gameState.getActions();
  }

  async refreshGameState(): Promise<void> {
    if (!this.gameState) throw new Error('no game set');
    const oldGameState = this.gameState.getGameState();
    // console.log('CHECKING DIFF APPLICATION');
    // console.log(JSON.stringify(oldGameState, null, 2));
    const diff = this.gameState.getActions()[oldGameState.sequenceNumber];
    console.log(this.gameState.getActions());
    const oldSequenceNumber = oldGameState.sequenceNumber;
    const contractGameState = await this.contractsAPI.getGameState();
    this.gameState.update(contractGameState);
    const newGameState = this.gameState.getGameState();
    if (diff) {
      const appliedState = this.gameState.applyAction(oldGameState, diff);
      // console.log(diff);
      // console.log(appliedState);
      // console.log(newGameState);
      // console.log(this.gameState.checkEquals(appliedState, newGameState));
    }
    const newSequenceNumber = this.gameState.getGameState().sequenceNumber;
    if (newSequenceNumber > oldSequenceNumber) {
      // note that the action at sequenceNumber will only be a part of
      this.emit(
        GameManagerEvent.StateAdvanced,
        this.gameState.getGameState(),
        this.gameState.getActions()
      );
    } else if (newSequenceNumber < oldSequenceNumber) {
      this.emit(
        GameManagerEvent.StateRewinded,
        this.gameState.getGameState(),
        this.gameState.getActions()
      );
    }
  }

  async setGame(gameId: string): Promise<void> {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    await this.contractsAPI.setGame(gameId);
    const contractGameState = await this.contractsAPI.getGameState();
    this.gameState = new GameState(contractGameState);
    this.refreshInterval = setInterval(() => {
      this.refreshGameState();
    }, 5000);
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

  summonPiece(pieceType: PieceType, at: BoardLocation): Promise<void> {
    if (!this.gameState) throw new Error('no game set');
    const gameState = this.gameState.getLatestState();
    const newPieceId = Math.max(...gameState.pieces.map((p) => p.id)) + 1;
    let unsubmittedSummon = createEmptySummon();
    unsubmittedSummon.turnNumber = gameState.turnNumber;
    unsubmittedSummon.pieceId = newPieceId;
    unsubmittedSummon.pieceType = pieceType;
    unsubmittedSummon.row = at[1];
    unsubmittedSummon.col = at[0];
    unsubmittedSummon.sequenceNumber = gameState.sequenceNumber;
    if (gameState.defaults.get(pieceType)?.isZk) {
      unsubmittedSummon.isZk = true;
      const newSalt = bigInt.randBetween(bigInt(0), LOCATION_ID_UB).toString();
      const zkp = this.snarkHelper.getSummonProof(
        at[1],
        at[0],
        newSalt,
        gameState.myAddress === gameState.player1.address ? 0 : 6,
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
    const gameState = this.gameState.getLatestState();
    let piece: Piece | null = null;
    for (const p of gameState.pieces) {
      if (p.id === pieceId) piece = p;
    }
    if (!piece) throw new Error('piece not found');
    let unsubmittedMove = createEmptyMove();
    if (isZKPiece(piece) && !isKnown(piece))
      throw new Error('cant find ghost piece');
    const obstacles: Locatable[] = gameState.pieces.filter(
      (p) => !isZKPiece(p) && p.alive
    ) as Locatable[]; // typescript isn't smart enough to infer that these are all visible pieces
    const path = findPath(
      piece.location,
      to,
      SIZE,
      obstacles,
      isZKPiece(piece)
    );
    if (!path) throw new Error('no path found');
    unsubmittedMove.turnNumber = gameState.turnNumber;
    unsubmittedMove.pieceId = pieceId;
    unsubmittedMove.moveToRow = path.map((loc) => loc[1]);
    unsubmittedMove.moveToCol = path.map((loc) => loc[0]);
    unsubmittedMove.sequenceNumber = gameState.sequenceNumber;
    if (isZKPiece(piece)) {
      const newSalt = bigInt.randBetween(bigInt(0), LOCATION_ID_UB).toString();
      const zkp = this.snarkHelper.getMoveProve(
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

  attack(pieceId: number, attackedId: number): Promise<void> {
    if (!this.gameState) throw new Error('no game set');
    const gameState = this.gameState.getLatestState();
    const attacker = gameState.pieces.filter((p) => p.id === pieceId)[0];
    const attacked = gameState.pieces.filter((p) => p.id === attackedId)[0];
    console.log(attacker);
    console.log(attacked);
    if (!attacker || !attacked) throw new Error('piece not found');
    if (isZKPiece(attacked) && !isKnown(attacked))
      throw new Error('attacking location not found');
    let unsubmittedAttack = createEmptyAttack();
    unsubmittedAttack.turnNumber = gameState.turnNumber;
    unsubmittedAttack.pieceId = pieceId;
    unsubmittedAttack.row = attacked.location[1];
    unsubmittedAttack.col = attacked.location[0];
    unsubmittedAttack.attackedId = attackedId;
    unsubmittedAttack.sequenceNumber = gameState.sequenceNumber;
    console.log(unsubmittedAttack);
    if (isZKPiece(attacker)) {
      if (!isKnown(attacker)) throw new Error('attacker location not found');
      unsubmittedAttack.isZk = true;
      const zkp = this.snarkHelper.getAttackProof(
        attacker.location[1],
        attacker.location[0],
        attacker.salt,
        attacked.location[1],
        attacked.location[0],
        attacker.atkRange,
        SIZE
      );
      unsubmittedAttack.zkp = zkp;
    }
    this.contractsAPI.onTxInit(unsubmittedAttack);
    this.contractsAPI.doAttack(unsubmittedAttack);
    return Promise.resolve();
  }

  endTurn(): Promise<void> {
    if (!this.gameState) throw new Error('no game set');
    const gameState = this.gameState.getLatestState();
    const unsubmittedEndTurn: UnsubmittedEndTurn = {
      txIntentId: getRandomTxIntentId(),
      type: EthTxType.END_TURN,
      turnNumber: gameState.turnNumber,
      sequenceNumber: gameState.sequenceNumber,
    };
    this.contractsAPI.onTxInit(unsubmittedEndTurn);
    this.contractsAPI.endTurn(unsubmittedEndTurn);
    return Promise.resolve();
  }
}

export default GameManager;

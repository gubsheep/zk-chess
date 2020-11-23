import {
  AbstractPiece,
  BoardLocation,
  CardHand,
  CardPrototype,
  ChessGame,
  ChessGameContractData,
  EthAddress,
  GameAction,
  GameStatus,
  isAttackAction,
  isCardDrawAction,
  isEndTurnAction,
  isLocatable,
  isMoveAction,
  isSummonAction,
  isZKPiece,
  KnownZKPiece,
  Objective,
  Piece,
  PieceStatDefaults,
  PieceType,
  Player,
  VisiblePiece,
  ZKPiece,
} from '../_types/global/GlobalTypes';
import _ from 'lodash';
import {LocalStorageManager} from './LocalStorageManager';
import {STARTING_HAND_COMMIT} from '../utils/constants';
import mimcHash from '../hash/mimc';

export class GameState {
  gameAddress: EthAddress;
  gameId: string;

  nRows: number;
  nCols: number;

  myAddress: EthAddress;
  player1: Player;
  player2: Player;

  player1Mana: number;
  player2Mana: number;
  player1HasDrawn: boolean;
  player2HasDrawn: boolean;
  myHand: CardHand;
  drawnCard: number | null;

  pieces: Piece[];
  objectives: Objective[];
  cardPrototypes: CardPrototype[];
  pieceById: Map<number, Piece>;
  defaults: Record<PieceType, PieceStatDefaults>;
  gameActions: GameAction[];

  turnNumber: number;
  sequenceNumber: number;
  gameStatus: GameStatus;
  lastTurnTimestamp: number;

  constructor(game: ChessGameContractData) {
    this.gameActions = [];

    this.update(game);
  }

  public update(contractData: ChessGameContractData) {
    this.gameAddress = contractData.gameAddress;
    this.gameId = contractData.gameId;
    this.nRows = contractData.nRows;
    this.nCols = contractData.nCols;
    this.myAddress = contractData.myAddress;
    this.player1 = contractData.player1;
    this.player2 = contractData.player2;
    this.player1Mana = contractData.player1Mana;
    this.player2Mana = contractData.player2Mana;
    this.player1HasDrawn = contractData.player1HasDrawn;
    this.player2HasDrawn = contractData.player2HasDrawn;
    this.cardPrototypes = contractData.cardPrototypes;
    this.objectives = contractData.objectives;
    this.defaults = contractData.defaults;
    this.turnNumber = contractData.turnNumber;
    this.sequenceNumber = contractData.sequenceNumber;
    this.gameStatus = contractData.gameStatus;
    this.lastTurnTimestamp = contractData.lastTurnTimestamp;

    // throws if can't find commitment
    const handCommit =
      this.myAddress === this.player1.address
        ? contractData.player1HandCommit
        : contractData.player2HandCommit;
    console.log(`received hand commit ${handCommit}`);
    if (handCommit === STARTING_HAND_COMMIT) {
      this.myHand = {
        cards: [0, 0, 0],
        salt: '0',
      };
    } else {
      this.myHand = LocalStorageManager.getHandCommitment(
        handCommit,
        this.myAddress,
        this.gameAddress
      );
    }

    const isMyTurn =
      (this.myAddress === this.player1.address &&
        this.gameStatus === GameStatus.P1_TO_MOVE) ||
      (this.myAddress === this.player2.address &&
        this.gameStatus === GameStatus.P2_TO_MOVE);

    this.drawnCard = null;
    // if it's my turn and i haven't drawn, draw a card
    if (isMyTurn) {
      if (
        this.myAddress === this.player1.address
          ? !this.player1HasDrawn
          : !this.player2HasDrawn
      ) {
        const mySeed = LocalStorageManager.getSeed(
          this.myAddress,
          this.gameAddress
        );
        this.drawnCard =
          mimcHash(mySeed, this.lastTurnTimestamp).mod(32).mod(6).toJSNumber() +
          1;
      }
    }

    this.pieces = [];
    this.pieceById = new Map<number, Piece>();

    for (let i = 0; i < contractData.pieces.length; i++) {
      let contractPiece = contractData.pieces[i];
      const defaultsForPiece = contractData.defaults[contractPiece.pieceType];
      if (!defaultsForPiece) continue;
      let piece: Piece = {
        ...contractPiece,
        mvRange: defaultsForPiece.mvRange,
        atkMinRange: defaultsForPiece.atkMinRange,
        atkMaxRange: defaultsForPiece.atkMaxRange,
        atk: defaultsForPiece.atk,
        kamikaze: defaultsForPiece.kamikaze,
      };
      if (isZKPiece(piece)) {
        const commitment = piece.commitment;
        try {
          const [location, salt] = LocalStorageManager.getLocCommitment(
            commitment,
            this.myAddress,
            this.gameAddress
          );
          const knownPiece = {
            ...piece,
            location,
            salt,
          };
          piece = knownPiece;
        } catch {
          // that location is unknown to us, so don't do anything
        }
      }
      this.pieces.push(piece);
      this.pieceById.set(piece.id, piece);
    }
    // if it's not my turn, just listen to contract state and flush stale actions
    if (!isMyTurn) {
      this.gameActions = this.gameActions.slice(0, this.sequenceNumber);
    }
  }

  public addGameAction(action: GameAction) {
    // add this action unless it's a blockchain action that would overwrite
    // a local action
    if (
      action.fromLocalData ||
      !this.gameActions[action.sequenceNumber]?.fromLocalData
    ) {
      this.gameActions[action.sequenceNumber] = action;
    }
  }

  public gameActionFailed(sequenceNumber: number) {
    this.gameActions = this.gameActions.slice(
      0,
      Math.min(sequenceNumber, this.gameActions.length)
    );
  }

  public getGameState(): ChessGame {
    // fresh object
    return _.cloneDeep({
      gameAddress: this.gameAddress,
      gameId: this.gameId,
      nRows: this.nRows,
      nCols: this.nCols,
      myAddress: this.myAddress,
      myHand: this.myHand,
      drawnCard: this.drawnCard,
      player1: this.player1,
      player2: this.player2,
      player1Mana: this.player1Mana,
      player2Mana: this.player2Mana,
      player1HasDrawn: this.player1HasDrawn,
      player2HasDrawn: this.player2HasDrawn,
      pieces: this.pieces,
      cardPrototypes: this.cardPrototypes,
      objectives: this.objectives,
      pieceById: this.pieceById,
      defaults: this.defaults,
      turnNumber: this.turnNumber,
      sequenceNumber: this.sequenceNumber,
      gameStatus: this.gameStatus,
      lastTurnTimestamp: this.lastTurnTimestamp,
    });
  }

  public getLatestState(): ChessGame {
    const state = this.getGameState();
    for (let i = state.sequenceNumber; i < this.gameActions.length; i++) {
      this.applyAction(state, this.gameActions[i]);
    }
    return state;
  }

  public getStateAtSequence(sequenceNumber: number): ChessGame {
    const state = this.getGameState();
    if (sequenceNumber <= state.sequenceNumber) return state;
    for (let i = state.sequenceNumber; i < sequenceNumber; i += 1) {
      this.applyAction(state, this.gameActions[i]);
    }
    return state;
  }

  public getActions(): (GameAction | undefined)[] {
    return this.gameActions;
  }

  public applyAction(
    gameState: ChessGame,
    action: GameAction | undefined
  ): ChessGame {
    if (!action) return gameState;
    // modifies gameState
    if (isCardDrawAction(action)) {
      if (action.player === gameState.player1.address) {
        gameState.player1HasDrawn = true;
      } else {
        gameState.player2HasDrawn = true;
      }

      if (action.player === gameState.myAddress && action.hand) {
        gameState.myHand = action.hand;
      }
    } else if (isSummonAction(action)) {
      const [piece, cost] = this.defaultPiece(
        action.pieceId,
        action.pieceType,
        action.player,
        action.at
      );
      gameState.pieces.push(piece);
      gameState.pieceById.set(piece.id, piece);
      if (gameState.myAddress === gameState.player1.address) {
        gameState.player1Mana -= cost;
      } else if (gameState.myAddress === gameState.player2.address) {
        gameState.player2Mana -= cost;
      }
    } else if (isMoveAction(action)) {
      for (const piece of gameState.pieces) {
        if (piece.id === action.pieceId) {
          piece.lastMove = gameState.turnNumber;
          if (isLocatable(piece) && action.to) {
            piece.location = action.to;
            gameState.pieceById.set(piece.id, piece);
          }
          break;
        }
      }
    } else if (isAttackAction(action)) {
      for (const piece of gameState.pieces) {
        if (piece.id === action.attackerId) {
          piece.lastAttack = gameState.turnNumber;
          piece.hp = action.attackerHp;
          if (piece.hp === 0) {
            piece.alive = false;
          }
          gameState.pieceById.set(piece.id, piece);
        } else if (piece.id === action.attackedId) {
          piece.hp = action.attackedHp;
          if (piece.hp === 0) {
            piece.alive = false;
          }
          gameState.pieceById.set(piece.id, piece);
        }
      }
    } else if (isEndTurnAction(action)) {
      if (gameState.myAddress === gameState.player1.address) {
        gameState.gameStatus = GameStatus.P2_TO_MOVE;
        gameState.player1Mana = 0;
        gameState.player2Mana = Math.min(gameState.turnNumber, 8);
        for (const objective of this.objectives) {
          for (const piece of this.pieces) {
            if (
              isLocatable(piece) &&
              objective.location[1] === piece.location[1] &&
              objective.location[0] === piece.location[0] &&
              piece.owner === this.player2.address
            ) {
              gameState.player2Mana += 1;
              break;
            }
          }
        }
      } else if (gameState.myAddress === gameState.player2.address) {
        gameState.gameStatus = GameStatus.P1_TO_MOVE;
        gameState.turnNumber += 1;
        gameState.player1Mana = Math.min(gameState.turnNumber, 8);
        gameState.player2Mana = 0;
        for (const objective of this.objectives) {
          for (const piece of this.pieces) {
            if (
              isLocatable(piece) &&
              objective.location[1] === piece.location[1] &&
              objective.location[0] === piece.location[0] &&
              piece.owner === this.player1.address
            ) {
              gameState.player1Mana += 1;
              break;
            }
          }
        }
      }
    }
    gameState.sequenceNumber = action.sequenceNumber + 1;
    return gameState;
  }

  // returns piece, mana cost
  private defaultPiece(
    pieceId: number,
    pieceType: PieceType,
    owner: EthAddress,
    at?: BoardLocation
  ): [Piece, number] {
    const defaults = this.defaults[pieceType];
    if (!defaults) throw new Error('unknown piecetype');
    const base: AbstractPiece = {
      id: pieceId,
      owner,
      pieceType,
      alive: true,
      hp: defaults.hp,
      atk: defaults.atk,
      lastMove: this.turnNumber,
      lastAttack: this.turnNumber,
      mvRange: defaults.mvRange,
      atkMinRange: defaults.atkMinRange,
      atkMaxRange: defaults.atkMaxRange,
      kamikaze: defaults.kamikaze,
    };
    if (defaults.isZk) {
      const piece: ZKPiece = {
        ...base,
        commitment: '',
      };
      if (at) {
        const knownPiece: KnownZKPiece = {
          ...piece,
          location: at,
          salt: '',
        };
        return [knownPiece, defaults.cost];
      }
      return [piece, defaults.cost];
    } else {
      if (!at) throw new Error('');
      const piece: VisiblePiece = {
        ...base,
        location: at,
      };
      return [piece, defaults.cost];
    }
  }

  public checkEquals(state1: ChessGame, state2: ChessGame): boolean {
    if (
      state1.gameAddress !== state2.gameAddress ||
      state1.gameId !== state2.gameId ||
      state1.gameStatus !== state2.gameStatus ||
      state1.myAddress !== state2.myAddress ||
      state1.player1.address !== state2.player1.address ||
      state1.player2.address !== state2.player2.address ||
      state1.player1Mana !== state2.player1Mana ||
      state1.player2Mana !== state2.player2Mana ||
      state1.player1HasDrawn !== state2.player1HasDrawn ||
      state1.player2HasDrawn !== state2.player2HasDrawn ||
      state1.sequenceNumber !== state2.sequenceNumber ||
      state1.turnNumber !== state2.turnNumber
    ) {
      console.log('some dumb diff');
      return false;
    }

    if (state1.pieces.length !== state2.pieces.length) {
      return false;
    }
    for (const p1 of state1.pieces) {
      let found = false;
      for (const p2 of state2.pieces) {
        if (p1.id === p2.id) {
          found = true;
          if (!this.checkPiecesEqual(p1, p2)) {
            console.log(p1);
            console.log(p2);
            return false;
          }
          break;
        }
      }
      if (!found) return false;
    }

    for (const [id, p1] of state1.pieceById) {
      const p2 = state2.pieceById.get(id);
      if (!p2) return false;
      if (!this.checkPiecesEqual(p1, p2)) return false;
    }
    for (const [id, p2] of state2.pieceById) {
      const p1 = state1.pieceById.get(id);
      if (!p1) return false;
      if (!this.checkPiecesEqual(p1, p2)) return false;
    }

    return true;
  }

  public checkPiecesEqual(p1: Piece, p2: Piece): boolean {
    if (
      p1.pieceType !== p2.pieceType ||
      p1.alive !== p2.alive ||
      p1.hp !== p2.hp ||
      p1.lastMove !== p2.lastMove ||
      p1.lastAttack !== p2.lastAttack ||
      p1.mvRange !== p2.mvRange ||
      p1.atkMinRange !== p2.atkMinRange ||
      p1.atkMaxRange !== p2.atkMaxRange ||
      p1.atk !== p2.atk ||
      p1.kamikaze !== p2.kamikaze
    ) {
      return false;
    }
    if (isZKPiece(p1) && isZKPiece(p2)) {
      // we don't update commitments so whatever
    } else if (!isZKPiece(p1) && !isZKPiece(p2)) {
      if (
        p1.location[0] !== p2.location[0] ||
        p1.location[1] !== p2.location[1]
      ) {
        return false;
      }
    } else {
      return false;
    }
    return true;
  }
}

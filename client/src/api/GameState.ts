import {
  AbstractPiece,
  BoardLocation,
  ChessGame,
  ChessGameContractData,
  EthAddress,
  GameAction,
  GameStatus,
  isAttackAction,
  isEndTurnAction,
  isLocatable,
  isMoveAction,
  isSummonAction,
  isZKPiece,
  KnownZKPiece,
  Piece,
  PieceStatDefaults,
  PieceType,
  Player,
  VisiblePiece,
  ZKPiece,
} from '../_types/global/GlobalTypes';
import _ from 'lodash';

export class GameState {
  gameAddress: EthAddress;
  gameId: string;

  myAddress: EthAddress;
  player1: Player;
  player2: Player;

  player1Mana: number;
  player2Mana: number;

  pieces: Piece[];
  pieceById: Map<number, Piece>;
  defaults: Map<PieceType, PieceStatDefaults>;
  gameActions: GameAction[];

  turnNumber: number;
  sequenceNumber: number;
  gameStatus: GameStatus;

  constructor(game: ChessGameContractData) {
    this.gameActions = [];

    this.update(game);
  }

  public update(contractData: ChessGameContractData) {
    this.gameId = contractData.gameId;
    this.myAddress = contractData.myAddress;
    this.player1 = contractData.player1;
    this.player2 = contractData.player2;
    this.player1Mana = contractData.player1Mana;
    this.player2Mana = contractData.player2Mana;
    this.defaults = contractData.defaults;
    this.turnNumber = contractData.turnNumber;
    this.sequenceNumber = contractData.sequenceNumber;
    this.gameStatus = contractData.gameStatus;

    this.pieces = [];
    this.pieceById = new Map<number, Piece>();

    for (let i = 0; i < contractData.pieces.length; i++) {
      let contractPiece = contractData.pieces[i];
      const defaultsForPiece = contractData.defaults.get(
        contractPiece.pieceType
      );
      if (!defaultsForPiece) continue;
      let piece: Piece = {
        ...contractPiece,
        mvRange: defaultsForPiece.mvRange,
        atkRange: defaultsForPiece.atkRange,
        atk: defaultsForPiece.atk,
        kamikaze: defaultsForPiece.kamikaze,
      };
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
          piece = knownPiece;
        }
      }
      this.pieces.push(piece);
      this.pieceById.set(piece.id, piece);
    }
    if (this.myAddress === this.player1.address) {
      if (this.gameStatus === GameStatus.P2_TO_MOVE) {
        this.gameActions = this.gameActions.slice(0, this.sequenceNumber);
      }
    } else if (this.myAddress === this.player2.address) {
      if (this.gameStatus === GameStatus.P1_TO_MOVE) {
        this.gameActions = this.gameActions.slice(0, this.sequenceNumber);
      }
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
      myAddress: this.myAddress,
      player1: this.player1,
      player2: this.player2,
      player1Mana: this.player1Mana,
      player2Mana: this.player2Mana,
      pieces: this.pieces,
      pieceById: this.pieceById,
      defaults: this.defaults,
      turnNumber: this.turnNumber,
      sequenceNumber: this.sequenceNumber,
      gameStatus: this.gameStatus,
    });
  }

  public getLatestState(): ChessGame {
    const state = this.getGameState();
    for (let i = state.sequenceNumber; i < this.gameActions.length; i++) {
      this.applyAction(state, this.gameActions[i]);
    }
    return state;
  }

  public getActions(): (GameAction | undefined)[] {
    return this.gameActions;
  }

  public applyAction(gameState: ChessGame, action: GameAction): ChessGame {
    // modifies gameState
    if (isSummonAction(action)) {
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
      } else if (gameState.myAddress === gameState.player2.address) {
        gameState.gameStatus = GameStatus.P1_TO_MOVE;
        gameState.turnNumber += 1;
        gameState.player1Mana = Math.min(gameState.turnNumber, 8);
        gameState.player2Mana = 0;
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
    const defaults = this.defaults.get(pieceType);
    if (!defaults) throw new Error('unknown piecetype');
    const base: AbstractPiece = {
      id: pieceId,
      owner,
      pieceType,
      alive: true,
      hp: defaults.hp,
      initializedOnTurn: this.turnNumber,
      lastMove: this.turnNumber,
      lastAttack: this.turnNumber,
      mvRange: defaults.mvRange,
      atkRange: defaults.atkRange,
      atk: defaults.atk,
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
      p1.initializedOnTurn !== p2.initializedOnTurn ||
      p1.lastMove !== p2.lastMove ||
      p1.lastAttack !== p2.lastAttack ||
      p1.mvRange !== p2.mvRange ||
      p1.atkRange !== p2.atkRange ||
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

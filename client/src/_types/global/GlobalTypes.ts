import { EventEmitter } from 'events';
import { Dispatch } from 'react';
import { SetStateAction } from 'react';

interface WindowEthereumObject extends EventEmitter {
  enable: () => void;
}

export interface Web3Object {
  currentProvider: Record<string, unknown>;
}

declare global {
  interface Window {
    // gameManager: any;
    // mimcHash: any;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    snarkjs: any;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    mimcHash: any;
  }
}

export type SetFn<S> = Dispatch<SetStateAction<S>>;
export type Hook<S> = [S, SetFn<S>];

export enum PieceType {
  Mothership_00,
  Cruiser_01,
  Frigate_02,
  Corvette_03,
  Submarine_04,
  Warship_05,
}

export type BoardLocation = [number, number]; // col, row

export type GameObject = {
  id: number;
  owner: EthAddress | null;
};

export type Locatable = {
  location: BoardLocation;
};

// strings so that they're non-falsy
export enum Color {
  BLACK = 'BLACK',
  WHITE = 'WHITE',
}

export type PieceStatDefaults = {
  pieceType: PieceType;
  mvRange: number;
  atkRange: number;
  hp: number;
  atk: number;
  cost: number;
  isZk: boolean;
  kamikaze: boolean;
};

// a piece but defaults aren't added in
type PartialPiece = GameObject & {
  pieceType: PieceType;
  alive: boolean;
  hp: number;
  initializedOnTurn: number;
  lastMove: number;
  lastAttack: number;
};

export type AbstractPiece = PartialPiece & {
  mvRange: number;
  atkRange: number;
  atk: number;
  kamikaze: boolean;
};

// received from contract

export type PartialVisiblePiece = PartialPiece & Locatable;

export type PartialZKPiece = PartialPiece & {
  commitment: string;
};

export type ContractPiece = PartialVisiblePiece | PartialZKPiece;

// used in client
export type VisiblePiece = AbstractPiece & PartialVisiblePiece;

export type ZKPiece = AbstractPiece & PartialZKPiece;

export type KnownZKPiece = ZKPiece &
  Locatable & {
    salt: string;
  };

export type Piece = VisiblePiece | ZKPiece;

export function isLocatable(piece: any): piece is Locatable {
  return (piece as Locatable).location !== undefined;
}

export function isZKPiece(piece: Piece): piece is ZKPiece {
  return (piece as ZKPiece).commitment !== undefined;
}

export function isVisiblePiece(piece: Piece): piece is VisiblePiece {
  return !isZKPiece(piece);
}

export function isKnown(piece: ZKPiece): piece is KnownZKPiece {
  return (piece as KnownZKPiece).location !== undefined;
}

export type PlayerInfo = {
  account: EthAddress;
  color: Color;
};

export type StagedLoc = [BoardLocation, Piece];

export enum GameStatus {
  WAITING_FOR_PLAYERS,
  P1_TO_MOVE,
  P2_TO_MOVE,
  COMPLETE,
}

export type ChessGameContractData = {
  gameAddress: EthAddress;
  gameId: string;

  nRows: number;
  nCols: number;

  myAddress: EthAddress;
  player1: Player;
  player2: Player;
  player1Mana: number;
  player2Mana: number;

  pieces: ContractPiece[];
  defaults: Map<PieceType, PieceStatDefaults>;

  turnNumber: number;
  sequenceNumber: number;
  gameStatus: GameStatus;
};

export type ChessGame = {
  gameAddress: EthAddress;
  gameId: string;

  nRows: number;
  nCols: number;

  myAddress: EthAddress;
  player1: Player;
  player2: Player;

  player1Mana: number;
  player2Mana: number;

  pieces: Piece[];
  pieceById: Map<number, Piece>;
  defaults: Map<PieceType, PieceStatDefaults>;

  turnNumber: number;
  sequenceNumber: number;
  gameStatus: GameStatus;
};

export type ChessCell = {
  // TODO should be able to have multiple ghosts
  piece?: VisiblePiece;
  ghost?: ZKPiece;
};

export type ChessBoard = ChessCell[][];

export type DisplayedCell = ChessCell & {
  canMove?: boolean;
};

export type DisplayedBoard = DisplayedCell[][];

export interface SnarkJSProof {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
}

export interface SnarkJSProofAndSignals {
  proof: SnarkJSProof;
  publicSignals: string[];
}

export type EthAddress = string & {
  __value__: never;
}; // this is expected to be 40 chars, lowercase hex. see src/utils/CheckedTypeUtils.ts for constructor

export interface Player {
  address: EthAddress;
  twitter?: string;
}

export type PlayerMap = Map<string, Player>;

export enum GameActionType {
  SUMMON,
  MOVE,
  ATTACK,
  END_TURN,
}

export interface GameAction {
  sequenceNumber: number;
  actionType: GameActionType;
  fromLocalData: boolean; // prioritize GameActions generated locally, they have more data
}

export interface SummonAction extends GameAction {
  actionType: GameActionType.SUMMON;
  player: EthAddress;
  pieceId: number;
  pieceType: PieceType;
  at?: BoardLocation;
}

export function isSummonAction(action: GameAction): action is SummonAction {
  return action.actionType === GameActionType.SUMMON;
}

export interface MoveAction extends GameAction {
  actionType: GameActionType.MOVE;
  pieceId: number;
  from?: BoardLocation;
  to?: BoardLocation;
}

export function isMoveAction(action: GameAction): action is MoveAction {
  return action.actionType === GameActionType.MOVE;
}

export interface AttackAction extends GameAction {
  actionType: GameActionType.ATTACK;
  attackerId: number;
  attackedId: number;
  attackerHp: number;
  attackedHp: number;
}

export function isAttackAction(action: GameAction): action is AttackAction {
  return action.actionType === GameActionType.ATTACK;
}

export interface EndTurnAction extends GameAction {
  actionType: GameActionType.END_TURN;
  player: EthAddress;
  turnNumber: number;
}

export function isEndTurnAction(action: GameAction): action is EndTurnAction {
  return action.actionType === GameActionType.END_TURN;
}

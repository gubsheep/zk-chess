import {EventEmitter} from 'events';
import {Dispatch} from 'react';
import {SetStateAction} from 'react';

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
  King,
  Knight,
  Ghost,
}

export type BoardLocation = [number, number];

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

type AbstractPiece = GameObject & {
  pieceType: PieceType;
  alive: boolean;
};

export type VisiblePiece = AbstractPiece & Locatable;

export type ZKPiece = AbstractPiece & {
  pieceType: PieceType.Ghost;
  commitment: string;
};

export type KnownZKPiece = ZKPiece &
  Locatable & {
    salt: string;
  };

export type Piece = VisiblePiece | ZKPiece;

export function isZKPiece(piece: Piece): piece is ZKPiece {
  return (piece as ZKPiece).commitment !== undefined;
}

export function isKnown(piece: ZKPiece): piece is KnownZKPiece {
  return (piece as KnownZKPiece).location !== undefined;
}

export type PlayerInfo = {
  account: EthAddress;
  color: Color;
};

export type Objective = GameObject &
  Locatable & {
    value: number;
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

  myAddress: EthAddress;
  player1: Player;
  player2: Player;

  pieces: Piece[];

  turnNumber: number;
  gameStatus: GameStatus;
  objectives: Objective[];
};

export type ChessGame = {
  gameAddress: EthAddress;
  gameId: string;

  myAddress: EthAddress;
  player1: Player;
  player2: Player;

  pieces: Piece[];

  turnNumber: number;
  gameStatus: GameStatus;

  objectives: Objective[];
};

export type ChessCell = {
  piece?: VisiblePiece;
  ghost?: ZKPiece;
  objective?: Objective;
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

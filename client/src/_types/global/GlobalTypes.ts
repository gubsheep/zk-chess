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
  }
}

export type SetFn<S> = Dispatch<SetStateAction<S>>;
export type Hook<S> = [S, SetFn<S>];

export enum PieceType {
  King,
  Knight,
}

export type BoardLocation = [number, number];

export type GameObject = {
  id: number;
  owner: EthAddress | null;
  location: BoardLocation;
};

// strings so that they're non-falsy
export enum Color {
  BLACK = 'BLACK',
  WHITE = 'WHITE',
}

export type Piece = GameObject & {
  pieceType: PieceType;
  captured: boolean;
};

export type Ghost = GameObject & {
  salt: string;
  commitment: string;
};

export type ContractGhost = {
  id: number;
  owner: EthAddress | null;
  commitment: string;
};
export type PlayerInfo = {
  account: EthAddress;
  color: Color;
};

export type Objective = GameObject & {
  value: number;
};

export type Selectable = Ghost | Piece;
export type StagedLoc = [BoardLocation, Selectable];

export enum GameStatus {
  WAITING_FOR_PLAYERS,
  P1_TO_MOVE,
  P2_TO_MOVE,
  COMPLETE,
}

export type ChessGameContractData = {
  myAddress: EthAddress;
  player1: Player;
  player2: Player;

  player1pieces: Piece[];
  player2pieces: Piece[];

  turnNumber: number;
  gameStatus: GameStatus;

  myContractGhost: ContractGhost;
  objectives: Objective[];
};

export type ChessGame = {
  myAddress: EthAddress;
  player1: Player;
  player2: Player;

  player1pieces: Piece[];
  player2pieces: Piece[];

  turnNumber: number;
  gameStatus: GameStatus;

  myGhost: Ghost;
  objectives: Objective[];
};

export type ChessCell = {
  piece?: Piece;
  ghost?: Ghost;
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

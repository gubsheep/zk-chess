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

export type HashedLocation = string;

export enum PieceType {
  Empty,
  King,
  Pawn,
  Queen,
  Knight,
}

export type BoardLocation = [number, number];

export type Piece = {
  pieceType: PieceType;
  location: BoardLocation;
};

export type Ghost = {
  location: BoardLocation;
  hashedLocation?: HashedLocation;
};

export type ChessGame = {
  player1pieces: Piece[];
  player1ghost: Ghost;
  player2pieces: Piece[];
  player2ghost: Ghost;
  size: number;
};

export type ChessCell = {
  piece?: Piece;
  ghost?: Ghost;
};

export type ChessBoard = ChessCell[][];

export type DisplayedCell = ChessCell & {
  canMove?: boolean;
}

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

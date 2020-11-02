import {BigNumber as EthersBN} from 'ethers';
import {BoardLocation} from '../../global/GlobalTypes';

// TODO write these types
export type ContractCallArgs = Array<unknown>;

export enum ZKArgIdx {
  PROOF_A,
  PROOF_B,
  PROOF_C,
  DATA,
}

export enum ProveArgIdx {
  OUTPUT,
}

export enum GhostMoveArgIdxs {
  OLD_COMMIT,
  NEW_COMMIT,
}

export enum ContractEvent {
  // TODO this should be 2 enums. one for game events, one for factory events
  CreatedGame = 'CreatedGame',
  GameStart = 'GameStart',
  MoveMade = 'MoveMade',
  GameFinished = 'GameFinished',
}

export enum ContractsAPIEvent {
  // TODO this should be 3 enums
  // one for factory events, one for game events, one for tx status changes
  CreatedGame = 'CreatedGame', // args: (gameId: EthersBN)

  GameStart = 'GameStart', // args: ()
  MoveMade = 'MoveMade', // args: ()
  GameFinished = 'GameFinished', // args: ()

  TxInitialized = 'TxInitialized', // args: (unminedTx: UnconfirmedTx)
  TxInitFailed = 'TxInitFailed', // args: (unminedTx: UnconfirmedTx, error: Error)
  TxSubmitted = 'TxSubmitted', // args: (unminedTx: SubmittedTx)
  TxFailed = 'TxFailed', // args: (unminedTx: SubmittedTx, error: Error)
  TxConfirmed = 'TxConfirmed', // args: (unminedTx: SubmittedTx)
}

export type ProofArgs = [
  [string, string], // proofA
  [
    // proofB
    [string, string],
    [string, string]
  ],
  [string, string], // proofC
  [
    string // hash
  ]
];

export type GhostMoveArgs = [
  [string, string], // proofA
  [
    // proofB
    [string, string],
    [string, string]
  ],
  [string, string], // proofC
  [
    string, // old commit
    string // new commit
  ]
];

export type RawPiece = {
  0: number;
  id?: number;

  1: number;
  pieceType?: number;

  2: string;
  owner?: string;

  3: number;
  row?: number;

  4: number;
  col?: number;

  5: boolean;
  dead?: boolean;

  6: EthersBN;
  commitment?: EthersBN;
};

export type RawObjective = {
  0: number;
  id?: number;

  1: number;
  value?: number;

  2: number;
  row?: number;

  3: number;
  col?: number;

  4: string;
  capturedBy?: string;
};

export enum EthTxType {
  CREATE_GAME = 'CREATE_GAME',
  JOIN_GAME = 'JOIN_GAME',
  MOVE = 'MOVE',
  GHOST_ATTACK = 'GHOST_ATTACK',
  GHOST_MOVE = 'GHOST_MOVE',
}

export type UnsubmittedAction = {
  // an intent to submit a transaction
  // we generate an ID so we can reference the tx
  // before it is submitted to chain and given a txHash
  actionId: string;
  type: EthTxType;
};

export type SubmittedTx = UnsubmittedAction & {
  txHash: string;
  sentAtTimestamp: number;
};

export type UnsubmittedCreateGame = UnsubmittedAction & {
  type: EthTxType.CREATE_GAME;
  gameId: number;
};

export type SubmtitedCreateGame = UnsubmittedCreateGame & SubmittedTx;

export type UnsubmittedJoin = UnsubmittedAction & {
  type: EthTxType.JOIN_GAME;
};

export type SubmittedJoin = UnsubmittedJoin & SubmittedTx;

export type UnsubmittedMove = UnsubmittedAction & {
  type: EthTxType.MOVE;
  pieceId: number;
  to: BoardLocation;
};

export type SubmittedMove = UnsubmittedMove & SubmittedTx;

export type UnsubmittedGhostAttack = UnsubmittedAction & {
  type: EthTxType.GHOST_ATTACK;
  pieceId: number;
  at: BoardLocation;
  salt: string;
};

export type SubmittedGhostAttack = UnsubmittedGhostAttack & SubmittedTx;

export type UnsubmittedGhostMove = UnsubmittedAction & {
  type: EthTxType.GHOST_MOVE;
  pieceId: number;
  to: BoardLocation;
  newSalt: string;
};

export type SubmittedGhostMove = UnsubmittedGhostAttack & SubmittedTx;

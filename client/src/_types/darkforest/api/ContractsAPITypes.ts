import {BigNumber as EthersBN} from 'ethers';
import {getRandomTxIntentId} from '../../../utils/Utils';
import {BoardLocation, PieceType} from '../../global/GlobalTypes';

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
  DidSummon = 'DidSummon', // args: (player: string, pieceId: number, sequenceNumber: number, pieceType: number, atRow: number, atCol: number)
  DidMove = 'DidMove', // args: (sequenceNumber: number, pieceId: number, fromRow: number, fromCol: number, toRow: number, toCol: number)
  DidAttack = 'DidAttack', // args: (sequenceNumber: number, attackerId: number, attackedId: number, attackerHp: number, attackedHp: number)
  DidEndTurn = 'DidEndTurn', // args: (player: string, turnNumber: number, sequenceNumber: number)
  GameFinished = 'GameFinished',
}

export enum ContractsAPIEvent {
  // TODO this should be 3 enums
  // one for factory events, one for game events, one for tx status changes
  CreatedGame = 'CreatedGame', // args: (gameId: EthersBN)

  GameStart = 'GameStart', // args: ()
  DidSummon = 'DidSummon', // args: (player: string, sequenceNumber: number, pieceType: number, atRow: number, atCol: number)
  DidMove = 'DidMove', // args: (sequenceNumber: number, pieceId: number, fromRow: number, fromCol: number, toRow: number, toCol: number)
  DidAttack = 'DidAttack', // args: (sequenceNumber: number, attackerId: number, attackedId: number, attackerHp: number, attackedHp: number)
  DidEndTurn = 'DidEndTurn', // args: (player: string, turnNumber: number, sequenceNumber: number)
  GameFinished = 'GameFinished', // args: ()

  TxInitialized = 'TxInitialized', // args: (unminedTx: UnconfirmedTx)
  TxInitFailed = 'TxInitFailed', // args: (unminedTx: UnconfirmedTx, error: Error)
  TxSubmitted = 'TxSubmitted', // args: (unminedTx: SubmittedTx)
  TxFailed = 'TxFailed', // args: (unminedTx: SubmittedTx, error: Error)
  TxConfirmed = 'TxConfirmed', // args: (unminedTx: SubmittedTx)
}

export type GhostSummonArgs = [
  [string, string], // proofA
  [
    // proofB
    [string, string],
    [string, string]
  ],
  [string, string], // proofC
  [
    string, // commit
    string, // port row
    string, // port col
    string, // dist
    string // board size
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
    string, // new commit
    string, // dist
    string // board size
  ]
];

export type GhostAttackArgs = [
  [string, string], // proofA
  [
    // proofB
    [string, string],
    [string, string]
  ],
  [string, string], // proofC
  [
    string, // old commit
    string, // attack row
    string, // attack col
    string, // dist
    string // board size
  ]
];

export type RawDefaults = {
  0: number;
  pieceType?: number;

  1: number;
  mvRange?: number;

  2: number;
  atkRange?: number;

  3: number;
  hp?: number;

  4: number;
  atk?: number;

  5: number;
  cost?: number;

  6: boolean;
  isZk?: boolean;

  7: boolean;
  kamikaze?: boolean;
};

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
  alive?: boolean;

  6: boolean;
  initialized?: boolean;

  7: number;
  hp?: number;

  8: number;
  initializedOnTurn?: number;

  9: EthersBN;
  commitment?: EthersBN;

  10: number;
  lastMove?: number;

  11: number;
  lastAttack?: number;
};

export enum EthTxType {
  CREATE_GAME = 'CREATE_GAME',
  JOIN_GAME = 'JOIN_GAME',
  SUMMON = 'SUMMON',
  MOVE = 'MOVE',
  ATTACK = 'ATTACK',
  END_TURN = 'END_TURN',
}

export type TxIntent = {
  // an intent to submit a transaction
  // we generate an ID so we can reference the tx
  // before it is submitted to chain and given a txHash
  txIntentId: string;
  type: EthTxType;
};

export type SubmittedTx = TxIntent & {
  txHash: string;
  sentAtTimestamp: number;
};

export type UnsubmittedCreateGame = TxIntent & {
  type: EthTxType.CREATE_GAME;
  gameId: number;
};

export type SubmtitedCreateGame = UnsubmittedCreateGame & SubmittedTx;

export type UnsubmittedJoin = TxIntent & {
  type: EthTxType.JOIN_GAME;
};

export type SubmittedJoin = UnsubmittedJoin & SubmittedTx;

export type UnsubmittedSummon = TxIntent & {
  type: EthTxType.SUMMON;
  turnNumber: number;
  sequenceNumber: number;
  pieceId: number;
  pieceType: PieceType;
  row: number;
  col: number;
  isZk: boolean;
  zkp: Promise<GhostSummonArgs>;
};

export function isSummon(txIntent: TxIntent): txIntent is UnsubmittedSummon {
  return txIntent.type === EthTxType.SUMMON;
}

export type SubmittedSummon = UnsubmittedSummon & SubmittedTx;

export const createEmptySummon = (): UnsubmittedSummon => ({
  txIntentId: getRandomTxIntentId(),
  turnNumber: 0,
  sequenceNumber: 0,
  type: EthTxType.SUMMON,
  pieceId: 0,
  pieceType: PieceType.King,
  row: 0,
  col: 0,
  isZk: false,
  zkp: Promise.resolve([
    ['0', '0'],
    [
      ['0', '0'],
      ['0', '0'],
    ],
    ['0', '0'],
    ['0', '0', '0', '0', '0'],
  ]),
});

export type UnsubmittedMove = TxIntent & {
  type: EthTxType.MOVE;
  turnNumber: number;
  sequenceNumber: number;
  pieceId: number;
  moveToRow: number[];
  moveToCol: number[];
  isZk: boolean;
  zkp: Promise<GhostMoveArgs>;
};

export function isMove(txIntent: TxIntent): txIntent is UnsubmittedMove {
  return txIntent.type === EthTxType.MOVE;
}

export type SubmittedMove = UnsubmittedMove & SubmittedTx;

export const createEmptyMove = (): UnsubmittedMove => ({
  txIntentId: getRandomTxIntentId(),
  turnNumber: 0,
  sequenceNumber: 0,
  type: EthTxType.MOVE,
  pieceId: 0,
  moveToRow: [],
  moveToCol: [],
  isZk: false,
  zkp: Promise.resolve([
    ['0', '0'],
    [
      ['0', '0'],
      ['0', '0'],
    ],
    ['0', '0'],
    ['0', '0', '0', '0'],
  ]),
});

export type UnsubmittedAttack = TxIntent & {
  type: EthTxType.ATTACK;
  turnNumber: number;
  sequenceNumber: number;
  pieceId: number;
  attackedId: number;
  row: number;
  col: number;
  isZk: boolean;
  zkp: Promise<GhostAttackArgs>;
};

export function isAttack(txIntent: TxIntent): txIntent is UnsubmittedAttack {
  return txIntent.type === EthTxType.ATTACK;
}

export type SubmittedAttack = UnsubmittedAttack & SubmittedTx;

export const createEmptyAttack = (): UnsubmittedAttack => ({
  txIntentId: getRandomTxIntentId(),
  turnNumber: 0,
  sequenceNumber: 0,
  type: EthTxType.ATTACK,
  pieceId: 0,
  attackedId: 0,
  row: 0,
  col: 0,
  isZk: false,
  zkp: Promise.resolve([
    ['0', '0'],
    [
      ['0', '0'],
      ['0', '0'],
    ],
    ['0', '0'],
    ['0', '0', '0', '0', '0'],
  ]),
});

export type UnsubmittedEndTurn = TxIntent & {
  type: EthTxType.END_TURN;
  turnNumber: number;
  sequenceNumber: number;
};

export function isEndTurn(txIntent: TxIntent): txIntent is UnsubmittedEndTurn {
  return txIntent.type === EthTxType.END_TURN;
}

export type SubmittedEndTurn = UnsubmittedEndTurn & SubmittedTx;

import {BigNumber as EthersBN} from 'ethers';
import {getRandomTxIntentId} from '../../../utils/Utils';
import {BoardLocation, EthAddress, PieceType} from '../../global/GlobalTypes';

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
  DidCardDraw = 'DidCardDraw', // args: (player: string, sequenceNumber: number)
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
  DidCardDraw = 'DidCardDraw', // args: (player: string, sequenceNumber: number)
  DidSummon = 'DidSummon', // args: (player: string, sequenceNumber: number, pieceType: number, atRow: number, atCol: number)
  DidMove = 'DidMove', // args: (sequenceNumber: number, pieceId: number, fromRow: number, fromCol: number, toRow: number, toCol: number)
  DidAttack = 'DidAttack', // args: (sequenceNumber: number, attackerId: number, attackedId: number, attackerHp: number, attackedHp: number)
  DidEndTurn = 'DidEndTurn', // args: (player: string, turnNumber: number, sequenceNumber: number)
  GameFinished = 'GameFinished', // args: ()

  TxInitialized = 'TxInitialized', // args: (txIntent: TxIntent)
  TxSubmitFailed = 'TxSubmitFailed', // args: (txIntent: TxIntent, error: Error)
  TxSubmitted = 'TxSubmitted', // args: (txIntent: SubmittedTx)
  TxReverted = 'TxReverted', // args: (txIntent: SubmittedTx, error: Error)
  TxConfirmed = 'TxConfirmed', // args: (txIntent: SubmittedTx)
}

export type CardDrawArgs = [
  [string, string], // proofA
  [
    // proofB
    [string, string],
    [string, string]
  ],
  [string, string], // proofC
  [
    string, // seed commit
    string, // new hand commit
    string, // old hand commit
    string // last turn timestamp
  ]
];

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
    string, // nrows
    string // ncols
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
    string, // nrows
    string // ncols
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
    string, // nrows
    string // ncols
  ]
];

export type GameMetadata = {
  gameId: string;
  NROWS: number;
  NCOLS: number;
  player1: EthAddress;
  player2: EthAddress;
  player1SeedCommit: string;
  player2SeedCommit: string;
};

export type RawGameMetadata = {
  0: EthersBN;
  gameId?: EthersBN;

  1: number;
  NROWS?: number;

  2: number;
  NCOLS?: number;

  3: string;
  player1?: string;

  4: string;
  player2?: string;

  5: EthersBN;
  player1SeedCommit?: EthersBN;

  6: EthersBN;
  player2SeedCommit?: EthersBN;
};

export type RawGameInfo = {
  0: number;
  turnNumber?: number;

  1: number;
  sequenceNumber?: number;

  2: number;
  gameState?: number;

  3: number;
  player1Mana?: number;

  4: number;
  player2Mana?: number;

  5: boolean;
  player1HasDrawn?: boolean;

  6: boolean;
  player2HasDrawn?: boolean;

  7: EthersBN;
  player1HandCommit?: EthersBN;

  8: EthersBN;
  player2HandCommit?: EthersBN;

  9: EthersBN;
  lastTurnTimestamp?: EthersBN;
};

export type RawCardPrototype = {
  0: number;
  id?: number;

  1: number;
  atkBuff?: number;

  2: number;
  damage?: number;

  3: number;
  heal?: number;
};

export type RawDefaults = {
  0: number;
  pieceType?: number;

  1: number;
  mvRange?: number;

  2: number;
  atkMinRange?: number;

  3: number;
  atkMaxRange?: number;

  4: number;
  hp?: number;

  5: number;
  atk?: number;

  6: number;
  cost?: number;

  7: boolean;
  isZk?: boolean;

  8: boolean;
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
  atk?: number;

  9: EthersBN;
  commitment?: EthersBN;

  10: number;
  lastMove?: number;

  11: number;
  lastAttack?: number;
};

export type RawObjective = {
  0: number;
  row?: number;

  1: number;
  col?: number;
};

export enum EthTxType {
  CREATE_GAME = 'CREATE_GAME',
  JOIN_GAME = 'JOIN_GAME',
  CARD_DRAW = 'CARD_DRAW',
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
  gameId: string;
};

export type SubmtitedCreateGame = UnsubmittedCreateGame & SubmittedTx;

export type UnsubmittedJoin = TxIntent & {
  type: EthTxType.JOIN_GAME;
  seedCommit: string;
};

export type SubmittedJoin = UnsubmittedJoin & SubmittedTx;

export type UnsubmittedCardDraw = TxIntent & {
  type: EthTxType.CARD_DRAW;
  turnNumber: number;
  sequenceNumber: number;
  cardId: number;
  atIndex: 0 | 1 | 2;
  zkp: Promise<CardDrawArgs>;
};

export function isCardDraw(
  txIntent: TxIntent
): txIntent is UnsubmittedCardDraw {
  return txIntent.type === EthTxType.CARD_DRAW;
}

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
  pieceType: PieceType.Cruiser_01,
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
    ['0', '0', '0', '0', '0', '0'],
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
    ['0', '0', '0', '0', '0'],
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
    ['0', '0', '0', '0', '0', '0'],
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

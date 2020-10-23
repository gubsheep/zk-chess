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

export enum MoveArgIdxs {
  FROM_ID,
  TO_ID,
  TO_PERLIN,
  TO_RADIUS,
  DIST_MAX,
  SHIPS_SENT,
  SILVER_SENT,
}

export enum ContractEvent {
  ProofVerified = 'ProofVerified',
}

export enum ContractsAPIEvent {
  PlayerInit = 'PlayerInit',
  PlanetUpdate = 'PlanetUpdate',
  TxInitialized = 'TxInitialized',
  TxInitFailed = 'TxInitFailed',
  TxSubmitted = 'TxSubmitted',
  TxConfirmed = 'TxConfirmed',
  RadiusUpdated = 'RadiusUpdated',
}

export type MoveSnarkArgs = [
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

export type MoveArgs = [
  [string, string], // proofA
  [
    // proofB
    [string, string],
    [string, string]
  ],
  [string, string], // proofC
  [
    string, // from locationID (BigInt)
    string, // to locationID (BigInt)
    string, // perlin at to
    string, // radius at to
    string, // distMax
    string, // ships sent
    string // silver sent
  ]
];

export type RawUpgrade = {
  0: EthersBN;
  popCapMultiplier?: EthersBN;

  1: EthersBN;
  popGroMultiplier?: EthersBN;

  2: EthersBN;
  rangeMultiplier?: EthersBN;

  3: EthersBN;
  speedMultiplier?: EthersBN;

  4: EthersBN;
  defMultiplier?: EthersBN;
};

export enum EthTxType {
  PROVE = 'PROVE',
  MOVE = 'MOVE',
}

export enum EthTxStatus {
  Init,
  Submit,
  Confirm,
  Fail,
}

export type UnconfirmedTx = {
  // we generate a txId so we can reference the tx
  // before it is submitted to chain and given a txHash
  actionId: string;
  type: EthTxType;
};

export type SubmittedTx = UnconfirmedTx & {
  txHash: string;
  sentAtTimestamp: number;
};

export type UnconfirmedProve = UnconfirmedTx & {
  output: string;
};

export type SubmittedProve = UnconfirmedProve & SubmittedTx;

export type UnconfirmedMove = UnconfirmedTx & {
  type: EthTxType.MOVE;
  from: BoardLocation;
  to: BoardLocation;
  pieceId: number;
};

export type SubmittedMove = UnconfirmedMove & SubmittedTx;

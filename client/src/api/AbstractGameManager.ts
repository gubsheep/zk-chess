import {EventEmitter} from 'events';
import {
  BoardLocation,
  ChessGame,
  Color,
  EthAddress,
} from '../_types/global/GlobalTypes';

export enum GameManagerEvent {
  TxInitialized = 'TxInitialized', // args: (unminedTx: UnconfirmedTx)
  TxInitFailed = 'TxInitFailed', // args: (unminedTx: UnconfirmedTx, error: Error)
  TxSubmitted = 'TxSubmitted', // args: (unminedTx: SubmtitedTx)
  TxFailed = 'TxFailed', // args: (unminedTx: SubmittedTx, error: Error)
  TxConfirmed = 'TxConfirmed', // args: (unminedTx: SubmittedTx)

  GameStart = 'GameStart', // args: (updatedGameState: ChessGame)
  MoveMade = 'MoveMade', // args: (updatedGameState: ChessGame)
  GameFinished = 'GameFinished', // args: (updatedGameState: ChessGame)
}

export default interface AbstractGameManager extends EventEmitter {
  destroy(): void;

  getAccount(): EthAddress | null;
  getEnemyAccount(): EthAddress | null;

  getGameAddr(): EthAddress | null;
  getGameState(): ChessGame;
  refreshGameState(): Promise<ChessGame>;

  joinGame(): void;
  movePiece(pieceId: number, to: BoardLocation): void;
  moveGhost(ghostId: number, to: BoardLocation): void;
  ghostAttack(): void;

  // should be in gameUImanager
  isMyTurn(): boolean;
}

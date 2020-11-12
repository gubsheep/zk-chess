import {EventEmitter} from 'events';
import {
  BoardLocation,
  ChessGame,
  EthAddress,
} from '../_types/global/GlobalTypes';

export enum GameManagerEvent {
  TxInitialized = 'TxInitialized', // args: (unminedTx: UnconfirmedTx)
  TxInitFailed = 'TxInitFailed', // args: (unminedTx: UnconfirmedTx, error: Error)
  TxSubmitted = 'TxSubmitted', // args: (unminedTx: SubmtitedTx)
  TxFailed = 'TxFailed', // args: (unminedTx: SubmittedTx, error: Error)
  TxConfirmed = 'TxConfirmed', // args: (unminedTx: SubmittedTx)

  CreatedGame = 'CreatedGame', // args: (gameId: number)
  GameStart = 'GameStart', // args: (updatedGameState: ChessGame)
  ActionMade = 'ActionMade', // args: (updatedGameState: ChessGame)
  GameFinished = 'GameFinished', // args: (updatedGameState: ChessGame)
}

export default interface AbstractGameManager extends EventEmitter {
  destroy(): void;

  refreshGameIdList(): Promise<void>;
  getAllGameIds(): string[];
  getGameState(): ChessGame;
  refreshGameState(): Promise<void>;
  setGame(gameId: string): Promise<void>;

  createGame(): Promise<void>;
  joinGame(): Promise<void>;
  movePiece(pieceId: number, to: BoardLocation): Promise<void>;
  endTurn(): Promise<void>;
}

import {EventEmitter} from 'events';
import {
  BoardLocation,
  ChessGame,
  GameAction,
} from '../_types/global/GlobalTypes';

export enum GameManagerEvent {
  // INTERNAL USE ONLY
  TxInitialized = 'TxInitialized', // args: (unminedTx: UnconfirmedTx)
  TxInitFailed = 'TxInitFailed', // args: (unminedTx: UnconfirmedTx, error: Error)
  TxSubmitted = 'TxSubmitted', // args: (unminedTx: SubmtitedTx)
  TxFailed = 'TxFailed', // args: (unminedTx: SubmittedTx, error: Error)
  TxConfirmed = 'TxConfirmed', // args: (unminedTx: SubmittedTx)

  // EMITTED FOR UI
  CreatedGame = 'CreatedGame', // args: (gameId: number)
  GameStart = 'GameStart', // args: (updatedGameState: ChessGame)
  StateAdvanced = 'StateAdvanced', // args: (gameState: ChessGame, actions: GameAction[])
  StateRewinded = 'StateRewinded', // args: (gameState: ChessGame, actions: GameAction[])
  ActionsUpdated = 'ActionsUpdated', // args: (actions: GameAction[])
}

export default interface AbstractGameManager extends EventEmitter {
  destroy(): void;

  refreshGameIdList(): Promise<void>;
  getAllGameIds(): string[];
  getGameState(): ChessGame;
  getLatestGameState(): ChessGame;
  getActions(): (GameAction | undefined)[];
  refreshGameState(): Promise<void>;
  setGame(gameId: string): Promise<void>;

  createGame(): Promise<void>;
  joinGame(): Promise<void>;
  movePiece(pieceId: number, to: BoardLocation): Promise<void>;
  endTurn(): Promise<void>;
}

import {EventEmitter} from 'events';
import {BoardLocation, ChessGame} from '../../_types/global/GlobalTypes';

export enum GameUIManagerEvent {
  JoinedGame = 'JoinedGame', // args: ()
  GameStart = 'GameStart', // args: ()
  MoveAccepted = 'MoveAccepted', // args: ()
  MoveConfirmed = 'MoveConfirmed', // args: ()
}

export default interface AbstractUIManager extends EventEmitter {
  destroy(): void;

  joinGame(): Promise<void>;
  getGameState(): ChessGame;
  movePiece(pieceId: number, to: BoardLocation): void;
  moveGhost(ghostId: number, to: BoardLocation): void;
  ghostAttack(): void;
}

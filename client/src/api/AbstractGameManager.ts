import { EventEmitter } from 'events';
import {
  BoardLocation,
  ChessGame,
  EthAddress,
} from '../_types/global/GlobalTypes';

export enum GameManagerEvent {
  JoinedGame = 'JoinedGame', // args: ()
  GameStart = 'GameStart', // args: ()
  MoveAccepted = 'MoveAccepted', // args: ()
  MoveConfirmed = 'MoveConfirmed', // args: ()
}

export default interface AbstractGameManager extends EventEmitter {
  destroy(): void;

  getAccount(): EthAddress | null;
  isMyTurn(): boolean;

  getGameAddr(): EthAddress | null;
  getGameState(): ChessGame;

  joinGame(): Promise<void>;
  movePiece(pieceId: number, to: BoardLocation): void;
  moveGhost(ghostId: number, to: BoardLocation): void;
  ghostAttack(): void;

  makeProof(): AbstractGameManager;
}

import { EventEmitter } from 'events';
import {
  BoardLocation,
  ChessGame,
  Color,
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

  getGameAddr(): EthAddress | null;
  getGameState(): ChessGame;

  joinGame(): Promise<void>;
  movePiece(pieceId: number, to: BoardLocation): void;
  moveGhost(ghostId: number, to: BoardLocation): void;
  ghostAttack(): void;

  makeProof(): AbstractGameManager;

  // should be in gameUImanager
  isMyTurn(): boolean;
  getColor(account: EthAddress | null): Color | null;
}

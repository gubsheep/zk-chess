import {EventEmitter} from 'events';
import {
  BoardLocation,
  ChessGame,
  EthAddress,
} from '../_types/global/GlobalTypes';

export enum GameManagerEvent {
  JoinedGame = 'JoinedGame', // args: ()
  GameStart = 'GameStart', // args: ()
  GameUpdate = 'GameUpdate', // args: ()
}

export default interface AbstractGameManager extends EventEmitter {
  destroy(): void;

  getGameAddr(): EthAddress | null;
  getGameState(): ChessGame;

  joinGame(gameAddr: EthAddress): Promise<void>;
  movePiece(pieceId: number, to: BoardLocation): Promise<void>;
  moveGhost(ghostId: number, to: BoardLocation): Promise<void>;
  ghostAttack(): Promise<void>;
}

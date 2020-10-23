import {EventEmitter} from 'events';
import {BoardLocation, ChessGame} from '../../_types/global/GlobalTypes';

export default interface AbstractUIManager extends EventEmitter {
  destroy(): void;

  joinGame(): Promise<void>;
  getGameState(): ChessGame;
  movePiece(pieceId: number, to: BoardLocation): void;
}

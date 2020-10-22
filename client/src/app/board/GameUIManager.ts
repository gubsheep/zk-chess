import autoBind from 'auto-bind';
import { EventEmitter } from 'events';
import AbstractUIManager from './AbstractUIManager';
import AbstractGameManager from '../../api/AbstractGameManager';
import { GameManagerEvent } from '../../api/GameManager';

export enum GameUIManagerEvent {
  BoardUpdate = 'BoardUpdate',
}

class GameUIManager extends EventEmitter implements AbstractUIManager {
  private gameManager: AbstractGameManager;

  // lifecycle methods
  private constructor(gameManager: AbstractGameManager) {
    super();

    this.gameManager = gameManager;
    autoBind(this);
  }

  static create(gameManager: AbstractGameManager) {
    const uiManager = new GameUIManager(gameManager);

    uiManager.addListener(GameManagerEvent.PieceMoved, uiManager.pieceMoved);

    return uiManager;
  }

  destroy(): void {
    this.gameManager.destroy();
    this.removeAllListeners(GameManagerEvent.PieceMoved);
  }

  private pieceMoved() {
    this.emit(GameUIManagerEvent.BoardUpdate);
    console.log('piece moved!');
  }
}

export default GameUIManager;

import { EventEmitter } from 'events';

// enum GameEvent {
//   PieceSelected = 'PieceSelected',
// }

class GameEventManager extends EventEmitter {
  private static instance: GameEventManager;

  private constructor() {
    super();
  }

  static getInstance(): GameEventManager {
    if (!GameEventManager.instance) {
      GameEventManager.instance = new GameEventManager();
    }
    return GameEventManager.instance;
  }
}

export default GameEventManager;

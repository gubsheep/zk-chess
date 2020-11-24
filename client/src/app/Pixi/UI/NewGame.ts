import { PixiManager } from '../../../api/PixiManager';
import { LinkObject } from '../Utils/LinkObject';

export class NewGame extends LinkObject {
  handler: () => void;
  constructor(manager: PixiManager, handler: () => void = () => {}) {
    super(manager, 'Click to create new game');
    this.handler = handler;
  }

  onClick() {
    this.manager.api.newGame();
    this.handler();
  }
}

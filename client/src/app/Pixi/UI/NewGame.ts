import { PixiManager } from '../../../api/PixiManager';
import { LinkObject } from '../Utils/LinkObject';

export class NewGame extends LinkObject {
  handler: () => void;
  constructor(manager: PixiManager, handler: () => void = () => {}) {
    super(manager, 'Click to create new game');
    this.handler = handler;
  }

  async onClick() {
    super.onClick();
    await this.manager.api.newGame();
    await this.handler();
  }
}

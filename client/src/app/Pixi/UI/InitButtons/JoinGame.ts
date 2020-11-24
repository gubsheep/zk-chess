import { PixiManager } from '../../../../api/PixiManager';
import { LinkObject } from '../../Utils/LinkObject';

export class JoinGame extends LinkObject {
  constructor(manager: PixiManager) {
    super(manager, 'Click to join game');
  }

  onClick() {
    super.onClick();
    this.manager.api.joinGame();
  }
}

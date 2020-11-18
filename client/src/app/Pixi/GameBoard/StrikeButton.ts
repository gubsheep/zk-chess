import { PixiManager } from '../../../api/PixiManager';
import { LinkObject } from '../Utils/LinkObject';
import { TextAlign } from '../Utils/Text';

export class StrikeButton extends LinkObject {
  constructor(manager: PixiManager) {
    super(manager, 'Strike!', TextAlign.Right);
  }
  onClick() {
    this.manager.mouseManager.attackSub();
  }
  isEnabled() {
    return this.manager.api.isMyTurn();
  }
}

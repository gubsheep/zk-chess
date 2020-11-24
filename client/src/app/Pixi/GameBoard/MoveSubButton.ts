import { PixiManager } from '../../../api/PixiManager';
import { LinkObject } from '../Utils/LinkObject';
import { TextAlign } from '../Utils/TextObject';

export class MoveSubButton extends LinkObject {
  constructor(manager: PixiManager) {
    super(manager, 'Move Sub', TextAlign.Right);
  }
  onClick() {
    super.onClick();
    this.manager.mouseManager.moveSub();
  }
  isEnabled() {
    return this.manager.api.isMyTurn();
  }
}

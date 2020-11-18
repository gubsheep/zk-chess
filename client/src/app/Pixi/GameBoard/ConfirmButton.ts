import { PixiManager } from '../../../api/PixiManager';
import { LinkObject } from '../Utils/LinkObject';
import { TextAlign } from '../Utils/Text';

export class ConfirmButton extends LinkObject {
  constructor(manager: PixiManager) {
    super(manager, 'Confirm', TextAlign.Right);
  }
  onClick() {
    this.manager.mouseManager.confirm();
  }
  isEnabled() {
    const {
      api,
      mouseManager: { selectedShip, moveStaged, attackStaged, deployStaged },
    } = this.manager;
    if (!api.isMyTurn) return false;
    if (selectedShip?.isZk()) return true;
    else if (moveStaged || attackStaged || deployStaged) {
      return true;
    }

    return false;
  }
}

import { PixiManager } from '../../../api/PixiManager';
import { LinkObject } from '../Utils/LinkObject';
import { TextAlign } from '../Utils/Text';

export class CancelButton extends LinkObject {
  constructor(manager: PixiManager) {
    super(manager, 'Cancel', TextAlign.Right);
  }
  onClick() {
    this.manager.mouseManager.cancel();
  }
  isEnabled() {
    const { api, mouseManager } = this.manager;
    return !!(api.isMyTurn() && mouseManager.selectedShip);
  }
}

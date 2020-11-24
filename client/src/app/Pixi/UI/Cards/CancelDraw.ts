import { PixiManager } from '../../../../api/PixiManager';
import { LinkObject } from '../../Utils/LinkObject';
import { TextAlign } from '../../Utils/TextObject';

export class CancelDraw extends LinkObject {
  constructor(manager: PixiManager) {
    super(manager, 'Cancel Draw', TextAlign.Right);
  }

  onClick() {
    this.manager.mouseManager.cancel();
  }
}

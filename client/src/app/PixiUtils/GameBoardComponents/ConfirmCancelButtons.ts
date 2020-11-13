import { PixiManager, GameZIndex } from '../../../api/PixiManager';
import { CHAR_H, LINE_SPACING } from '../FontLoader';
import { GameObject } from '../GameObject';

// TODO make a GridObject class?
export class ConfirmCancelButtons extends GameObject {
  constructor(manager: PixiManager) {
    super(manager, GameZIndex.UI);
    const container = this.object;

    const fontLoader = manager.fontLoader;

    const cancel = fontLoader('Cancel').object;
    const confirm = fontLoader('Confirm').object;

    confirm.y = CHAR_H + LINE_SPACING;
    cancel.x = -cancel.width;
    confirm.x = -confirm.width;

    container.addChild(cancel, confirm);

    cancel.interactive = true;
    cancel.on('click', this.onCancel);
    confirm.interactive = true;
    confirm.on('click', this.onConfirm);

    const endTurn = fontLoader('End Turn').object;
    endTurn.position.set(-endTurn.width, 2 * (CHAR_H + LINE_SPACING));
    endTurn.interactive = true;
    endTurn.on('click', this.endTurn);

    container.addChild(endTurn);
  }

  private onCancel() {
    this.manager.mouseManager.cancel();
  }

  private onConfirm() {
    this.manager.mouseManager.confirm();
  }

  private endTurn() {
    this.manager.mouseManager.endTurn();
  }

  positionGrid(gridW: number, gridH: number) {
    this.setPosition({
      y: gridH + 2,
      x: gridW - 2,
    });
  }
}

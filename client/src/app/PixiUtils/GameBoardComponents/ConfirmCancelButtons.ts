import { PixiManager, GameZIndex } from '../../../api/PixiManager';
import { CHAR_H, LINE_SPACING } from '../FontLoader';
import { GameObject } from '../GameObject';
import { LinkObject, TextAlign } from '../Text';

// TODO make a GridObject class?
export class ConfirmCancelButtons extends GameObject {
  constructor(manager: PixiManager) {
    super(manager, GameZIndex.UI);

    const cancel = new LinkObject(
      manager,
      'Cancel',
      this.onCancel,
      TextAlign.Right
    );

    const confirm = new LinkObject(
      manager,
      'Confirm',
      this.onConfirm,
      TextAlign.Right
    );
    confirm.setPosition({ x: 0, y: CHAR_H + LINE_SPACING });

    const endTurn = new LinkObject(
      manager,
      'End Turn',
      this.endTurn,
      TextAlign.Right
    );
    endTurn.setPosition({ x: 0, y: 2 * (CHAR_H + LINE_SPACING) });

    this.addChild(cancel, confirm, endTurn);
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

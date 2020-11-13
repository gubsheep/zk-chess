import * as PIXI from 'pixi.js';
import { PixiManager, GameZIndex } from '../../../api/PixiManager';
import { CHAR_H, LINE_SPACING } from '../FontLoader';
import { GameObject } from '../GameObject';

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
  }

  private onCancel() {
    this.manager.mouseManager.cancel();
  }

  private onConfirm() {
    this.manager.mouseManager.confirm();
  }

  positionGrid(gridW: number, gridH: number) {
    this.setPosition({
      y: gridH + 2,
      x: gridW - 2,
    });
  }
}

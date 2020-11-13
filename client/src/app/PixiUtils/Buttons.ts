import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../api/PixiManager';
import { CHAR_H, LINE_SPACING } from './FontLoader';
import { GameObject } from './GameObject';

export enum ShowingState {
  ShowingShips,
  ShowingSubmarines,
  DEFAULT = ShowingShips,
}

export class ToggleButton extends GameObject {
  showSubmarines: PIXI.DisplayObject;
  showShips: PIXI.DisplayObject;

  showState: ShowingState;

  constructor(manager: PixiManager) {
    const container = new PIXI.Container();
    super(manager, container, GameZIndex.UI);
    const fontLoader = manager.fontLoader;

    const showSubmarines = fontLoader('Show Submarines').object;
    const showShips = fontLoader('Show Ships').object;

    container.addChild(showShips, showSubmarines);

    container.interactive = true;
    // container.hitArea = new PIXI.Rectangle(0, 0, 100, 16);
    container.on('mousedown', () => alert());

    this.showShips = showShips;
    this.showSubmarines = showSubmarines;

    this.setShowingState(ShowingState.DEFAULT);
    this.showState = ShowingState.DEFAULT;
  }

  setShowingState(state: ShowingState) {
    if (state === ShowingState.ShowingShips) {
      this.showShips.visible = false;
      this.showSubmarines.visible = true;
    } else {
      this.showShips.visible = true;
      this.showSubmarines.visible = false;
    }
  }
}

export class ConfirmCancelButtons extends GameObject {
  constructor(manager: PixiManager) {
    const container = new PIXI.Container();
    super(manager, container, GameZIndex.UI);

    const fontLoader = manager.fontLoader;

    const cancel = fontLoader('Cancel').object;
    const confirm = fontLoader('Confirm').object;
    confirm.y = CHAR_H + LINE_SPACING;
    cancel.x = -cancel.width;
    confirm.x = -confirm.width;

    container.addChild(cancel, confirm);
    this.positionSelf();

    cancel.interactive = true;
    cancel.on('click',  this.onCancel);
    confirm.interactive = true;
    confirm.on('click', this.onConfirm);
  }

  private onCancel() {
    this.manager.mouseManager.cancel();
  }

  private onConfirm() {
    this.manager.mouseManager.confirm();
  }

  private positionSelf() {
    const { right, bottom } = this.manager.gameBoard.bounds;
    this.setPosition({ x: right - 2, y: bottom + 2 });
  }
}

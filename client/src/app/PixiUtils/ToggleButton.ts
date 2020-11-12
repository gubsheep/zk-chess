import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../api/PixiManager';
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
    const fontLoader = manager.fontLoader;

    const showSubmarines = fontLoader('Show Submarines').object;
    const showShips = fontLoader('Show Ships').object;

    container.addChild(showShips, showSubmarines);

    container.interactive = true;
    // container.hitArea = new PIXI.Rectangle(0, 0, 100, 16);
    container.on('mousedown', () => alert());

    super(manager, container, GameZIndex.UI);

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

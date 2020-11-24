import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../../api/PixiManager';
import { ClickState } from '../MouseManager';
import { GameGrid } from './GameGrid';
import { GameBoardObject } from './GridObject';
import { TextAlign } from '../Utils/TextObject';
import { LinkObject } from '../Utils/LinkObject';

class ToggleText extends LinkObject {
  showZk: boolean = false;
  constructor(manager: PixiManager) {
    super(manager, '', TextAlign.Left);
    this.showZk = false;
    this.syncText();
  }

  private syncText(): void {
    this.setText(this.showZk ? 'Show Ships' : 'Show Submarines');
    this.manager.mouseManager.setShowZk(this.showZk);
  }
  onClick() {
    this.showZk = !this.showZk;
    this.syncText();
    this.manager.mouseManager.setClickState(ClickState.None);
  }

  loop() {
    super.loop();
    this.syncText();
  }
}
export class ToggleButton extends GameBoardObject {
  text: LinkObject;

  constructor(manager: PixiManager, grid: GameGrid) {
    super(manager, grid);

    const text = new ToggleText(manager);
    this.text = text;
    this.addChild(text);
  }

  positionGrid(_gridW: number, gridH: number) {
    this.setPosition({
      y: gridH + 1,
      x: 0,
    });
  }
}

import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../api/PixiManager';
import { GameObject } from './GameObject';
import { LinkObject, TextAlign } from './Text';

export class ToggleButton extends GameObject {
  text: LinkObject;

  showZk: boolean = false;

  constructor(manager: PixiManager) {
    super(manager, GameZIndex.UI);

    const text = new LinkObject(manager, '', this.toggleZk, TextAlign.Left);
    this.text = text;
    this.addChild(text);

    this.syncText();
  }

  toggleZk(showZk: boolean): void {
    this.showZk = !this.showZk;
    this.syncText();
  }

  private syncText(): void {
    this.text.setText(this.showZk ? 'Show Submarines' : 'Show Ships');
  }

  positionGrid(_gridW: number, gridH: number) {
    this.setPosition({
      y: gridH + 2,
      x: 0,
    });
  }
}

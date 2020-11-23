import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { PixiObject } from '../PixiObject';
import { UI } from '../Utils/TextureLoader';

export class SetSail extends PixiObject {
  initGame: () => void;
  constructor(manager: PixiManager, initGame: () => void) {
    super(manager);
    this.initGame = initGame;

    const cache = PIXI.utils.TextureCache;
    const title = new PIXI.Sprite(cache[UI.SETSAIL]);

    this.object.addChild(title);

    this.positionSelf();
    this.setInteractive({ click: this.onClick });
  }

  positionSelf() {
    const { width, height } = this.manager.renderer;
    this.setPosition({
      x: Math.floor(width - this.object.width - 40),
      y: Math.floor(height / 2),
    });
  }

  private onClick() {
    this.initGame();
  }
}

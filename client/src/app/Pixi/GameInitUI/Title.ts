import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { PixiObject } from '../PixiObject';
import { UI } from '../Utils/TextureLoader';

export class Title extends PixiObject {
  constructor(manager: PixiManager) {
    super(manager);

    const cache = PIXI.utils.TextureCache;
    const title = new PIXI.Sprite(cache[UI.TITLE]);

    this.object.addChild(title);

    this.positionSelf();
  }

  positionSelf() {
    const { width, height } = this.manager.renderer;
    this.setPosition({ x: 0.5 * (width - this.object.width), y: 20 });
  }
}

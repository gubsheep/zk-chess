import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { PixiObject } from '../PixiObject';
import { UI } from '../Utils/TextureLoader';

export class Title extends PixiObject {
  constructor(manager: PixiManager) {
    super(manager);

    const cache = PIXI.utils.TextureCache;
    const title = new PIXI.Sprite(cache[UI.TITLE]);
    title.x = Math.floor(-title.width / 2);

    this.object.addChild(title);

    this.positionSelf();
  }

  positionSelf() {
    const { width, height } = this.manager.renderer;
    this.setPosition({
      x: Math.floor(0.5 * width),
      y: Math.floor(20),
    });
  }

  loop() {
    super.loop();

    this.setRotation(0.2 * Math.sin(this.lifetime / 15));

    const scale = 1 + 0.1 * Math.sin(this.lifetime / 20);
    this.setScale({ x: scale, y: scale });
  }
}

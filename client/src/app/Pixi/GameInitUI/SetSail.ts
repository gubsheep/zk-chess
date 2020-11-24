import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { PixiObject } from '../PixiObject';
import { playSFX, SFX } from '../Utils/SoundLoader';
import { UI } from '../Utils/TextureLoader';

export class SetSail extends PixiObject {
  initGame: () => void;
  hover: boolean;

  title: PIXI.Sprite;
  constructor(manager: PixiManager, initGame: () => void) {
    super(manager);
    this.initGame = initGame;
    this.hover = false;

    const cache = PIXI.utils.TextureCache;
    this.title = new PIXI.Sprite(cache[UI.SETSAIL]);
    this.title.pivot.x = Math.floor(this.title.width / 2);
    this.title.pivot.y = Math.floor(this.title.height / 2);

    this.object.addChild(this.title);

    this.positionSelf();

    const hitArea = new PIXI.Rectangle(
      this.title.x - this.title.width / 2 - 10,
      this.title.y - this.title.height / 2 - 10,
      this.title.width + 20,
      this.title.height + 20
    );
    this.setInteractive({
      hitArea,
      click: this.onClick,
      mouseover: this.onMouseOver,
      mouseout: this.onMouseOut,
    });
  }

  positionSelf() {
    const { width, height } = this.manager.renderer;
    this.setPosition({
      x: Math.floor(width - this.object.width + 10),
      y: Math.floor(height / 2),
    });
  }

  private onClick() {
    playSFX(SFX.MenuInit);
    this.initGame();
  }
  private onMouseOver() {
    this.hover = true;
  }
  private onMouseOut() {
    this.hover = false;
  }

  loop() {
    super.loop();

    if (this.hover) {
      this.title.rotation = 0.2 * Math.sin(this.lifetime / 13.37);

      const scale = 1 + 0.1 * Math.sin(this.lifetime / 18.9);
      this.title.scale.set(scale, scale);
    } else {
      this.title.rotation = 0;
      this.title.scale.set(1, 1);
    }
  }
}

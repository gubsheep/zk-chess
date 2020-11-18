import * as PIXI from 'pixi.js';
import { DisplayObject } from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { PixiObject } from '../PixiObject';
import { BUBBLE_CLOSED, BUBBLE_OPEN } from './TextureLoader';

export class Bubble extends PixiObject {
  state: number;

  closed: DisplayObject;
  open: DisplayObject;

  constructor(manager: PixiManager) {
    super(manager);
    this.state = 0;

    const cache = PIXI.utils.TextureCache;

    this.closed = new PIXI.Sprite(cache[BUBBLE_CLOSED]);
    this.open = new PIXI.Sprite(cache[BUBBLE_OPEN]);

    this.object.addChild(this.closed, this.open);

    this.setPosition({ x: 7, y: 4 });
  }

  private draw() {
    this.open.visible = this.state === 3;
    this.closed.visible = this.state !== 3 && this.state !== 4;

    if (this.state === 0) {
      this.closed.position.set(0, 0);
    } else if (this.state === 1) {
      this.closed.position.set(-2, -5);
    } else if (this.state === 2) {
      this.closed.position.set(2, -9);
    } else if (this.state === 3) {
      this.open.position.set(-2, -12);
    }
  }

  tick() {
    this.state++;
    this.state = this.state % 5;
  }

  loop() {
    super.loop();

    this.draw();
  }
}

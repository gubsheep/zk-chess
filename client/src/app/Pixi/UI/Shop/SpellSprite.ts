import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../../api/PixiManager';
import { CardType } from '../../@PixiTypes';
import { PixiObject } from '../../PixiObject';
import { CARDS, SPRITE_W } from '../../Utils/TextureLoader';

export class SpellSprite extends PixiObject {
  rect: PIXI.Graphics;
  type: CardType;

  constructor(manager: PixiManager, type: CardType) {
    super(manager);

    const rect = new PIXI.Graphics();
    this.object.addChild(rect);

    this.rect = rect;
    this.setType(type);
  }

  setType(type: CardType) {
    this.type = type;
  }

  loop() {
    const cache = PIXI.utils.TextureCache;
    super.loop();
    this.rect.clear();

    this.rect.beginTextureFill({ texture: cache[CARDS[this.type]] });
    this.rect.drawRect(0, 0, SPRITE_W, SPRITE_W);
    this.rect.endFill();
  }
}

import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../../api/PixiManager';
import { CardType, LineAlignment } from '../../@PixiTypes';
import { PixiObject } from '../../PixiObject';
import { CARDS, SPRITE_W } from '../../Utils/TextureLoader';
import { CARD_W, CARD_H } from './ShopCard';
import { SpellSprite } from './SpellSprite';

export class SpellCard extends PixiObject {
  type: CardType;
  bgOverlay: PIXI.DisplayObject;

  hover: boolean;
  sprite: SpellSprite;

  constructor(manager: PixiManager, type: CardType) {
    const cache = PIXI.utils.TextureCache;
    super(manager);
    this.type = type;

    const bg = new PIXI.Graphics();
    bg.beginFill(0x333388, 0.4);
    bg.drawRoundedRect(0, 0, CARD_W, CARD_H, 4);
    bg.endFill();

    const bgOverlay = new PIXI.Graphics();
    bgOverlay.beginFill(0x666699, 0.7);
    bgOverlay.lineStyle(2, 0x9999cc, 0.8, LineAlignment.Inner);
    bgOverlay.drawRoundedRect(0, 0, CARD_W, CARD_H, 4);
    bgOverlay.endFill();
    this.bgOverlay = bgOverlay;

    this.sprite = new SpellSprite(manager, type);
    this.sprite.setPosition({
      x: 0.5 * (CARD_W - SPRITE_W),
      y: 0.5 * (CARD_H - SPRITE_W),
    });

    this.object.addChild(bg, bgOverlay);
    this.addChild(this.sprite);
  }

  setHover(hover: boolean): void {
    this.hover = hover;
  }

  setType(type: CardType) {
    this.type = type;
    this.sprite.setType(type);
  }

  loop() {
    super.loop();

    this.setAlpha(this.type === CardType.EMPTY_00 ? 0.5 : 1);
    this.bgOverlay.visible = this.hover && this.type !== CardType.EMPTY_00;
  }
}

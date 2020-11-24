import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../../api/PixiManager';
import { PieceType } from '../../../../_types/global/GlobalTypes';
import { LineAlignment } from '../../@PixiTypes';
import { PixiObject } from '../../PixiObject';
import { ShipSprite } from '../../Ships/ShipSprite';
import { CHAR_W } from '../../Utils/FontLoader';
import {
  getCoinSprite,
  BASELINE_ICONS,
  SPRITE_W,
} from '../../Utils/TextureLoader';

export const CARD_W = 38;
export const CARD_H = 38;

export class ShopCard extends PixiObject {
  type: PieceType;
  hover: boolean;
  bgOverlay: PIXI.DisplayObject;
  sprite: ShipSprite;

  constructor(manager: PixiManager, type: PieceType) {
    super(manager);
    this.type = type;
    this.hover = false;

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

    const sprite = new ShipSprite(manager, type, manager.api.getMyColor());
    this.sprite = sprite;
    const data = this.manager.api.getStats(type);

    const textContainer = new PIXI.Container();
    const text = manager.fontLoader(`${data.cost}`, 0xffffff).object;
    const goldIcon = getCoinSprite();
    goldIcon.position.set(CHAR_W + 2, BASELINE_ICONS);
    textContainer.addChild(text, goldIcon);

    sprite.setPosition({
      x: 0.5 * (CARD_W - SPRITE_W),
      y: CARD_H - SPRITE_W - 3,
    });
    textContainer.position.set(CARD_W - textContainer.width - 3, 3);

    // TODO refactor card into a gameobject
    this.object.addChild(bg, bgOverlay, textContainer);
    this.addChild(sprite);
  }

  setHover(hover: boolean): void {
    this.hover = hover;
  }

  loop() {
    super.loop();
    this.bgOverlay.visible = this.hover;

    this.sprite.setColor(this.manager.api.getMyColor());
  }
}

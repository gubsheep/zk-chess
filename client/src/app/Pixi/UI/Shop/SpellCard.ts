import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../../api/PixiManager';
import { CardType, LineAlignment } from '../../@PixiTypes';
import { ClickState } from '../../MouseManager';
import { PixiObject, Wrapper } from '../../PixiObject';
import { CHAR_W } from '../../Utils/FontLoader';
import {
  BASELINE_ICONS,
  CARDS,
  getCoinSprite,
  SPRITE_W,
} from '../../Utils/TextureLoader';
import { CARD_W, CARD_H } from './ShopCard';
import { SpellSprite } from './SpellSprite';

export class SpellCard extends PixiObject {
  type: CardType;

  bg: Wrapper;
  bgOverlay: PIXI.DisplayObject;
  outline: PIXI.DisplayObject;
  showOutline: boolean;

  hover: boolean;
  sprite: SpellSprite;

  idx: number;

  textContainer: PIXI.Container;

  constructor(manager: PixiManager, idx: number, type: CardType) {
    super(manager);
    this.type = type;
    this.idx = idx;

    const bg = new PIXI.Graphics();
    bg.beginFill(0x333388, 0.4);
    bg.drawRoundedRect(0, 0, CARD_W, CARD_H, 4);
    bg.endFill();
    const bgContainer = new PIXI.Container();
    bgContainer.addChild(bg);
    const bgWrapper = new Wrapper(manager, bgContainer);
    this.bg = bgWrapper;

    const bgOverlay = new PIXI.Graphics();
    bgOverlay.beginFill(0x666699, 0.7);
    bgOverlay.lineStyle(2, 0x9999cc, 0.8, LineAlignment.Inner);
    bgOverlay.drawRoundedRect(0, 0, CARD_W, CARD_H, 4);
    bgOverlay.endFill();
    this.bgOverlay = bgOverlay;

    const outline = new PIXI.Graphics();
    outline.beginFill(0, 0);
    outline.lineStyle(2, 0x9999cc, 0.8, LineAlignment.Inner);
    outline.drawRoundedRect(0, 0, CARD_W, CARD_H, 4);
    outline.endFill();
    this.outline = outline;

    this.sprite = new SpellSprite(manager, type);

    this.addChild(this.bg);
    this.object.addChild(this.bgOverlay, this.outline);

    const textContainer = new PIXI.Container();
    const text = manager.fontLoader(`2`, 0xffffff).object;
    const goldIcon = getCoinSprite();
    goldIcon.position.set(CHAR_W + 2, BASELINE_ICONS);
    textContainer.addChild(text, goldIcon);

    this.sprite.setPosition({
      x: 0.5 * (CARD_W - SPRITE_W),
      y: 0.5 * (CARD_H - SPRITE_W),
      // y: CARD_H - SPRITE_W + 1,
    });
    textContainer.position.set(CARD_W - textContainer.width - 3, 3);

    this.textContainer = textContainer;

    this.addChild(this.sprite);
    this.object.addChild(textContainer);
  }

  setHover(hover: boolean): void {
    this.hover = hover;
  }

  setOutline(showOutline: boolean) {
    this.showOutline = showOutline;
  }

  setType(type: CardType) {
    this.type = type;
    this.sprite.setType(type);
  }

  loop() {
    super.loop();

    const { clickState, stagedSpellIdx } = this.manager.mouseManager;

    this.bg.setAlpha(this.type === CardType.EMPTY_00 ? 0.6 : 1);
    this.sprite.setAlpha(this.type === CardType.EMPTY_00 ? 0.8 : 1);

    this.textContainer.visible = this.type !== CardType.EMPTY_00;

    if (clickState === ClickState.Drawing) {
      this.bgOverlay.visible = this.hover;
    } else {
      this.bgOverlay.visible = this.hover && this.type !== CardType.EMPTY_00;
    }

    if (clickState === ClickState.Casting) {
      this.outline.visible = this.idx === stagedSpellIdx;
    } else {
      this.outline.visible = this.showOutline;
    }
  }
}

import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../../api/PixiManager';
import { CardType, LineAlignment } from '../../@PixiTypes';
import { ClickState } from '../../MouseManager';
import { PixiObject, Wrapper } from '../../PixiObject';
import { CARDS, SPRITE_W } from '../../Utils/TextureLoader';
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
    this.sprite.setPosition({
      x: 0.5 * (CARD_W - SPRITE_W),
      y: 0.5 * (CARD_H - SPRITE_W),
    });

    this.addChild(this.bg);
    this.object.addChild(this.bgOverlay, this.outline);

    this.addChild(this.sprite);

    const hitArea = new PIXI.Rectangle(0, 0, CARD_W, CARD_H);
    this.setInteractive({ hitArea, click: this.onClick });
  }

  private onClick() {
    if (this.idx === -1) return;
    this.manager.api.draw(this.idx);
    this.manager.mouseManager.setClickState(ClickState.None);
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

    const { clickState } = this.manager.mouseManager;

    this.bg.setAlpha(this.type === CardType.EMPTY_00 ? 0.6 : 1);
    this.sprite.setAlpha(this.type === CardType.EMPTY_00 ? 0.8 : 1);

    if (clickState === ClickState.Drawing) {
      this.bgOverlay.visible = this.hover;
    } else {
      this.bgOverlay.visible = this.hover && this.type !== CardType.EMPTY_00;
    }
    this.outline.visible = this.showOutline;
  }
}

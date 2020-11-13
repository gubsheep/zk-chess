import { GameObject } from '../app/PixiUtils/GameObject';
import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from './PixiManager';
import { LineAlignment } from '../app/PixiUtils/PixiTypes';
import {
  BASELINE_ICONS,
  getCoinSprite,
  getShipSprite,
  ICONS,
  SHIPS,
  SPRITE_W,
} from '../app/PixiUtils/TextureLoader';
import { CHAR_W } from '../app/PixiUtils/FontLoader';
import { playerShader } from '../app/PixiUtils/Shaders';
import { ClickState } from '../app/PixiUtils/MouseManager';
import { shipData } from '../app/PixiUtils/ShipData';
import { PieceType } from '../_types/global/GlobalTypes';

const CARD_W = 46;
const CARD_H = 46;
const NUM_SHIPS = 5;

const CARD_MARGIN = 4;

const MODAL_W = 80;
const MODAL_H = 60;

class ShopCard extends GameObject {
  modal: PIXI.Container;
  hovering: boolean;
  bgOverlay: PIXI.DisplayObject;
  type: PieceType;
  constructor(manager: PixiManager, type: PieceType) {
    super(manager);
    const cardWrapper = this.object;

    // make card
    const card = new PIXI.Container();

    const bg = new PIXI.Graphics();
    bg.beginFill(0x333388, 0.4);
    bg.drawRoundedRect(0, 0, CARD_W, CARD_H, 4);
    bg.endFill();

    const bgOverlay = new PIXI.Graphics();
    bgOverlay.beginFill(0x666699, 0.7);
    bgOverlay.lineStyle(2, 0x9999cc, 0.8, LineAlignment.Inner);
    bgOverlay.drawRoundedRect(0, 0, CARD_W, CARD_H, 4);
    bgOverlay.endFill();
    bgOverlay.visible = false;

    const sprite = getShipSprite(type, manager.api.getMyColor());

    const data = shipData[type];

    const textContainer = new PIXI.Container();
    const text = manager.fontLoader(`${data.cost}`).object;
    const goldIcon = getCoinSprite();
    goldIcon.position.set(CHAR_W + 2, BASELINE_ICONS);
    textContainer.addChild(text, goldIcon);

    sprite.position.set(0.5 * (CARD_W - SPRITE_W), CARD_H - SPRITE_W - 3);
    textContainer.position.set(CARD_W - textContainer.width - 3, 3);

    card.addChild(bg, bgOverlay, sprite, textContainer);

    // make modal
    const modal = new PIXI.Container();

    const modalBg = new PIXI.Graphics();
    modalBg.beginFill(0x333388, 0.8);
    modalBg.lineStyle(1, 0x99ccff, 1);
    modalBg.drawRoundedRect(0, 0, MODAL_W, MODAL_H, 2);
    modalBg.endFill();

    const _costStr = `Cost: ${data.cost}`;
    const atkStr = `ATK: ${data.attack}`;
    const hpStr = `HP: ${data.health}`;
    const mvtStr = `Movement: ${data.movement}`;
    const rngStr = `Range: ${
      data.minRange === data.maxRange
        ? data.minRange
        : data.minRange + '-' + data.maxRange
    }`;

    const shopText = manager.fontLoader(
      `${data.name}\n${atkStr}\n${hpStr}\n${mvtStr}\n${rngStr}`
    ).object;

    shopText.position.set(2, 2);

    modal.addChild(modalBg, shopText);

    modal.position.set(-0.5 * (MODAL_W - CARD_W), -MODAL_H - 4);
    modal.visible = false;

    // finally, add things
    cardWrapper.addChild(modal, card);

    this.type = type;

    this.modal = modal;
    this.bgOverlay = bgOverlay;

    this.hovering = false;

    card.interactive = true;
    card.hitArea = new PIXI.Rectangle(0, 0, CARD_W, CARD_H);
    card
      .on('mouseover', this.onMouseOver)
      .on('mouseout', this.onMouseOut)
      .on('click', this.onClick);
  }

  private onClick() {
    this.manager.mouseManager.buyShip(this.type);
  }

  private onMouseOver() {
    this.hovering = true;
  }

  private onMouseOut() {
    this.hovering = false;
  }

  loop() {
    super.loop();
    const { mouseManager: mm } = this.manager;

    const buyingThis =
      mm.clickState === ClickState.Deploying && mm.deployType === this.type;

    this.bgOverlay.visible = this.hovering || buyingThis;
    this.modal.visible = this.hovering;
  }
}

export class Shop extends GameObject {
  constructor(manager: PixiManager) {
    super(manager, GameZIndex.Shop);

    let idx = 0;
    for (
      let type = PieceType.Cruiser_01;
      type <= PieceType.Warship_05;
      type++
    ) {
      const shopEntry = new ShopCard(manager, type);
      shopEntry.setPosition({ x: idx * (CARD_W + CARD_MARGIN), y: 0 });
      this.addChild(shopEntry);
      idx++;
    }

    this.positionSelf();
  }

  positionSelf() {
    const { width, height } = this.manager.app.renderer;
    const shopX = 0.5 * (width - this.getWidth());
    this.setPosition({ x: shopX, y: height - 70 });
  }

  getWidth() {
    return NUM_SHIPS * CARD_W + (NUM_SHIPS - 1) * CARD_MARGIN;
  }
}

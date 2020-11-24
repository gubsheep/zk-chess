import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../../api/PixiManager';
import { PieceType } from '../../../../_types/global/GlobalTypes';
import { ClickState } from '../../MouseManager';
import { PixiObject } from '../../PixiObject';
import { ShopCard, CARD_W, CARD_H } from './ShopCard';
import { ShopModal } from './ShopModal';

export class ShopItem extends PixiObject {
  modal: ShopModal;
  card: ShopCard;

  hovering: boolean;
  type: PieceType;

  canBuy: boolean;

  constructor(manager: PixiManager, type: PieceType) {
    super(manager);
    this.type = type;

    // make card
    this.card = new ShopCard(manager, type);
    this.modal = new ShopModal(manager, type);
    this.addChild(this.card, this.modal);

    this.hovering = false;
    this.canBuy = false;

    const hitArea = new PIXI.Rectangle(0, 0, CARD_W, CARD_H);
    this.setInteractive({
      hitArea,
      mouseover: this.onMouseOver,
      mouseout: this.onMouseOut,
      click: this.onClick,
    });
  }

  private onClick() {
    if (!this.canBuy) return;
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
    const { mouseManager: mm, api } = this.manager;

    this.canBuy = api.canBuy(this.type);

    const buyingThis =
      mm.clickState === ClickState.Deploying && mm.deployType === this.type;

    this.card.setHover(this.canBuy && (this.hovering || buyingThis));
    this.card.setAlpha(this.canBuy ? 1 : 0.5);
    this.modal.setHover(this.hovering);
  }
}

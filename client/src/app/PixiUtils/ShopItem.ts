import * as PIXI from 'pixi.js';
import { PixiManager } from '../../api/PixiManager';
import { PieceType } from '../../_types/global/GlobalTypes';
import { GameObject } from './GameObject';
import { ClickState } from './MouseManager';
import { ShopCard, CARD_W, CARD_H } from './ShopCard';
import { ShopModal } from './ShopModal';

export class ShopItem extends GameObject {
  modal: ShopModal;
  card: ShopCard;

  hovering: boolean;
  type: PieceType;

  constructor(manager: PixiManager, type: PieceType) {
    super(manager);
    this.type = type;

    // make card
    this.card = new ShopCard(manager, type);
    this.modal = new ShopModal(manager, type);
    this.addChild(this.card, this.modal);

    this.hovering = false;

    const hitArea = new PIXI.Rectangle(0, 0, CARD_W, CARD_H);
    this.setInteractive({
      hitArea,
      mouseover: this.onMouseOver,
      mouseout: this.onMouseOut,
      click: this.onClick,
    });
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

    this.card.setHover(this.hovering || buyingThis);
    this.modal.setHover(this.hovering);
  }
}

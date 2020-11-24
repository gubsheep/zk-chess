import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../../api/PixiManager';
import { CardType } from '../../@PixiTypes';
import { ClickState } from '../../MouseManager';
import { PixiObject } from '../../PixiObject';
import { CARD_W, CARD_H } from '../Shop/ShopCard';
import { SpellCard } from '../Shop/SpellCard';
import { SpellModal } from './SpellModal';

export class SpellItem extends PixiObject {
  hovering: boolean;
  modal: SpellModal;
  card: SpellCard;

  type: CardType;

  overrideHover: boolean;

  constructor(manager: PixiManager, idx: number, type: CardType) {
    super(manager);

    this.type = type;

    this.card = new SpellCard(manager, idx, type);
    this.modal = new SpellModal(manager, type);
    this.addChild(this.card, this.modal);

    const hitArea = new PIXI.Rectangle(0, 0, CARD_W, CARD_H);
    this.setInteractive({
      hitArea,
      mouseover: this.onMouseOver,
      mouseout: this.onMouseOut,
      click: this.onClick,
    });

    this.setType(type);
  }

  setType(type: CardType) {
    this.type = type;
    this.card.setType(type);
    this.modal.setType(type);
  }

  private onClick() {
    // cast
  }

  private onMouseOver() {
    this.hovering = true;
  }

  private onMouseOut() {
    this.hovering = false;
  }

  setOverride(over: boolean) {
    this.overrideHover = over;
  }

  loop() {
    super.loop();

    const { clickState } = this.manager.mouseManager;

    if (this.overrideHover) {
      // also is the draw one
      this.card.setHover(true);
      this.modal.setHover(false);
    } else {
      this.card.setHover(this.hovering);
      this.modal.setHover(this.hovering);
    }

    this.card.setOutline(clickState === ClickState.Drawing);
  }
}

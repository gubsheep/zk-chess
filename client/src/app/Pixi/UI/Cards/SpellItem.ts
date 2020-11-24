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

  idx: number;

  isDraw: boolean;

  constructor(
    manager: PixiManager,
    idx: number,
    type: CardType,
    isDraw: boolean = false
  ) {
    super(manager);

    this.type = type;
    this.idx = idx;

    this.isDraw = isDraw;

    this.card = new SpellCard(manager, idx, type);
    this.modal = new SpellModal(manager, type);
    this.addChild(this.card, this.modal);

    const hitArea = new PIXI.Rectangle(0, 0, CARD_W, CARD_H);
    this.setInteractive({
      // debug: true,
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
    if (this.isDraw) return;

    const { clickState } = this.manager.mouseManager;
    if (clickState !== ClickState.Drawing && !this.canPlay()) return;

    if (clickState === ClickState.Casting) return;

    if (clickState === ClickState.Drawing) {
      this.manager.api.draw(this.idx);
      this.manager.mouseManager.setClickState(ClickState.None);
    } else if (clickState === ClickState.None) {
      // cast it
      this.manager.mouseManager.cast(this.idx);
    }
  }

  private onMouseOver() {
    this.hovering = true;
    // stupid fix for weird bug
    if (this.isDraw)
      setTimeout(() => {
        this.hovering = false;
      }, 3000);
  }

  private onMouseOut() {
    console.log('mouseout');
    this.hovering = false;
  }

  setOverride(over: boolean) {
    this.overrideHover = over;
  }

  private canPlay(): boolean {
    return this.manager.api.getGold() >= 2;
  }

  loop() {
    super.loop();

    const { clickState } = this.manager.mouseManager;

    if (this.overrideHover) {
      // also is the draw one
      this.card.setHover(true);
      this.modal.setHover(false);
    } else if (this.canPlay()) {
      this.card.setHover(this.hovering);
      this.modal.setHover(this.hovering);
    } else {
      this.card.setHover(false);
      this.modal.setHover(false);
    }

    this.card.setOutline(clickState === ClickState.Drawing);

    if (!this.isDraw) {
      if (clickState === ClickState.Drawing) {
        this.card.setAlpha(1);
      } else {
        this.card.setAlpha(this.canPlay() ? 1 : 0.5);
      }
    }
  }
}

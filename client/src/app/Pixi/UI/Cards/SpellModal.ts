import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../../../api/PixiManager';
import { CardType } from '../../@PixiTypes';
import { PixiObject } from '../../PixiObject';
import { TextAlign, TextObject } from '../../Utils/TextObject';
import { CARD_W } from '../Shop/ShopCard';

const CARDMODAL_W = 116;
const CARDMODAL_H = 30;

const spellDescs = [
  'none',
  `Increase ATK by 1.`,
  `Increase ATK by 2.`,
  `Deal 1 damage.`,
  `Deal 2 damage.`,
  `Restore 1 HP.`,
  `Restore 2 HP.`,
];

export class SpellModal extends PixiObject {
  type: CardType;
  hover: boolean;

  shopText: TextObject;

  constructor(manager: PixiManager, type: CardType) {
    super(manager);
    this.type = type;
    this.hover = false;

    const modalBg = new PIXI.Graphics();
    modalBg.beginFill(0x333388, 0.8);
    modalBg.lineStyle(1, 0x99ccff, 1);
    modalBg.drawRoundedRect(0, 0, CARDMODAL_W, CARDMODAL_H, 2);
    modalBg.endFill();

    this.shopText = new TextObject(manager, '');
    this.shopText.setPosition({ x: 2, y: 2 });

    this.object.addChild(modalBg);
    this.addChild(this.shopText);

    this.setPosition({ x: -(CARDMODAL_W - CARD_W), y: -(CARDMODAL_H + 4) });

    this.syncText();
  }

  setHover(hover: boolean): void {
    this.hover = hover;
  }

  setType(type: CardType) {
    this.type = type;
    this.syncText();
  }

  private syncText() {
    this.shopText.setText(spellDescs[this.type]);
  }

  loop() {
    super.loop();
    this.object.visible = this.hover && this.type !== CardType.EMPTY_00;
  }
}

import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { PieceType } from '../../../_types/global/GlobalTypes';
import { PixiObject } from '../PixiObject';
import { pieceNames } from '../PixiUtils';
import { CARD_W } from './ShopCard';

const MODAL_W = 80;
const MODAL_H = 60;

export class ShopModal extends PixiObject {
  type: PieceType;
  hover: boolean;

  constructor(manager: PixiManager, type: PieceType) {
    super(manager);
    this.type = type;
    this.hover = false;

    const data = this.manager.api.getStats(type);

    const modalBg = new PIXI.Graphics();
    modalBg.beginFill(0x333388, 0.8);
    modalBg.lineStyle(1, 0x99ccff, 1);
    modalBg.drawRoundedRect(0, 0, MODAL_W, MODAL_H, 2);
    modalBg.endFill();

    const _costStr = `Cost: ${data.cost}`;
    const atkStr = `ATK: ${data.atk}`;
    const hpStr = `HP: ${data.hp}`;
    const mvtStr = `Movement: ${data.mvRange}`;
    const rngStr = `Range: ${data.atkRange}`;

    const shopText = manager.fontLoader(
      `${pieceNames[type]}\n${atkStr}\n${hpStr}\n${mvtStr}\n${rngStr}`,
      0xffffff
    ).object;

    shopText.position.set(2, 2);

    this.object.addChild(modalBg, shopText);

    this.setPosition({ x: -0.5 * (MODAL_W - CARD_W), y: -MODAL_H - 4 });
  }

  setHover(hover: boolean): void {
    this.hover = hover;
  }

  loop() {
    super.loop();
    this.object.visible = this.hover;
  }
}

import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../../api/PixiManager';
import { PixiObject, Wrapper } from '../PixiObject';
import { TextAlign, TextObject } from '../Utils/TextObject';

const YOURTURN_W = 160;
const YOURTURN_H = 40;

export class YourTurn extends PixiObject {
  lastPinged: number;
  constructor(manager: PixiManager) {
    super(manager, GameZIndex.GameOver);

    this.lastPinged = -100;

    const modalBg = new PIXI.Graphics();
    modalBg.beginFill(0x333388, 0.8);
    modalBg.lineStyle(1, 0x99ccff, 1);
    modalBg.drawRoundedRect(0, 0, YOURTURN_W, YOURTURN_H, 2);
    modalBg.endFill();

    const yourTurn = new TextObject(manager, 'Your Turn!', TextAlign.Center);

    yourTurn.setPosition({ y: 14, x: YOURTURN_W / 2 });

    this.object.addChild(modalBg);
    this.addChild(yourTurn);

    this.positionSelf();

    this.object.visible = false;
  }

  positionSelf() {
    const { width, height } = this.manager.renderer;
    this.setPosition({
      x: 0.5 * (width - YOURTURN_W),
      y: 0.5 * (height - YOURTURN_H),
    });
  }

  ping() {
    this.lastPinged = this.lifetime;
    this.setAlpha(1);
    this.object.visible = true;
  }

  loop() {
    super.loop();
    const { api } = this.manager;

    const diff = this.lifetime - this.lastPinged;
    const fadeLength = 180;
    if (diff < fadeLength) {
      this.setAlpha(1 - diff / fadeLength);
    } else {
      this.object.visible = false;
    }
  }
}

import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../../api/PixiManager';
import { PixiObject, Wrapper } from '../PixiObject';
import { CHAR_H, LINE_SPACING } from '../Utils/FontLoader';
import { TextObject } from '../Utils/TextObject';

const GAMEOVER_W = 160;
const GAMEOVER_H = 80;

export class GameOver extends PixiObject {
  constructor(manager: PixiManager) {
    super(manager, GameZIndex.GameOver);

    const modalBg = new PIXI.Graphics();
    modalBg.beginFill(0x333388, 0.8);
    modalBg.lineStyle(1, 0x99ccff, 1);
    modalBg.drawRoundedRect(0, 0, GAMEOVER_W, GAMEOVER_H, 2);
    modalBg.endFill();

    const { api } = manager;

    const text = new Wrapper(manager, new PIXI.Container());
    const gameover = new TextObject(manager, 'Game Over!');
    const winner = new TextObject(manager, `Winner: ${api.getWinner() || ''}`);
    const thanks = new TextObject(manager, 'Thanks for playing!');
    winner.setPosition({ y: 2 * (CHAR_H + LINE_SPACING) });
    thanks.setPosition({ y: 4 * (CHAR_H + LINE_SPACING) });

    text.addChild(gameover, winner, thanks);

    text.setPosition({ x: 5, y: 5 });
    this.object.addChild(modalBg, text.object);

    this.positionSelf();
  }

  positionSelf() {
    const { width, height } = this.manager.renderer;
    this.setPosition({
      x: 0.5 * (width - GAMEOVER_W),
      y: 0.5 * (height - GAMEOVER_H),
    });
  }

  loop() {
    super.loop();
    const { api } = this.manager;
    this.object.visible = api.gameOver();
  }
}

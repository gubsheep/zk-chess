import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../../api/PixiManager';
import { PixiObject, Wrapper } from '../PixiObject';
import { CHAR_H, LINE_SPACING } from '../Utils/FontLoader';
import { TextObject } from '../Utils/TextObject';
import { NewGame } from './NewGame';

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
    const newgame = new NewGame(manager);
    winner.setPosition({ y: 2 * (CHAR_H + LINE_SPACING) });
    newgame.setPosition({ y: 4 * (CHAR_H + LINE_SPACING), x: 0 });

    text.addChild(gameover, winner, newgame);

    text.setPosition({ x: 5, y: 5 });
    this.object.addChild(modalBg);
    this.addChild(text);

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
    // this.object.visible = true;
    this.object.visible = api.gameOver();
  }
}

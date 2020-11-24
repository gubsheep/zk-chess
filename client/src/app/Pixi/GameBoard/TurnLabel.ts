import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { CHAR_H } from '../Utils/FontLoader';
import { PixiObject } from '../PixiObject';
import { GameGrid } from './GameGrid';
import { GameBoardObject } from './GridObject';
import { TextObject, TextAlign } from '../Utils/TextObject';

export class TurnLabel extends GameBoardObject {
  yourTurn: PixiObject;
  enemyTurn: PixiObject;

  constructor(manager: PixiManager, grid: GameGrid) {
    super(manager, grid);

    const enemyTurn = new TextObject(manager, 'Enemy Turn', TextAlign.Center);
    const yourTurn = new TextObject(manager, 'Your Turn', TextAlign.Center);

    this.addChild(yourTurn, enemyTurn);

    this.enemyTurn = enemyTurn;
    this.yourTurn = yourTurn;
  }

  loop() {
    if (this.manager.api.isMyTurn()) {
      this.yourTurn.setActive(true);
      this.enemyTurn.setActive(false);
    } else {
      this.yourTurn.setActive(false);
      this.enemyTurn.setActive(true);
    }
  }

  positionGrid(gridW: number, _gridH: number) {
    this.setPosition({
      x: Math.floor(0.5 * gridW),
      y: -CHAR_H - 4,
    });
  }
}

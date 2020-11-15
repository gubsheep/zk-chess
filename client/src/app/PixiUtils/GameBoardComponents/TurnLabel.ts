import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { CHAR_H } from '../FontLoader';
import { GameObject } from '../GameObject';
import { TextAlign, TextObject } from '../Text';

export class TurnLabel extends GameObject {
  yourTurn: GameObject;
  enemyTurn: GameObject;

  constructor(manager: PixiManager) {
    super(manager);

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
      y: -CHAR_H - 6,
    });
  }
}

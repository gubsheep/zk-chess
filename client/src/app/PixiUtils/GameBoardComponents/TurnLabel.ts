import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { CHAR_H } from '../FontLoader';
import { GameObject } from '../GameObject';

export class TurnLabel extends GameObject {
  yourTurn: PIXI.DisplayObject;
  enemyTurn: PIXI.DisplayObject;

  constructor(manager: PixiManager) {
    super(manager);
    const loader = this.manager.fontLoader;

    const { object: enemyTurn, width: enemyWidth } = loader('Enemy Turn');
    enemyTurn.position.set(-Math.floor(0.5 * enemyWidth), 0);

    const { object: yourTurn, width: yourWidth } = loader('Your Turn');
    yourTurn.position.set(-Math.floor(0.5 * yourWidth), 0);

    this.object.addChild(yourTurn, enemyTurn);

    this.enemyTurn = enemyTurn;
    this.yourTurn = yourTurn;
  }

  loop() {
    if (this.manager.api.isMyTurn()) {
      this.yourTurn.visible = true;
      this.enemyTurn.visible = false;
    } else {
      this.yourTurn.visible = false;
      this.enemyTurn.visible = true;
    }
  }

  positionGrid(gridW: number, _gridH: number) {
    this.setPosition({
      x: Math.floor(0.5 * gridW),
      y: -CHAR_H - 6,
    });
  }
}

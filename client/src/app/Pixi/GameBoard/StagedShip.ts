import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../../api/PixiManager';
import { BoardCoords } from '../@PixiTypes';
import { ClickState } from '../MouseManager';
import { PixiObject } from '../PixiObject';
import { ShipSprite } from '../Ships/ShipSprite';

export class StagedShip extends PixiObject {
  sprite: ShipSprite;

  constructor(manager: PixiManager) {
    super(manager, GameZIndex.Staged);

    const sprite = new ShipSprite(manager, null, this.manager.api.getMyColor());
    this.sprite = sprite;

    sprite.setAlpha(0.7);
    this.addChild(sprite);
  }

  setLocation(coords: BoardCoords) {
    const topLeft = this.manager.gameBoard.getTopLeft(coords);
    if (topLeft) {
      this.setPosition({ x: topLeft.x + 2, y: topLeft.y + 2 });
    }
  }

  loop() {
    super.loop();
    const {
      mouseManager: {
        clickState,
        deployStaged,
        deployType,
        moveStaged,
        selectedShip,
      },
    } = this.manager;

    if (deployStaged) {
      this.setLocation(deployStaged);
    } else if (moveStaged) {
      this.setLocation(moveStaged);
    }

    if (clickState === ClickState.Deploying) {
      if (deployStaged) this.sprite.setType(deployType);
    } else if (clickState === ClickState.Acting) {
      if (moveStaged)
        this.sprite.setType(selectedShip ? selectedShip.getType() : null);
      else this.sprite.setType(null);
    } else {
      // none
      this.sprite.setType(null);
    }
  }
}

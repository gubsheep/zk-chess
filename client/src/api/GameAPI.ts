import { BoardCoords, ShipType } from '../app/PixiUtils/PixiTypes';
import { Ship } from '../app/PixiUtils/Ships';
import { Player } from '../_types/global/GlobalTypes';
import AbstractGameManager from './AbstractGameManager';
import { PixiManager } from './PixiManager';

export class GameAPI {
  pixiManager: PixiManager;
  gameManager: AbstractGameManager;
  constructor(
    pixiManager: PixiManager
    // gameManager: AbstractGameManager
  ) {
    this.pixiManager = pixiManager;
    // this.gameManager = gameManager;
  }

  deployShip(type: ShipType, coords: BoardCoords) {
    const ship = new Ship(
      this.pixiManager,
      type,
      coords,
      this.pixiManager.myColor
    );
    this.pixiManager.addShip(ship);
  }
}

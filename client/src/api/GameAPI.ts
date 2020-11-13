import { BoardCoords, ShipType } from '../app/PixiUtils/PixiTypes';
import { shipData } from '../app/PixiUtils/ShipData';
import { Ship, ShipState } from '../app/PixiUtils/Ships';
import { compareBoardCoords, taxiCab } from '../app/PixiUtils/Utils';
import { compareLoc } from '../utils/ChessUtils';
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

  private canMove(type: ShipType, from: BoardCoords, to: BoardCoords): boolean {
    const data = shipData[type];
    const dist = taxiCab(from, to);
    return dist > 0 && dist <= data.movement;
  }

  private canAttack(
    type: ShipType,
    from: BoardCoords,
    to: BoardCoords
  ): boolean {
    const data = shipData[type];
    const dist = taxiCab(from, to);
    return data.minRange <= dist && dist <= data.maxRange;
  }

  private canAttackWithMove(
    type: ShipType,
    from: BoardCoords,
    to: BoardCoords
  ): boolean {
    const data = shipData[type];
    const dist = taxiCab(from, to);
    return dist > 0 && dist <= data.maxRange + data.movement;
  }

  shipAt(coords: BoardCoords): Ship | null {
    const ships = this.pixiManager.ships;
    for (const ship of ships) {
      if (compareBoardCoords(ship.coords, coords)) return ship;
    }

    return null;
  }

  deployShip(type: ShipType, coords: BoardCoords): void {
    const ship = new Ship(
      this.pixiManager,
      type,
      coords,
      this.pixiManager.myColor
    );
    this.pixiManager.addShip(ship);
  }

  moveShip(ship: Ship, to: BoardCoords): void {
    ship.setCoords(to);
    ship.hasMoved = true;
  }

  attack(from: Ship, to: BoardCoords): void {
    const toShip = this.shipAt(to);
    if (toShip) {
      toShip.setActive(false);
    }
  }

  findAttacks(type: ShipType, coords: BoardCoords): BoardCoords[] {
    const { width, height } = this.pixiManager.gameBoard;
    const attacks: BoardCoords[] = [];

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        if (this.canAttack(type, coords, { row, col }))
          attacks.push({ row, col });
      }
    }

    return attacks;
  }

  findMoves(type: ShipType, coords: BoardCoords): BoardCoords[] {
    const { width, height } = this.pixiManager.gameBoard;
    const paths: BoardCoords[] = [];
    // TODO minor optimization using range
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        if (this.canMove(type, coords, { row, col })) paths.push({ row, col });
      }
    }

    return paths;
  }

  findAttacksWithMove(type: ShipType, coords: BoardCoords): BoardCoords[] {
    const { width, height } = this.pixiManager.gameBoard;
    const allAttacks: BoardCoords[] = [];
    // TODO minor optimization using range
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        if (this.canAttackWithMove(type, coords, { row, col }))
          allAttacks.push({ row, col });
      }
    }

    return allAttacks;
  }
}

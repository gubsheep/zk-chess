import { BoardCoords, PlayerColor, ShipType } from '../app/PixiUtils/PixiTypes';
import { shipData } from '../app/PixiUtils/ShipData';
import { Ship, ShipState } from '../app/PixiUtils/Ships';
import { compareBoardCoords, taxiCab } from '../app/PixiUtils/Utils';
import { ChessGame } from '../_types/global/GlobalTypes';
import AbstractGameManager, { GameManagerEvent } from './AbstractGameManager';
import { GameState } from './GameState';
import { PixiManager } from './PixiManager';

export class GameAPI {
  private pixiManager: PixiManager;
  private gameManager: AbstractGameManager;

  gameState: ChessGame;

  constructor(pixiManager: PixiManager, gameManager: AbstractGameManager) {
    this.pixiManager = pixiManager;
    this.gameManager = gameManager;

    this.syncGameState();

    this.gameManager.addListener(GameManagerEvent.CreatedGame, () => {});
  }

  private syncGameState(): void {
    this.gameState = this.gameManager.getGameState();
  }

  // purges all existing ships and adds new ones
  syncShips(): void {
    this.syncGameState();
    this.pixiManager.clearShips();
    const { pieces } = this.gameState;
    for (const piece of pieces) {
      // this.pixiManager.addShip();
    }
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

  // p1 is red, p2 is blue
  getMyColor(): PlayerColor {
    const { myAddress, player1, player2 } = this.gameState;
    if (myAddress === player1.address) return PlayerColor.Red;
    else if (myAddress === player2.address) return PlayerColor.Blue;
    else {
      console.error('error getting color');
      return PlayerColor.Red;
    }
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
      this.pixiManager.api.getMyColor()
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

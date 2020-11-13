import { BoardCoords, PlayerColor } from '../app/PixiUtils/PixiTypes';
import { shipData } from '../app/PixiUtils/ShipData';
import { Ship, ShipState } from '../app/PixiUtils/Ships';
import {
  boardCoordsFromLoc,
  compareBoardCoords,
  taxiCab,
} from '../app/PixiUtils/PixiUtils';
import {
  ChessGame,
  EthAddress,
  isVisiblePiece,
  Locatable,
  Piece,
  PieceType,
  Player,
  VisiblePiece,
} from '../_types/global/GlobalTypes';
import AbstractGameManager, { GameManagerEvent } from './AbstractGameManager';
import { GameState } from './GameState';
import { PixiManager } from './PixiManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../app/PixiUtils/GameBoard';

export class GameAPI {
  private pixiManager: PixiManager;
  private gameManager: AbstractGameManager;
  private myMothership: Ship;

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
    const { pieces, myAddress } = this.gameState;
    for (const piece of pieces) {
      if (isVisiblePiece(piece)) {
        const ship = this.shipFromData(piece);
        if (
          piece.owner === myAddress &&
          piece.pieceType === PieceType.Mothership_00
        ) {
          this.myMothership = ship;
        }

        this.pixiManager.addShip(ship);
      }
    }
  }

  getMyMothership(): Ship {
    return this.myMothership;
  }

  private shipFromData(data: VisiblePiece): Ship {
    return new Ship(
      this.pixiManager,
      data.pieceType,
      boardCoordsFromLoc(data.location),
      this.getColor(data.owner)
    );
  }

  private canMove(
    type: PieceType,
    from: BoardCoords,
    to: BoardCoords
  ): boolean {
    const data = shipData[type];
    const dist = taxiCab(from, to);
    return dist > 0 && dist <= data.movement;
  }

  private canAttack(
    type: PieceType,
    from: BoardCoords,
    to: BoardCoords
  ): boolean {
    const data = shipData[type];
    const dist = taxiCab(from, to);
    return data.minRange <= dist && dist <= data.maxRange;
  }

  private canAttackWithMove(
    type: PieceType,
    from: BoardCoords,
    to: BoardCoords
  ): boolean {
    const data = shipData[type];
    const dist = taxiCab(from, to);
    return dist > 0 && dist <= data.maxRange + data.movement;
  }

  // p1 is red, p2 is blue
  getMyColor(): PlayerColor {
    return this.getColor(this.gameState.myAddress);
  }

  getColor(address: EthAddress | null): PlayerColor {
    const { player1, player2 } = this.gameState;
    if (address === player1.address) return PlayerColor.Red;
    else if (address === player2.address) return PlayerColor.Blue;
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

  deployShip(type: PieceType, coords: BoardCoords): void {
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

  findAttacks(type: PieceType, coords: BoardCoords): BoardCoords[] {
    const attacks: BoardCoords[] = [];

    for (let row = 0; row < GAME_HEIGHT; row++) {
      for (let col = 0; col < GAME_WIDTH; col++) {
        if (this.canAttack(type, coords, { row, col }))
          attacks.push({ row, col });
      }
    }

    return attacks;
  }

  findMoves(type: PieceType, coords: BoardCoords): BoardCoords[] {
    const paths: BoardCoords[] = [];
    // TODO minor optimization using range
    for (let row = 0; row < GAME_HEIGHT; row++) {
      for (let col = 0; col < GAME_WIDTH; col++) {
        if (this.canMove(type, coords, { row, col })) paths.push({ row, col });
      }
    }

    return paths;
  }

  findAttacksWithMove(type: PieceType, coords: BoardCoords): BoardCoords[] {
    const allAttacks: BoardCoords[] = [];
    // TODO minor optimization using range
    for (let row = 0; row < GAME_HEIGHT; row++) {
      for (let col = 0; col < GAME_WIDTH; col++) {
        if (this.canAttackWithMove(type, coords, { row, col }))
          allAttacks.push({ row, col });
      }
    }

    return allAttacks;
  }
}

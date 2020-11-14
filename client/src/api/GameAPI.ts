import { BoardCoords, PlayerColor } from '../app/PixiUtils/PixiTypes';
import { shipData } from '../app/PixiUtils/ShipData';
import { Ship } from '../app/PixiUtils/Ships';
import {
  boardLocFromCoords,
  compareBoardCoords,
  taxiCab,
} from '../app/PixiUtils/PixiUtils';
import {
  ChessGame,
  EthAddress,
  GameStatus,
  isVisiblePiece,
  PieceType,
} from '../_types/global/GlobalTypes';
import AbstractGameManager, { GameManagerEvent } from './AbstractGameManager';
import { PixiManager } from './PixiManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../app/PixiUtils/GameBoard';
import autoBind from 'auto-bind';

export class GameAPI {
  private pixiManager: PixiManager;
  private gameManager: AbstractGameManager;
  private myMothership: Ship;

  gameState: ChessGame;

  constructor(pixiManager: PixiManager, gameManager: AbstractGameManager) {
    this.pixiManager = pixiManager;
    this.gameManager = gameManager;

    this.syncGameState();

    autoBind(this);

    this.gameManager.addListener(
      GameManagerEvent.StateAdvanced,
      this.stateAdvanced
    );
  }

  // event listeners
  private stateAdvanced() {
    console.log('state advanced');
    this.syncGameState();

    this.syncShips();
  }

  // purges all existing ships and adds new ones
  syncShips(): void {
    this.syncGameState();

    this.pixiManager.clearShips();
    const { pieces, myAddress } = this.gameState;
    for (const piece of pieces) {
      if (isVisiblePiece(piece)) {
        const ship = new Ship(this.pixiManager, piece);
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

  // callable
  endTurn(): void {
    console.log('sending endTurn from api');
    this.gameManager.endTurn();
  }

  deployShip(type: PieceType, coords: BoardCoords): void {
    this.gameManager.summonPiece(type, boardLocFromCoords(coords));
  }

  moveShip(ship: Ship, to: BoardCoords): void {
    this.gameManager.movePiece(ship.pieceData.id, boardLocFromCoords(to));
  }

  attack(from: Ship, to: BoardCoords): void {
    const toShip = this.shipAt(to);
    if (toShip) {
      this.gameManager.attack(from.pieceData.id, toShip.pieceData.id);
    }
  }

  // finding tiles

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

  // getters

  getMyMothership(): Ship {
    return this.myMothership;
  }

  isMyTurn(): boolean {
    const status = this.gameState.gameStatus;
    const amP1 = this.amPlayer1();
    if (amP1) return status === GameStatus.P1_TO_MOVE;
    else return status === GameStatus.P2_TO_MOVE;
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

  getGold(): number {
    const amP1 = this.amPlayer1();
    if (amP1) return this.gameState.player1Mana;
    else return this.gameState.player2Mana;
  }

  getMaxGold(): number {
    return this.gameState.turnNumber;
  }

  getHealth(): number {
    return this.myMothership.pieceData.hp;
  }

  /* private utils */
  private syncGameState(): void {
    this.gameState = this.gameManager.getGameState();
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

  private amPlayer1(): boolean {
    return this.getMyColor() === PlayerColor.Red;
  }
}

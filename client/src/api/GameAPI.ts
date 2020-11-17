import {
  BoardCoords,
  MoveAttack,
  PlayerColor,
} from '../app/PixiUtils/PixiTypes';
import { shipData } from '../app/PixiUtils/ShipData';
import { PieceObject, Ship, Submarine } from '../app/PixiUtils/Ships';
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
  Piece,
  PieceType,
} from '../_types/global/GlobalTypes';
import AbstractGameManager, { GameManagerEvent } from './AbstractGameManager';
import { PixiManager } from './PixiManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../app/PixiUtils/GameBoard';
import autoBind from 'auto-bind';
import { findPath, getObstacles } from '../utils/Utils';
import { BoardCell } from '../app/PixiUtils/GameBoardComponents/BoardCell';

export class GameAPI {
  private pixiManager: PixiManager;
  private gameManager: AbstractGameManager;
  private myMothership: Ship;

  gameState: ChessGame;

  constructor(pixiManager: PixiManager, gameManager: AbstractGameManager) {
    this.pixiManager = pixiManager;
    this.gameManager = gameManager;

    this.gameState = this.gameManager.getGameState();

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
  }

  // purges all existing ships and adds new ones
  syncShips(): void {
    const { shipManager } = this.pixiManager;

    shipManager.clear();
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

        shipManager.addShip(ship);
      } else {
        const sub = new Submarine(this.pixiManager, piece);
        shipManager.addSubmarine(sub);
      }
    }
  }

  // callable
  endTurn(): void {
    this.gameManager.endTurn();
  }

  deploy(type: PieceType, coords: BoardCoords): void {
    this.gameManager.summonPiece(type, boardLocFromCoords(coords));
    this.syncGameState();
  }

  move(ship: PieceObject, to: BoardCoords): void {
    console.log(ship.pieceData.id, to);
    this.gameManager.movePiece(ship.pieceData.id, boardLocFromCoords(to));
    this.syncGameState();
  }

  attack(from: PieceObject, to: BoardCoords): void {
    const toShip = this.shipAt(to);
    if (toShip) {
      this.gameManager.attack(from.pieceData.id, toShip.pieceData.id);
    }
    this.syncGameState();
  }

  moveAttack(
    from: PieceObject,
    moveTo: BoardCoords,
    attackTo: BoardCoords
  ): void {
    this.move(from, moveTo);
    this.syncGameState();
    setTimeout(() => {
      this.attack(from, attackTo);
      this.syncGameState();
    }, 5000);
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

  findMoveAttacks(type: PieceType, coords: BoardCoords): MoveAttack[] {
    const { nRows, nCols } = this.gameState;
    const canMoves: (BoardCoords | null)[][] = [...Array(nRows)].map((_el) =>
      Array(nCols).fill(null)
    );

    const allMoves = this.findMoves(type, coords).concat([coords]);

    for (const move of allMoves) {
      const locAtks = this.findAttacks(type, move);
      for (const atk of locAtks) canMoves[atk.row][atk.col] = move;
    }

    const allAttacks: MoveAttack[] = [];
    for (let i = 0; i < canMoves.length; i++) {
      for (let j = 0; j < canMoves[i].length; j++) {
        const atkLoc = { row: i, col: j };
        const moveLoc = canMoves[i][j];
        if (moveLoc) allAttacks.push({ move: moveLoc, attack: atkLoc });
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
    const ships = this.pixiManager.shipManager.ships;
    for (const ship of ships) {
      if (ship.isAlive() && compareBoardCoords(ship.coords, coords))
        return ship;
    }

    return null;
  }

  subAt(coords: BoardCoords): Submarine | null {
    const subs = this.pixiManager.shipManager.submarines;
    for (const sub of subs) {
      if (sub.isAlive() && compareBoardCoords(sub.getCoords(), coords))
        return sub;
    }

    return null;
  }

  ownedByMe(ship: PieceObject): boolean {
    return ship.pieceData.owner === this.gameState.myAddress;
  }

  getOwner(ship: PieceObject): PlayerColor {
    return this.getColor(ship.pieceData.owner);
  }

  getGold(): number {
    const amP1 = this.amPlayer1();
    if (amP1) return this.gameState.player1Mana;
    else return this.gameState.player2Mana;
  }

  getMaxGold(): number {
    return Math.min(this.gameState.turnNumber, 8);
  }

  getHealth(): number {
    return this.myMothership.pieceData.hp;
  }

  inBounds(coords: BoardCoords): boolean {
    const { nRows, nCols } = this.gameState;
    if (
      coords.col >= nCols ||
      coords.row >= nRows ||
      coords.col < 0 ||
      coords.row < 0
    )
      return false;
    return true;
  }

  hasMoved(ship: PieceObject): boolean {
    return (
      ship.pieceData.lastMove === this.gameState.turnNumber &&
      !this.hasAttacked(ship)
    );
  }

  hasAttacked(ship: PieceObject): boolean {
    return ship.pieceData.lastAttack === this.gameState.turnNumber;
  }

  /* private utils */
  private syncGameState(): void {
    this.gameState = this.gameManager.getLatestGameState();
    console.log(this.gameState);
    this.syncShips();
  }

  private canMove(
    type: PieceType,
    from: BoardCoords,
    to: BoardCoords
  ): boolean {
    if (type === PieceType.Submarine_04) return this.canMoveSub(type, from, to);
    else return this.canMoveShip(type, from, to);
  }

  private canMoveSub(
    type: PieceType,
    from: BoardCoords,
    to: BoardCoords
  ): boolean {
    if (!this.inBounds(to)) return false;
    const data = shipData[type];
    const dist = taxiCab(from, to);

    return dist <= data.movement;
  }

  private canMoveShip(
    type: PieceType,
    from: BoardCoords,
    to: BoardCoords
  ): boolean {
    if (!this.inBounds(to)) return false;

    const { nRows, nCols } = this.gameState;
    const data = shipData[type];
    const dist = taxiCab(from, to);

    if (dist > 0 && dist <= data.movement) {
      const obstacles = getObstacles(this.gameState);
      const fromLoc = boardLocFromCoords(from);
      const toLoc = boardLocFromCoords(to);
      const path = findPath(fromLoc, toLoc, nRows, nCols, obstacles, false);
      if (path && path.length <= data.movement) {
        return true;
      }
    }

    return false;
  }

  canAttack(type: PieceType, from: BoardCoords, to: BoardCoords): boolean {
    if (!this.inBounds(to)) return false;

    // TODO make this get data from contract
    const data = shipData[type];
    const dist = taxiCab(from, to);
    if (data.minRange <= dist && dist <= data.maxRange) {
      const ship = this.shipAt(to);
      if (ship && this.ownedByMe(ship)) return false;
      return true;
    }

    return false;
  }

  private amPlayer1(): boolean {
    return this.getMyColor() === PlayerColor.Red;
  }
}

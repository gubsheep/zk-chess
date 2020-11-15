import { BoardCoords, BoxBounds, CanvasCoords } from './PixiTypes';
import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../api/PixiManager';
import { GameObject } from './GameObject';
import { BoardCell, CELL_W } from './GameBoardComponents/BoardCell';
import { ConfirmCancelButtons } from './GameBoardComponents/ConfirmCancelButtons';
import { TurnLabel } from './GameBoardComponents/TurnLabel';

export const GAME_WIDTH = 7;
export const GAME_HEIGHT = 5;
const BORDER = 2;

class GameGrid extends GameObject {
  cells: BoardCell[][];

  width: number;
  height: number;

  constructor(manager: PixiManager) {
    super(manager);

    // make grid
    this.width = GAME_WIDTH;
    this.height = GAME_HEIGHT;

    const grid: (BoardCell | null)[][] = [...Array(this.height)].map((_e) =>
      Array(this.width).map(() => null)
    );

    for (let i = 0; i < GAME_HEIGHT; i++) {
      for (let j = 0; j < GAME_WIDTH; j++) {
        const idx: BoardCoords = { row: i, col: j };
        const x = idx.col * CELL_W + (idx.col - 1) * BORDER;
        const y = idx.row * CELL_W + (idx.row - 1) * BORDER;

        const cell = new BoardCell(manager, idx, { x, y });
        grid[i][j] = cell;
        this.addChild(cell);
      }
    }
    this.cells = grid as BoardCell[][];
  }

  getWidth() {
    return (BORDER + CELL_W) * GAME_WIDTH - BORDER;
  }

  getHeight() {
    return (BORDER + CELL_W) * GAME_HEIGHT - BORDER;
  }
}

export class GameBoard extends GameObject {
  bounds: BoxBounds;
  grid: GameGrid;

  constructor(manager: PixiManager) {
    super(manager, GameZIndex.Board);

    const grid = new GameGrid(manager);
    this.grid = grid;

    const gridW = grid.getWidth();
    const gridH = grid.getHeight();

    // make text and things
    const confirmCancel = new ConfirmCancelButtons(manager);
    confirmCancel.positionGrid(gridW, gridH);

    const turnLabel = new TurnLabel(manager);
    turnLabel.positionGrid(gridW, gridH);

    this.addChild(grid, confirmCancel, turnLabel);

    this.positionSelf();
  }

  at({ row, col }: BoardCoords): BoardCell | null {
    return this.grid.cells[row][col] || null;
  }

  getTopLeft({ row, col }: BoardCoords): CanvasCoords {
    const { cells } = this.grid;
    if (!cells[row] || !cells[row][col]) {
      console.error('array out of bounds on grid');
      return { x: 0, y: 0 };
    } else {
      return this.object.toGlobal(cells[row][col].topLeft);
    }
  }

  private positionSelf() {
    const { width: gameW, height: gameH } = this.manager.app.renderer;
    const gridW = this.grid.getWidth();
    const gridH = this.grid.getHeight();

    const x = Math.floor((gameW - gridW) / 2);
    const y = Math.floor((gameH - gridH) / 2) - 20;

    this.setPosition({ x, y });

    this.bounds = { left: x, top: y, right: x + gridW, bottom: y + gridH };
  }

  getBounds() {
    return this.bounds;
  }
}

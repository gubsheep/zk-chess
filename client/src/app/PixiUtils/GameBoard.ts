import { BoardCoords, BoxBounds, CanvasCoords } from './PixiTypes';
import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../api/PixiManager';
import { GameObject } from './GameObject';
import { BoardCell, CELL_W } from './GameBoardComponents/BoardCell';
import { ConfirmCancelButtons } from './GameBoardComponents/ConfirmCancelButtons';
import { TurnLabel } from './GameBoardComponents/TurnLabel';
import { ToggleButton } from './GameBoardComponents/ToggleButton';
import { EndTurnButton } from './GameBoardComponents/EndTurnButton';
import { GameGrid } from './GameBoardComponents/GameGrid';

export const GAME_WIDTH = 7;
export const GAME_HEIGHT = 5;

export class GameBoard extends GameObject {
  bounds: BoxBounds;
  grid: GameGrid;

  constructor(manager: PixiManager) {
    super(manager, GameZIndex.Board);

    const grid = new GameGrid(manager);
    this.grid = grid;

    // make text and things
    const confirmCancel = new ConfirmCancelButtons(manager, grid);
    const turnLabel = new TurnLabel(manager, grid);
    const endTurn = new EndTurnButton(manager, grid);
    const toggle = new ToggleButton(manager, grid);

    this.addChild(grid, confirmCancel, turnLabel, toggle, endTurn);

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
    const { width: gameW, height: gameH } = this.manager.renderer;
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

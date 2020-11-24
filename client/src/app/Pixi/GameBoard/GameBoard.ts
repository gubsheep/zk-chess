import { BoardCoords, BoxBounds, CanvasCoords } from '../@PixiTypes';
import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../../api/PixiManager';
import { PixiObject } from '../PixiObject';
import { BoardCell } from './BoardCell';
import { ConfirmCancelButtons } from './ConfirmCancelButtons';
import { EndTurnButton } from './EndTurnButton';
import { GameGrid } from './GameGrid';
import { ToggleButton } from './ToggleButton';
import { TurnLabel } from './TurnLabel';

export const GAME_WIDTH = 7;
export const GAME_HEIGHT = 5;

export class GameBoard extends PixiObject {
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

  getTopLeft({ row, col }: BoardCoords): CanvasCoords | null {
    const { cells } = this.grid;
    if (!cells[row] || !cells[row][col]) {
      return null;
    } else {
      return this.object.toGlobal(cells[row][col].topLeft);
    }
  }

  private positionSelf() {
    const { width: gameW, height: gameH } = this.manager.renderer;
    const gridW = this.grid.getWidth();
    const gridH = this.grid.getHeight();

    const x = Math.floor((gameW - gridW) / 2);
    const y = 37;

    this.setPosition({ x, y });

    this.bounds = { left: x, top: y, right: x + gridW, bottom: y + gridH };
  }

  getBounds() {
    return this.bounds;
  }
}

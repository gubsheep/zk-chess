import { PixiManager } from '../../../api/PixiManager';
import { GameObject } from '../GameObject';
import { GameGrid } from './GameGrid';

export class GameBoardObject extends GameObject {
  constructor(manager: PixiManager, grid: GameGrid) {
    super(manager);

    this.positionGrid(grid.getWidth(), grid.getHeight());
  }

  positionGrid(_gridW: number, _gridH: number) {
    return;
  }
}

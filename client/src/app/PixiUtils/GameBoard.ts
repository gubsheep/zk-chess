import { BoardCoords, CanvasCoords } from './PixiTypes';
import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../api/PixiManager';
import { GameObject } from './GameObject';
import { Ship } from './Ships';

export type GridProps = {
  ship: Ship | null;
  submarines: Ship[];
  topLeft: CanvasCoords;
};
const numX = 7;
const numY = 5;
const CELL_W = 36;
const BORDER = 2;

export class GameBoard extends GameObject {
  grid: GridProps[][];

  constructor(manager: PixiManager) {
    const container = new PIXI.Container();
    const grid: (GridProps | null)[][] = [...Array(7)].map((_e) =>
      Array(5).map(() => null)
    );

    for (let i = 0; i < numX; i++) {
      for (let j = 0; j < numY; j++) {
        const x = i * CELL_W + (i - 1) * BORDER;
        const y = j * CELL_W + (j - 1) * BORDER;
        let rectangle = new PIXI.Graphics();
        rectangle.beginFill(0x222266, 0.4);
        rectangle.drawRect(0, 0, CELL_W, CELL_W);
        rectangle.endFill();
        rectangle.position.set(x, y);
        rectangle.zIndex = GameZIndex.Board;
        container.addChild(rectangle);

        grid[i][j] = { topLeft: { x, y }, ship: null, submarines: [] };
      }
    }

    super(manager, container, GameZIndex.Board);

    this.grid = grid as GridProps[][];

    this.positionSelf();
  }

  getTopLeft({ row, col }: BoardCoords): CanvasCoords {
    const cell = this.grid[col][row];
    if (cell) {
      return this.object.toGlobal(cell.topLeft);
    } else {
      console.error('array out of bounds on grid');
      return { x: 0, y: 0 };
    }
  }

  positionSelf() {
    const { width, height } = this.manager.app.renderer;
    const sumW = (BORDER + CELL_W) * numX - BORDER;
    const sumH = (BORDER + CELL_W) * numY - BORDER;

    const x = Math.floor((width - sumW) / 2);
    const y = Math.floor((height - sumH) / 2);

    this.setPosition({ x, y });
  }
}

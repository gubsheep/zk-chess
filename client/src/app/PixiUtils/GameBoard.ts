import { CanvasCoords } from './PixiTypes';
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

export function makeGrid(): CanvasCoords[][] {
  const sumW = (BORDER + CELL_W) * numX - BORDER;
  const sumH = (BORDER + CELL_W) * numY - BORDER;

  // const startX = Math.floor((width - sumW) / 2);
  // const startY = Math.floor((height - sumH) / 2);

  const startX = 0;
  const startY = 0;

  const myCoords: CanvasCoords[][] = [...Array(7)].map((_e) => Array(5));

  for (let i = 0; i < numX; i++) {
    for (let j = 0; j < numY; j++) {
      const x = startX + i * CELL_W + (i - 1) * BORDER;
      const y = startY + j * CELL_W + (j - 1) * BORDER;
      let rectangle = new PIXI.Graphics();
      rectangle.beginFill(0x222266, 0.4);
      rectangle.drawRect(0, 0, CELL_W, CELL_W);
      rectangle.endFill();
      rectangle.x = x;
      rectangle.y = y;
      rectangle.zIndex = GameZIndex.Board;
      // app.stage.addChild(rectangle);

      myCoords[i][j] = { x, y };
    }
  }

  return myCoords;
}

export class GameBoard extends GameObject {
  constructor(manager: PixiManager) {
    const container = new PIXI.Container();

    super(manager, container);
  }
}

import { CanvasCoords } from './PixiTypes';
import * as PIXI from 'pixi.js';

// general-purpose, smaller utils
export function makeDebugRect(
  width: number,
  height: number
): PIXI.DisplayObject {
  const debugRect = new PIXI.Graphics();
  debugRect.position.set(0, 0);
  debugRect.beginFill(0xff0000, 1.0);
  debugRect.drawRect(0, 0, width, height);
  debugRect.endFill();

  return debugRect;
}

type GridProps = {
  width: number;
  height: number;
  app: PIXI.Application;
};
export function makeGrid({ width, height, app }: GridProps): CanvasCoords[][] {
  const numX = 7;
  const numY = 5;
  const DIM = 36;
  const BORDER = 1;
  const sumW = (BORDER + DIM) * numX - BORDER;
  const sumH = (BORDER + DIM) * numY - BORDER;

  const startX = Math.floor((width - sumW) / 2);
  const startY = Math.floor((height - sumH) / 2);

  const myCoords: CanvasCoords[][] = [...Array(7)].map((_e) => Array(5));

  for (let i = 0; i < numX; i++) {
    for (let j = 0; j < numY; j++) {
      const x = startX + i * DIM + (i - 1) * BORDER;
      const y = startY + j * DIM + (j - 1) * BORDER;
      let rectangle = new PIXI.Graphics();
      rectangle.beginFill(0x222266, 0.4);
      rectangle.drawRect(0, 0, DIM, DIM);
      rectangle.endFill();
      rectangle.x = x;
      rectangle.y = y;
      app.stage.addChild(rectangle);

      myCoords[i][j] = { x, y };
    }
  }

  return myCoords;
}

import * as PIXI from 'pixi.js';
import { BoardCoords, CanvasCoords, LineAlignment } from './PixiTypes';

// general-purpose, smaller utils
export function makeRect(
  width: number,
  height: number,
  fill: number,
  alpha: number,
  stroke: number | null = null,
  strokeW: number = 2,
  strokeA = 1.0
): PIXI.DisplayObject {
  const rect = new PIXI.Graphics();
  rect.position.set(0, 0);
  rect.beginFill(fill, alpha);
  if (stroke !== null)
    rect.lineStyle(strokeW, stroke, strokeA, LineAlignment.Inner);
  rect.drawRect(0, 0, width, height);
  rect.endFill();

  return rect;
}

export const compareBoardCoords = (
  a: BoardCoords | null,
  b: BoardCoords | null
) => {
  if (!a || !b) return false;
  return a.row === b.row && a.col === b.col;
};
export const compareCanvasCoords = (
  a: CanvasCoords | null,
  b: CanvasCoords | null
) => {
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y;
};

export const taxiCab = (a: BoardCoords, b: BoardCoords): number =>
  Math.abs(a.col - b.col) + Math.abs(a.row - b.row);

export const idxsIncludes = (idxs: BoardCoords[], idx: BoardCoords | null) => {
  for (const myIdx of idxs) {
    if (compareBoardCoords(myIdx, idx)) return true;
  }
  return false;
};

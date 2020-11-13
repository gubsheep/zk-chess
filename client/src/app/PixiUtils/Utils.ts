import * as PIXI from 'pixi.js';
import { BoardCoords, CanvasCoords } from './PixiTypes';

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

export const idxsIncludes = (idxs: BoardCoords[], idx: BoardCoords | null) => {
  for (const myIdx of idxs) {
    if (compareBoardCoords(myIdx, idx)) return true;
  }
  return false;
};

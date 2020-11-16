import * as PIXI from 'pixi.js';
import { PixiManager } from '../../api/PixiManager';
import { BoardLocation } from '../../_types/global/GlobalTypes';
import { GameObject } from './GameObject';
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

export class Wrapper extends GameObject {
  constructor(manager: PixiManager, object: PIXI.Container) {
    super(manager);
    this.object.addChild(object);
  }
}

export const boardCoordsFromLoc = (loc: BoardLocation): BoardCoords => ({
  col: loc[0],
  row: loc[1],
});

export const boardLocFromCoords = (coords: BoardCoords): BoardLocation => [
  coords.col,
  coords.row,
];

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

export const idxsIncludes = (
  idxs: BoardCoords[],
  idx: BoardCoords | null
): BoardCoords | null => {
  for (const myIdx of idxs) {
    if (compareBoardCoords(myIdx, idx)) return myIdx;
  }
  return null;
};

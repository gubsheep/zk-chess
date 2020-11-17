import * as PIXI from 'pixi.js';
import { PixiManager } from '../../api/PixiManager';
import { BoardLocation } from '../../_types/global/GlobalTypes';
import { BoardCoords, CanvasCoords, LineAlignment } from './@PixiTypes';

// general-purpose, smaller utils

export const pieceNames = [
  'Mothership', // Mothership_00,
  'Cruiser', // Cruiser_01,
  'Frigate', // Frigate_02,
  'Corvette', // Corvette_03,
  'Submarine', // Submarine_04,
  'Warship', // Warship_05,
];

export function makeRect(
  width: number,
  height: number,
  fill: number = 0xff0000,
  alpha: number = 1.0,
  stroke: number | null = null,
  strokeW: number = 2,
  strokeA = 1.0
): PIXI.Container {
  const rect = new PIXI.Graphics();
  rect.position.set(0, 0);
  rect.beginFill(fill, alpha);
  if (stroke !== null)
    rect.lineStyle(strokeW, stroke, strokeA, LineAlignment.Inner);
  rect.drawRect(0, 0, width, height);
  rect.endFill();

  return rect;
}

export function objFromHitArea(rect: PIXI.Rectangle): PIXI.DisplayObject {
  const rectObj = makeRect(
    rect.width,
    rect.height,
    0xff0000,
    1,
    0x000000,
    2,
    0.3
  );
  rectObj.position.set(rect.left, rect.top);
  return rectObj;
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

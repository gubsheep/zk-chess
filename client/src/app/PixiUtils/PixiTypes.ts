export type CanvasCoords = { x: number; y: number };

export type BoardCoords = { row: number; col: number };

export enum PlayerColor {
  Red = 'Red',
  Blue = 'Blue',
}

export enum LineAlignment {
  Inner = 0,
  Middle = 0.5,
  Outer = 1,
}

export type BoxBounds = {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export type MoveAttack = {
  attack: BoardCoords,
  move: BoardCoords
}
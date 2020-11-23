export type CanvasCoords = { x: number; y: number };

export type BoardCoords = { row: number; col: number };

export enum PlayerColor {
  Red = 'RED',
  Blue = 'BLUE',
}

export enum PlayerType {
  Player1 = 'Player1',
  Player2 = 'Player2',
  Spectator = 'Spectator',
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
};

export type MoveAttack = {
  attack: BoardCoords;
  move: BoardCoords;
};

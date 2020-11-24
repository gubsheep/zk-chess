export type CanvasCoords = { x: number; y: number };

export type BoardCoords = { row: number; col: number };

export enum PlayerColor {
  Red = 'RED',
  Blue = 'BLUE',
}

export enum PlayerName {
  Alice = 'Alice',
  Bob = 'Bob',
  Spectator = 'Spectator',
}

export enum CardType {
  EMPTY_00,
  ATK_S_01,
  ATK_L_02,
  DMG_S_03,
  DMG_L_04,
  HP_S_05,
  HP_L_06,
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

import {
  ChessGame,
  ChessBoard,
  BoardLocation,
  ChessCell,
  PieceType,
  Color,
} from '../_types/global/GlobalTypes';
import { address, almostEmptyAddress, emptyAddress } from './CheckedTypeUtils';
import { SIZE } from './constants';

export const transpose = (board: ChessBoard): ChessBoard => {
  return board.map((_, colIndex) => board.map((row) => row[colIndex]));
};

export const compareLoc = (
  a: BoardLocation | null,
  b: BoardLocation | null
): boolean => {
  if (!a || !b) return false;
  return a[0] === b[0] && a[1] === b[1];
};

export const hasLoc = (arr: BoardLocation[], loc: BoardLocation): boolean => {
  for (const iloc of arr) {
    if (compareLoc(iloc, loc)) return true;
  }
  return false;
};

export const getCanMove = (
  loc: BoardLocation,
  pieceType: PieceType
): BoardLocation[] => {
  if (pieceType === PieceType.King) {
    return [
      [loc[0] + 1, loc[1]],
      [loc[0] - 1, loc[1]],
      [loc[0], loc[1] + 1],
      [loc[0], loc[1] - 1],
      [loc[0] + 1, loc[1] + 1],
      [loc[0] - 1, loc[1] - 1],
      [loc[0] + 1, loc[1] - 1],
      [loc[0] - 1, loc[1] + 1],
    ];
  } else if (pieceType === PieceType.Knight) {
    return [
      [loc[0] + 1, loc[1] + 2],
      [loc[0] + 1, loc[1] - 2],
      [loc[0] - 1, loc[1] + 2],
      [loc[0] - 1, loc[1] - 2],

      [loc[0] + 2, loc[1] + 1],
      [loc[0] + 2, loc[1] - 1],
      [loc[0] - 2, loc[1] + 1],
      [loc[0] - 2, loc[1] - 1],
    ];
  }

  return [];
};

export const boardFromGame = (game: ChessGame): ChessBoard => {
  const allPieces = game.myPieces.concat(game.theirPieces);
  const { myGhost, objectives } = game;

  const tempBoard: ChessCell[][] = Array(SIZE)
    .fill(null)
    .map(() =>
      Array(SIZE)
        .fill(null)
        .map((_) => new Object())
    );

  for (const piece of allPieces) {
    const loc = piece.location;
    tempBoard[loc[0]][loc[1]].piece = piece;
  }

  if (myGhost) {
    const loc = myGhost.location;
    tempBoard[loc[0]][loc[1]].ghost = myGhost;
  }

  for (const objective of objectives) {
    const loc = objective.location;
    tempBoard[loc[0]][loc[1]].objective = objective;
  }

  return tempBoard as ChessBoard;
};

const makePiece = (
  loc: BoardLocation,
  color: Color,
  type: PieceType = PieceType.King
) => ({
  id: Math.random(),
  owner: color === Color.WHITE ? emptyAddress : almostEmptyAddress,
  location: loc,
  pieceType: type,
  captured: false,
});

const makeObjective = (
  loc: BoardLocation,
  value: number = 10,
  player: Color | null
) => ({
  id: Math.random(),
  owner: player
    ? player === Color.WHITE
      ? emptyAddress
      : almostEmptyAddress
    : null,
  location: loc,
  value,
});

export const sampleGame: ChessGame = {
  myAddress: emptyAddress,
  player1: { address: emptyAddress },
  player2: { address: almostEmptyAddress },
  turnNumber: 0,
  myPieces: [
    makePiece([1, 6], Color.WHITE),
    makePiece([3, 6], Color.WHITE, PieceType.Knight),
    makePiece([5, 6], Color.WHITE),
  ],
  theirPieces: [
    makePiece([1, 0], Color.BLACK),
    makePiece([3, 0], Color.BLACK, PieceType.Knight),
    makePiece([5, 0], Color.BLACK),
  ],
  myGhost: { location: [6, 2], id: 0, owner: null },
  objectives: [
    makeObjective([0, 3], 10, -1),
    makeObjective([3, 3], 10, 0),
    makeObjective([6, 3], 10, 1),
  ],
};

import {
  ChessGame,
  ChessBoard,
  BoardLocation,
  ChessCell,
  PieceType,
} from '../_types/global/GlobalTypes';

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
  }

  return [];
};

export const boardFromGame = (game: ChessGame): ChessBoard => {
  const allPieces = game.player1pieces.concat(game.player2pieces);
  const { size, player1ghost } = game;

  const tempBoard: (ChessCell | null)[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(null));

  for (const piece of allPieces) {
    const loc = piece.location;
    tempBoard[loc[0]][loc[1]] = { piece };
  }

  if (player1ghost) {
    const loc = player1ghost.location;
    const temp = tempBoard[loc[0]][loc[1]];
    if (temp) {
      temp.ghost = player1ghost;
    } else {
      tempBoard[loc[0]][loc[1]] = { ghost: player1ghost };
    }
  }

  for (let i = 0; i < tempBoard.length; i++) {
    for (let j = 0; j < tempBoard[0].length; j++) {
      if (!tempBoard[i][j]) tempBoard[i][j] = new Object() as ChessCell;
    }
  }

  return tempBoard as ChessBoard;
};

export const sampleGame: ChessGame = {
  player1pieces: [
    {
      pieceType: PieceType.King,
      location: [0, 0],
    },
    {
      pieceType: PieceType.King,
      location: [0, 1],
    },
    {
      pieceType: PieceType.King,
      location: [0, 3],
    },
    {
      pieceType: PieceType.King,
      location: [0, 5],
    },
    {
      pieceType: PieceType.King,
      location: [0, 6],
    },
  ],
  player1ghost: { location: [6, 3] },
  player2pieces: [
    {
      pieceType: PieceType.King,
      location: [6, 0],
    },
    {
      pieceType: PieceType.King,
      location: [6, 1],
    },
    {
      pieceType: PieceType.King,
      location: [6, 3],
    },
    {
      pieceType: PieceType.King,
      location: [6, 5],
    },
    {
      pieceType: PieceType.King,
      location: [6, 6],
    },
  ],
  player2ghost: { location: [2, 2] },
  size: 7,
};

import {
  ChessGame,
  ChessBoard,
  BoardLocation,
  ChessCell,
  PieceType,
  Color,
  Ghost,
  Piece,
  EthAddress,
  Player,
  GameState,
} from '../_types/global/GlobalTypes';
import { almostEmptyAddress, emptyAddress } from './CheckedTypeUtils';
import { SIZE } from './constants';

const transpose = (board: ChessBoard): ChessBoard => {
  return board.map((_, colIndex) => board.map((row) => row[colIndex]));
};

const rot180 = (board: ChessBoard): ChessBoard => {
  return board.map((row) => row.reverse()).reverse();
};

const whiteTransform = (board: ChessBoard): ChessBoard => transpose(board);

const blackTransform = (board: ChessBoard): ChessBoard =>
  rot180(transpose(board));

export const boardMap = (color: Color): ((b: ChessBoard) => ChessBoard) =>
  color === Color.WHITE ? whiteTransform : blackTransform;

const whiteBoardLocMap = ([i, j]: BoardLocation): BoardLocation => [j, i];
const blackBoardLocMap = ([i, j]: BoardLocation): BoardLocation => [
  6 - j,
  6 - i,
];

export const isGhost = (piece: Piece | Ghost): boolean => {
  if (piece.hasOwnProperty('pieceType')) return false;
  return true;
};

export const boardLocMap = (
  color: Color
): ((loc: BoardLocation) => BoardLocation) =>
  color === Color.WHITE ? whiteBoardLocMap : blackBoardLocMap;

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

export const getCanMoveLoc = (
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

export const getCanMove = (obj: Piece | Ghost | null): BoardLocation[] => {
  if (!obj) return [];
  const loc = obj.location;
  if (isGhost(obj)) return getCanMoveLoc(loc, PieceType.King);
  else return getCanMoveLoc(loc, (obj as Piece).pieceType);
};

export const boardFromGame = (game: ChessGame | null): ChessBoard => {
  if (!game) return [];
  const allPieces = game.player1pieces.concat(game.player2pieces);
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

export type ScoreEntry = {
  player: Player;
  score: number;
};

export const getScores = (game: ChessGame): [ScoreEntry, ScoreEntry] => {
  let p1score = 0;
  let p2score = 0;

  for (const objective of game.objectives) {
    if (objective.owner === game.player1.address) {
      p1score += objective.value;
    } else if (objective.owner === game.player2.address) {
      p2score += objective.value;
    }
  }

  return [
    { player: game.player1, score: p1score },
    { player: game.player2, score: p2score },
  ];
};

export const enemyGhostMoved = (
  oldState: ChessGame,
  newState: ChessGame,
  myAddress: EthAddress | null
): BoardLocation | null => {
  if (!myAddress) return null;
  const isPlayer1 = oldState.player1.address === myAddress;
  const myOldPieces = isPlayer1
    ? oldState.player1pieces
    : oldState.player2pieces;
  const myNewPieces = isPlayer1
    ? newState.player1pieces
    : newState.player2pieces;

  // no pieces taken
  if (myOldPieces.length === myNewPieces.length) return null;

  // find where a piece was taken
  for (const piece of myOldPieces) {
    let found = false;
    for (const newPiece of myNewPieces) {
      if (newPiece.id === piece.id) {
        found = true;
        break;
      }
    }

    if (!found) return piece.location;
  }

  return null;
};

export const sampleGame: ChessGame = {
  myAddress: emptyAddress,
  player1: { address: emptyAddress },
  player2: { address: almostEmptyAddress },
  turnNumber: 0,
  gameState: GameState.P1_TO_MOVE,
  player1pieces: [
    makePiece([1, 6], Color.WHITE),
    makePiece([3, 6], Color.WHITE, PieceType.Knight),
    makePiece([5, 6], Color.WHITE),
  ],
  player2pieces: [
    makePiece([1, 1], Color.BLACK),
    makePiece([3, 0], Color.BLACK, PieceType.Knight),
    makePiece([5, 0], Color.BLACK),
  ],
  myGhost: {
    location: [1, 1],
    id: Math.random(),
    owner: emptyAddress,
    commitment: '0',
  },
  objectives: [
    makeObjective([0, 3], 10, Color.WHITE),
    makeObjective([3, 3], 10, null),
    makeObjective([6, 3], 10, Color.BLACK),
  ],
};

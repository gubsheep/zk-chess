import {
  ChessGame,
  ChessBoard,
  BoardLocation,
  ChessCell,
  PieceType,
  Color,
  EthAddress,
  Player,
  GameStatus,
  PlayerInfo,
  Piece,
  isZKPiece,
  isKnown,
} from '../_types/global/GlobalTypes';
import {almostEmptyAddress, emptyAddress} from './CheckedTypeUtils';
import {SIZE} from './constants';

const transpose = (board: ChessBoard): ChessBoard => {
  return board.map((_, colIndex) => board.map((row) => row[colIndex]));
};

const rot180 = (board: ChessBoard): ChessBoard => {
  return board.map((row) => row.reverse()).reverse();
};

const blackTransform = (board: ChessBoard): ChessBoard => transpose(board);

const whiteTransform = (board: ChessBoard): ChessBoard =>
  rot180(transpose(board));

export const boardMap = (
  player: PlayerInfo | null
): ((b: ChessBoard) => ChessBoard) =>
  player?.color === Color.WHITE ? whiteTransform : blackTransform;

const blackBoardLocMap = ([i, j]: BoardLocation): BoardLocation => [j, i];
const whiteBoardLocMap = ([i, j]: BoardLocation): BoardLocation => [
  6 - j,
  6 - i,
];

export const boardLocMap = (
  player: PlayerInfo | null
): ((loc: BoardLocation) => BoardLocation) =>
  player?.color === Color.WHITE ? whiteBoardLocMap : blackBoardLocMap;

export const isGhost = (piece: Piece): boolean => {
  return isZKPiece(piece);
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

export const inBounds = (loc: BoardLocation, size: number): boolean => {
  return loc[0] >= 0 && loc[1] < size && loc[1] >= 0 && loc[0] < size;
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

export const getCanMove = (obj: Piece): BoardLocation[] => {
  if (!obj) return [];
  if (isZKPiece(obj) && !isKnown(obj)) return [];
  const loc = obj.location;
  if (isGhost(obj)) return getCanMoveLoc(loc, PieceType.King);
  else return getCanMoveLoc(loc, obj.pieceType);
};

export const boardFromGame = (game: ChessGame | null): ChessBoard => {
  if (!game) return [];
  const allPieces = game.pieces;

  const tempBoard: ChessCell[][] = Array(SIZE)
    .fill(null)
    .map(() =>
      Array(SIZE)
        .fill(null)
        .map((_) => new Object())
    );

  for (const piece of allPieces) {
    if (!isZKPiece(piece)) {
      const loc = piece.location;
      tempBoard[loc[0]][loc[1]].piece = piece;
    } else if (isKnown(piece)) {
      const loc = piece.location;
      tempBoard[loc[0]][loc[1]].ghost = piece;
    }
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
  alive: true,
});

export type ScoreEntry = {
  player: Player;
  score: number;
};

export const getScores = (game: ChessGame): [ScoreEntry, ScoreEntry] => {
  let p1score = 0;
  let p2score = 0;

  return [
    {player: game.player1, score: p1score},
    {player: game.player2, score: p2score},
  ];
};

export const enemyGhostMoved = (
  oldState: ChessGame | null,
  newState: ChessGame | null,
  myAddress: EthAddress | null
): BoardLocation | null => {
  if (!myAddress || !oldState || !newState) return null;
  const myOldPieces = oldState.pieces.filter(
    (piece) => piece.owner === myAddress && piece.alive
  );
  const myNewPieces = newState.pieces.filter(
    (piece) => piece.owner === myAddress && piece.alive
  );

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

    if (!found && !isZKPiece(piece)) return piece.location;
  }

  return null;
};

export const sampleGame: ChessGame = {
  gameAddress: emptyAddress,
  gameId: '0',
  myAddress: emptyAddress,
  player1: {address: emptyAddress},
  player2: {address: almostEmptyAddress},
  turnNumber: 0,
  gameStatus: GameStatus.P1_TO_MOVE,
  pieces: [
    makePiece([2, 6], Color.WHITE),
    makePiece([3, 6], Color.WHITE, PieceType.Knight),
    makePiece([4, 6], Color.WHITE),
    makePiece([2, 1], Color.BLACK),
    makePiece([3, 0], Color.BLACK, PieceType.Knight),
    makePiece([4, 0], Color.BLACK),
  ],
};

export const getAdjacentTiles = (from: BoardLocation): BoardLocation[] => {
  const up: BoardLocation = [from[0], from[1] + 1];
  const down: BoardLocation = [from[0], from[1] - 1];
  const left: BoardLocation = [from[0] - 1, from[1]];
  const right: BoardLocation = [from[0] + 1, from[1]];
  const ret: BoardLocation[] = [];

  for (const loc of [up, down, left, right]) {
    if (loc[0] < SIZE || loc[0] >= 0 || loc[1] < SIZE || loc[0] >= 0) {
      ret.push(loc);
    }
  }

  return ret;
};

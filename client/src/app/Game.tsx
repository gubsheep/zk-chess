import React from 'react';
import { useEffect } from 'react';
import { useState } from 'react';
import styled from 'styled-components';
import {
  boardFromGame,
  compareLoc,
  getCanMove,
  hasLoc,
  sampleGame,
} from '../utils/ChessUtils';
import {
  BoardLocation,
  ChessCell,
  ChessGame,
  SetFn,
} from '../_types/global/GlobalTypes';
import { ChessPiece, Ghost } from './ChessPiece';

const borderColor = 'black';
const StyledGameBoard = styled.table`
  & tr:last-child td {
    border-bottom: 1px solid ${borderColor};
  }

  & td {
    width: 64pt;
    height: 64pt;
    padding: 0;
    margin: 0;
    position: relative;

    border-left: 1px solid ${borderColor};
    border-top: 1px solid ${borderColor};

    &:last-child {
      border-right: 1px solid ${borderColor};
    }
  }
`;

const StyledGameCell = styled.div<{ selected: boolean; canMove: boolean }>`
  width: 100%;
  height: 100%;
  margin: 0;

  background: ${(props) =>
    props.selected ? '#d8d8d8' : props.canMove ? '#f2f2f2' : 'none'};
`;

function GameCell({
  cell,
  location,
  setSelected,
  setCanMove,
  selected,
  canMove,
}: {
  cell: ChessCell;
  location: BoardLocation;
  setSelected: SetFn<BoardLocation | null>;
  setCanMove: SetFn<BoardLocation[]>;
  selected: boolean;
  canMove: boolean;
}) {
  const setLoc = () => {
    if (selected) {
      setSelected(null);
      setCanMove([]);
      return;
    }
    if (cell.piece) {
      setSelected(location);
      setCanMove(getCanMove(location, cell.piece.pieceType));
    } else {
      setSelected(null);
      setCanMove([]);
    }
  };
  return (
    <td>
      <StyledGameCell onClick={setLoc} selected={selected} canMove={canMove}>
        {cell.piece && <ChessPiece type={cell.piece.pieceType} />}
        {cell.ghost && <Ghost />}
      </StyledGameCell>
    </td>
  );
}

function GameBoard({ game }: { game: ChessGame }) {
  const board = boardFromGame(game);

  const [selected, setSelected] = useState<BoardLocation | null>(null);
  const [canMove, setCanMove] = useState<BoardLocation[]>([]);

  useEffect(() => {
    console.log(selected);
  }, [selected]);

  return (
    <StyledGameBoard>
      <tbody>
        {board.map((row: ChessCell[], i: number) => (
          <tr key={i}>
            {row.map((cell: ChessCell, j: number) => (
              <GameCell
                location={[i, j]}
                key={i + ',' + j}
                cell={cell}
                setSelected={setSelected}
                setCanMove={setCanMove}
                selected={compareLoc(selected, [i, j])}
                canMove={hasLoc(canMove, [i, j])}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </StyledGameBoard>
  );
}

const StyledGame = styled.div`
  margin: 4em auto;
  width: fit-content;
`;

enum TurnState {
  MovePiece,
  MoveGhost,
  Waiting,
}

export function Game() {
  const [turnState, _setTurnState] = useState<TurnState>(TurnState.MovePiece);

  // only advance the game when gameUIManager says the game can advance
  useEffect(() => {
    return () => {};
  }, []);

  return (
    <StyledGame>
      <GameBoard game={sampleGame} />
      <p>
        {
          [
            'your turn! move a piece...',
            'your turn! move the ghost (or pass)',
            'awaiting opponent...',
          ][turnState]
        }
      </p>
    </StyledGame>
  );
}

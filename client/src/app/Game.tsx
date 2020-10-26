import _ from 'lodash';
import React from 'react';
import { useLayoutEffect } from 'react';
import { useEffect } from 'react';
import { useState } from 'react';
import styled from 'styled-components';
import AbstractGameManager, {
  GameManagerEvent,
} from '../api/AbstractGameManager';
import {
  boardFromGame,
  compareLoc,
  getCanMove,
  hasLoc,
  sampleGame,
  transpose,
} from '../utils/ChessUtils';
import {
  BoardLocation,
  ChessCell,
  ChessGame,
  Hook,
  Piece,
  PieceType,
  SetFn,
} from '../_types/global/GlobalTypes';
import { ChessPiece, Ghost, ObjectivePiece } from './BoardPieces';

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
  setHovering,
  selected,
  canMove,
  staged,
}: {
  cell: ChessCell;
  location: BoardLocation;
  setHovering: SetFn<BoardLocation | null>;
  selected: boolean;
  canMove: boolean;
  staged?: Piece;
}) {
  return (
    <td onMouseEnter={() => setHovering(location)}>
      <StyledGameCell selected={selected} canMove={canMove}>
        {cell.objective && <ObjectivePiece objective={cell.objective} />}
        {staged && <ChessPiece piece={staged} staged />}
        {cell.piece && <ChessPiece piece={cell.piece} />}
        {cell.ghost && <Ghost />}
      </StyledGameCell>
    </td>
  );
}

enum TurnState {
  Moving, // no move made
  Staging, // move made, ask to confirm
  Submitting, // move submitted to chain
  Waiting, // move confirmed by chain; await other player
}

// enum ClickState {
//   None,
//   Selected,
//   Staged,
// }

const StyledGame = styled.div`
  margin: 4em auto;
  width: fit-content;
`;

export function Game({ gameManager }: { gameManager: AbstractGameManager }) {
  const [turnState, setTurnState] = useState<TurnState>(TurnState.Moving);

  const [gameState, setGameState] = useState<ChessGame>(
    _.cloneDeep(gameManager.getGameState())
  );
  const board = boardFromGame(gameState);

  const [selected, setSelected] = useState<BoardLocation | null>(null);
  const [canMove, setCanMove] = useState<BoardLocation[]>([]);
  const [staged, setStaged] = useState<[BoardLocation, Piece] | null>(null);

  const [hovering, setHovering] = useState<BoardLocation | null>(null);

  // attach event listeners
  useEffect(() => {
    const doAccept = () => {
      setTurnState(TurnState.Submitting);
    };

    gameManager.addListener(GameManagerEvent.MoveAccepted, doAccept);

    return () => {
      gameManager.removeListener(GameManagerEvent.MoveAccepted, doAccept);
    };
  });
  useEffect(() => {
    const doConfirm = () => {
      setGameState(_.cloneDeep(gameManager.getGameState()));
      setSelected(null);
      setTurnState(TurnState.Moving);
    };

    gameManager.addListener(GameManagerEvent.MoveConfirmed, doConfirm);

    return () => {
      gameManager.removeAllListeners(GameManagerEvent.MoveConfirmed);
    };
  });

  const submitMove = () => {
    if (!selected) return;

    const selectedPiece = board[selected[0]][selected[1]].piece;

    if (selectedPiece && staged) {
      console.log(selectedPiece);
      gameManager.movePiece(selectedPiece?.id, staged[0]);
      setTurnState(TurnState.Submitting);
    }
  };

  // clicking should be managed at this level
  const doClick = (_e: React.MouseEvent) => {
    if (turnState >= TurnState.Submitting) return;
    if (!hovering) return;
    const loc = hovering;
    const piece = board[loc[0]][loc[1]].piece;

    if (selected) {
      if (compareLoc(selected, loc)) {
        setSelected(null);
        setTurnState(TurnState.Moving);
        return;
      }
      if (hasLoc(canMove, loc)) {
        const selectedPiece = board[selected[0]][selected[1]].piece;
        if (selectedPiece) {
          setStaged([loc, selectedPiece]);
          setTurnState(TurnState.Staging);
        }
        return;
      }
    }

    if (piece) {
      setSelected(hovering);
    }
  };

  // sync selected to canMove
  useLayoutEffect(() => {
    setStaged(null);
    const loc = selected;
    if (!loc) {
      setCanMove([]);
      return;
    }
    const piece = board[loc[0]][loc[1]].piece;
    if (piece) setCanMove(getCanMove(loc, piece.pieceType));
  }, [selected]);

  return (
    <StyledGame>
      <StyledGameBoard onMouseLeave={() => setHovering(null)} onClick={doClick}>
        <tbody>
          {transpose(board).map((row: ChessCell[], i: number) => (
            <tr key={i}>
              {row.map((cell: ChessCell, j: number) => {
                const loc: BoardLocation = [j, i];
                return (
                  <GameCell
                    key={JSON.stringify(loc)}
                    location={loc}
                    cell={cell}
                    setHovering={setHovering}
                    selected={compareLoc(selected, loc)}
                    canMove={hasLoc(canMove, loc)}
                    staged={
                      staged && compareLoc(staged[0], loc)
                        ? staged[1]
                        : undefined
                    }
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </StyledGameBoard>
      <p>
        {turnState === TurnState.Moving && (
          <span>your turn! move a piece...</span>
        )}
        {turnState === TurnState.Staging && (
          <span>
            your turn! move a piece...{' '}
            <u onClick={submitMove}>click to confirm</u>
          </span>
        )}
        {turnState === TurnState.Submitting && <span>submitting move...</span>}
        {turnState === TurnState.Waiting && (
          <span>move confirmed. awaiting other player...</span>
        )}
      </p>
    </StyledGame>
  );
}

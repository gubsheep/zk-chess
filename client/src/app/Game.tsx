import React from "react";
import { useLayoutEffect } from "react";
import { useEffect } from "react";
import { useState } from "react";
import styled from "styled-components";
import {
  boardFromGame,
  compareLoc,
  getCanMove,
  hasLoc,
  sampleGame,
  transpose,
} from "../utils/ChessUtils";
import {
  BoardLocation,
  ChessCell,
  ChessGame,
  Hook,
  Piece,
  PieceType,
  SetFn,
} from "../_types/global/GlobalTypes";
import { ChessPiece, Ghost } from "./ChessPiece";

const borderColor = "black";
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
    props.selected ? "#d8d8d8" : props.canMove ? "#f2f2f2" : "none"};
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

export function Game() {
  const [turnState, setTurnState] = useState<TurnState>(TurnState.Moving);

  const board = boardFromGame(sampleGame);

  const [selected, setSelected] = useState<BoardLocation | null>(null);
  const [canMove, setCanMove] = useState<BoardLocation[]>([]);
  const [staged, setStaged] = useState<[BoardLocation, Piece] | null>(null);

  const [hovering, setHovering] = useState<BoardLocation | null>(null);

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
                    location={loc}
                    key={JSON.stringify(loc)}
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
            your turn! move a piece...{" "}
            <u onClick={() => setTurnState(TurnState.Submitting)}>
              click to confirm
            </u>
          </span>
        )}
        {turnState === TurnState.Waiting && (
          <span>awaiting other player...</span>
        )}
      </p>
    </StyledGame>
  );
}

import _ from 'lodash';
import React, { useContext } from 'react';
import { useLayoutEffect } from 'react';
import { useEffect } from 'react';
import { useState } from 'react';
import styled from 'styled-components';
import AbstractGameManager, {
  GameManagerEvent,
} from '../api/AbstractGameManager';
import GameManager from '../api/GameManager';
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
  Color,
  Hook,
  Piece,
  PieceType,
  SetFn,
} from '../_types/global/GlobalTypes';
import { ChessPiece, Ghost, ObjectivePiece } from './BoardPieces';
import { GameManagerContext } from './LandingPage';

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
  // data
  cell: ChessCell;
  location: BoardLocation;
  setHovering: SetFn<BoardLocation | null>;

  // for displaying
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
        {cell.ghost && <Ghost color={Color.WHITE} />}
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
  const gm = useContext<AbstractGameManager | null>(GameManagerContext);
  if (!gm) return <>error initializing</>;

  const [turnState, setTurnState] = useState<TurnState>(TurnState.Moving);

  const [gameState, setGameState] = useState<ChessGame>(
    _.cloneDeep(gm.getGameState())
  );
  const board = boardFromGame(gameState);

  const [selected, setSelected] = useState<BoardLocation | null>(null);
  const [canMove, setCanMove] = useState<BoardLocation[]>([]);
  const [staged, setStaged] = useState<[BoardLocation, Piece] | null>(null);

  const [hovering, setHovering] = useState<BoardLocation | null>(null);

  /* attach event listeners */
  // when a move is accepted, wait for a response
  useEffect(() => {
    const doAccept = () => setTurnState(TurnState.Submitting);
    gm.addListener(GameManagerEvent.MoveAccepted, doAccept);

    return () => {
      gm.removeAllListeners(GameManagerEvent.MoveAccepted);
    };
  });

  // when you get a response, sync the game state
  useEffect(() => {
    const doConfirm = () => {
      const newState = gm.getGameState();
      setGameState(_.cloneDeep(newState));
      setSelected(null);

      if (gm.isMyTurn()) {
        setTurnState(TurnState.Moving);
      } else {
        setTurnState(TurnState.Waiting);
      }
    };
    gm.addListener(GameManagerEvent.MoveConfirmed, doConfirm);

    return () => {
      gm.removeAllListeners(GameManagerEvent.MoveConfirmed);
    };
  });

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

  const submitMove = () => {
    if (!selected) return;

    const selectedPiece = board[selected[0]][selected[1]].piece;

    if (selectedPiece && staged) {
      console.log(selectedPiece);
      gm.movePiece(selectedPiece?.id, staged[0]);
      setTurnState(TurnState.Submitting);
    }
  };

  // events are managed globally by the board
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

  return (
    <StyledGame>
      <StyledGameBoard onMouseLeave={() => setHovering(null)} onClick={doClick}>
        <tbody>
          {transpose(board).map((row: ChessCell[], j: number) => (
            <tr key={j}>
              {row.map((cell: ChessCell, i: number) => {
                const loc: BoardLocation = [i, j];
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

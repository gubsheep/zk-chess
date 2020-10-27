import _ from 'lodash';
import React, { useContext, useLayoutEffect } from 'react';
import { useEffect } from 'react';
import { useState } from 'react';
import styled from 'styled-components';
import AbstractGameManager, {
  GameManagerEvent,
} from '../api/AbstractGameManager';
import {
  boardFromGame,
  boardLocMap,
  boardMap,
  compareLoc,
  getCanMove,
  hasLoc,
} from '../utils/ChessUtils';
import {
  BoardLocation,
  ChessCell,
  ChessGame,
  Color,
  Ghost,
  Hook,
  Piece,
  PieceType,
  SetFn,
} from '../_types/global/GlobalTypes';
import {
  ChessPiece,
  GhostPiece,
  ObjectivePiece,
  PiecePos,
} from './BoardPieces';
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

const StyledGameCell = styled.div<{ canMove: boolean }>`
  width: 100%;
  height: 100%;
  margin: 0;

  background: ${(props) => (props.canMove ? '#f2f2f2' : 'none')};
`;

function GameCell({
  cell,
  location,
  setHoveringLoc,
  selectedHook,
  canMove,
  staged,
}: {
  // data
  cell: ChessCell;
  location: BoardLocation;
  setHoveringLoc: SetFn<BoardLocation | null>;

  // for displaying
  selectedHook: Hook<number | null>;
  canMove: boolean;
  staged?: Piece;
}) {
  const [selected, setSelected] = selectedHook;

  const makeClick = (obj: Piece | Ghost): (() => void) => () => {
    if (obj) {
      if (selected === obj.id) {
        setSelected(null);
      } else {
        setSelected(obj.id);
      }
    }
  };

  const emptyHandler = (): void => {
    if (!cell.piece && !cell.ghost) setSelected(null);
  };

  const double = cell.piece && cell.ghost;

  return (
    <td onMouseEnter={() => setHoveringLoc(location)} onClick={emptyHandler}>
      <StyledGameCell canMove={canMove}>
        {cell.objective && <ObjectivePiece objective={cell.objective} />}
        {cell.piece && (
          <ChessPiece
            piece={cell.piece}
            onClick={makeClick(cell.piece)}
            isSelected={cell.piece.id === selected}
            pos={double ? PiecePos.topLeft : PiecePos.normal}
          />
        )}
        {cell.ghost && (
          <GhostPiece
            onClick={makeClick(cell.ghost)}
            isSelected={cell.ghost.id === selected}
            pos={double ? PiecePos.botRight : PiecePos.normal}
          />
        )}
        {staged && <ChessPiece piece={staged} staged isSelected={false} />}
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

  const myColor: Color | null = gm.getColor(gm.getAccount());
  if (!myColor) return <>error with color</>;

  const transform = boardMap(myColor);
  const locMap = boardLocMap(myColor);

  const [turnState, setTurnState] = useState<TurnState>(TurnState.Moving);

  const [gameState, setGameState] = useState<ChessGame>(
    _.cloneDeep(gm.getGameState())
  );
  const board = boardFromGame(gameState);

  // you can hover / select ghosts or pieces - keyed by id
  const selectedHook = useState<number | null>(null);
  const [selected, setSelected] = selectedHook;

  // once a ghost / piece is selected, you can stage it to a location
  const [hoveringLoc, setHoveringLoc] = useState<BoardLocation | null>(null);
  const [canMove, setCanMove] = useState<BoardLocation[]>([]);
  const [staged, setStaged] = useState<[BoardLocation, Piece] | null>(null);

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
    console.log(selected);

    setStaged(null);
    if (selected === null) {
      setCanMove([]);
      return;
    }

    // O(n^2) but it's small so whatever
    let obj: Ghost | Piece | null = null;
    for (const row of board) {
      for (const cell of row) {
        if (cell.piece?.id === selected) {
          obj = cell.piece;
          break;
        } else if (cell.ghost?.id === selected) {
          console.log('hey i found a ghost');
          obj = cell.ghost;
          break;
        }
      }
      if (obj) break;
    }

    setCanMove(getCanMove(obj));
    return;
  }, [selected]);

  const submitMove = () => {
    if (selected === null) return;

    if (staged) {
      gm.movePiece(selected, staged[0]);
      setTurnState(TurnState.Submitting);
    }
  };

  // events are managed globally by the board

  const doClick = (_e: React.MouseEvent) => {
    _e.preventDefault();
    return;

    /*
    if (turnState >= TurnState.Submitting) return;
    if (!hovering) return;
    const loc = hovering;
    const { piece, ghost } = board[loc[0]][loc[1]];

    if (selected) {
      // if a cell is already selected...
      if (hasLoc(canMove, loc)) {
        // if you clicked a pending loc, stage a move
        const selectedPiece = board[selected[0]][selected[1]].piece;
        if (selectedPiece) {
          setStaged([loc, selectedPiece]);
          setTurnState(TurnState.Staging);
        }
      } else {
        // otherwise reset selected
        setSelected(null);
        setTurnState(TurnState.Moving);
      }
      return;
    }

    if (ghost) {
      setSelected(hovering);
      return;
    }

    if (piece) {
      // only if the cell has a piece i own
      setSelected(hovering);
      return;
    }
    */
  };

  return (
    <StyledGame>
      <StyledGameBoard
        onMouseLeave={() => setHoveringLoc(null)}
        onClick={doClick}
      >
        <tbody>
          {transform(board).map((row: ChessCell[], i: number) => (
            <tr key={i}>
              {row.map((cell: ChessCell, j: number) => {
                const loc: BoardLocation = locMap([i, j]);
                return (
                  <GameCell
                    key={JSON.stringify(loc)}
                    location={loc}
                    cell={cell}
                    setHoveringLoc={setHoveringLoc}
                    selectedHook={selectedHook}
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

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
  enemyGhostMoved,
  getCanMove,
  getScores,
  hasLoc,
  isGhost,
} from '../utils/ChessUtils';
import {
  BoardLocation,
  ChessCell,
  ChessGame,
  Color,
  GameWinner,
  Ghost,
  Hook,
  Piece,
  Selectable,
  StagedLoc,
} from '../_types/global/GlobalTypes';
import { ChessPiece, ObjectivePiece, PiecePos } from './BoardPieces';
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
  selectedHook,
  canMove,
  stagedHook,
  gamePaused,
  enemyGhostOpacity,
}: {
  // data
  cell: ChessCell;
  location: BoardLocation;
  gamePaused: boolean;

  // for displaying
  selectedHook: Hook<Selectable | null>;
  canMove: boolean;
  stagedHook: Hook<StagedLoc | null>;

  // for animation
  enemyGhostOpacity: number | null;
}) {
  const gm = useContext<AbstractGameManager | null>(GameManagerContext);
  if (!gm) return <>error</>;

  const [selected, setSelected] = selectedHook;
  const [staged, setStaged] = stagedHook;

  const isEmpty = !cell.piece && !cell.ghost;
  const canReallyMove = canMove && isEmpty;

  const pieceHandler = (obj: Piece | Ghost): React.MouseEventHandler => (
    e: React.MouseEvent
  ) => {
    if (gamePaused) return;

    // if i don't own it, do nothing
    if (obj.owner !== gm.getAccount()) return;

    // clear staged when i click on currently selected
    if (selected?.id === obj.id) {
      setStaged(null);
    } else {
      // otherwise, i clicked a diff guy - select it
      setSelected(obj);
    }

    // if you clicked on a piece, don't ask the cell to do anything
    e.stopPropagation();
  };

  const cellHandler = (): void => {
    if (gamePaused) return;

    // if selected is null, do nothing
    if (selected === null) return;

    // if it's stageable, stage it
    if (canReallyMove) {
      setStaged([location, selected]);
      return;
    }

    // otherwise, check if the cell is empty
    if (isEmpty) setSelected(null);
  };

  const dummyGhost: Ghost = {
    owner: gm.getEnemyAccount(),
    id: 0,
    location: [0, 0],
  };

  return (
    <td onClick={cellHandler}>
      <StyledGameCell canMove={canReallyMove}>
        {cell.objective && <ObjectivePiece objective={cell.objective} />}
        {enemyGhostOpacity !== null && (
          <ChessPiece
            piece={dummyGhost}
            pos={PiecePos.topLeft}
            disabled={true}
            style={{ opacity: enemyGhostOpacity }}
          />
        )}
        {[cell.piece, cell.ghost].map(
          (obj, i) =>
            obj && (
              <ChessPiece
                key={i}
                piece={obj}
                onClick={pieceHandler(obj)}
                isSelected={obj.id === selected?.id}
                pos={i === 1 ? PiecePos.botRight : PiecePos.normal}
                disabled={obj.owner !== gm.getAccount() || gamePaused}
              />
            )
        )}
        {staged && compareLoc(staged[0], location) && (
          <ChessPiece piece={staged[1]} staged isSelected={false} />
        )}
      </StyledGameCell>
    </td>
  );
}

enum TurnState {
  Moving, // no move made
  Submitting, // move submitted to chain
  Waiting, // move confirmed by chain; await other player
}

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
  const selectedHook = useState<Selectable | null>(null);
  const [selected, setSelected] = selectedHook;

  // once a ghost / piece is selected, you can stage it to a location
  const [canMove, setCanMove] = useState<BoardLocation[]>([]);
  const stagedHook = useState<StagedLoc | null>(null);
  const [staged, setStaged] = stagedHook;

  // enemy ghost as [loc, opacity]
  const [enemyGhost, setEnemyGhost] = useState<[BoardLocation, number] | null>(
    null
  );

  /* attach event listeners */
  // when a move is accepted, wait for a response
  useEffect(() => {
    const doAccept = () => setTurnState(TurnState.Submitting);
    gm.addListener(GameManagerEvent.MoveAccepted, doAccept);

    return () => {
      gm.removeAllListeners(GameManagerEvent.MoveAccepted);
    };
  });

  // subscribe to game state updates
  useEffect(() => {
    const syncState = () => {
      const newState = gm.getGameState();

      // check if enemy ghost has acted
      const enemyGhostLoc = enemyGhostMoved(
        gameState,
        newState,
        gm.getAccount()
      );
      if (enemyGhostLoc) {
        setEnemyGhost([enemyGhostLoc, 1]);
      }

      setGameState(_.cloneDeep(newState));
      setSelected(null);
    };
    gm.addListener(GameManagerEvent.MoveConfirmed, syncState);

    return () => {
      gm.removeAllListeners(GameManagerEvent.MoveConfirmed);
    };
  });

  // sync things to game state
  useEffect(() => {
    if (gm.isMyTurn()) {
      setTurnState(TurnState.Moving);
    } else {
      setTurnState(TurnState.Waiting);
    }
  }, [gameState]);

  // handle animation
  useLayoutEffect(() => {
    if (enemyGhost === null) return;
    if (enemyGhost[1] <= 0) {
      setEnemyGhost(null);
      return;
    }
    setTimeout(() => {
      setEnemyGhost((ghost) => ghost && [ghost[0], ghost[1] - 0.02]);
    }, 30);
  }, [enemyGhost]);

  // sync selected to canMove
  useLayoutEffect(() => {
    setStaged(null);
    if (selected === null) {
      setCanMove([]);
      return;
    }

    setCanMove(getCanMove(selected));
    return;
  }, [selected]);

  const [ghostCanAct, setGhostCanAct] = useState<boolean>(false);
  useEffect(() => {
    if (!selected || staged || !isGhost(selected)) {
      setGhostCanAct(false);
      return;
    }

    // if the cell the ghost is on has an enemy piece
    for (const row of board) {
      for (const cell of row) {
        if (cell.piece && cell.ghost && cell.piece.owner !== cell.ghost.owner) {
          // should always be true, but a fallback just in case
          const fallback = compareLoc(selected.location, cell.ghost.location);
          setGhostCanAct(fallback);
          return;
        }
      }
    }
  }, [selected, staged, gameState]);

  const submitMove = () => {
    if (staged && selected !== null) {
      if (isGhost(selected)) gm.moveGhost(selected.id, staged[0]);
      else gm.movePiece(selected.id, staged[0]);
      setTurnState(TurnState.Submitting);
    }
  };

  const ghostAttack = () => {
    gm.ghostAttack();
    setTurnState(TurnState.Submitting);
  };

  const gamePaused =
    turnState >= TurnState.Submitting || gameState.winner !== GameWinner.None;

  return (
    <StyledGame>
      <StyledGameBoard>
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
                    selectedHook={selectedHook}
                    canMove={hasLoc(canMove, loc)}
                    stagedHook={stagedHook}
                    gamePaused={gamePaused}
                    enemyGhostOpacity={
                      enemyGhost && compareLoc(enemyGhost[0], loc)
                        ? enemyGhost[1]
                        : null
                    }
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </StyledGameBoard>
      {gameState.winner === GameWinner.None ? (
        <p>
          {turnState === TurnState.Moving && (
            <span>
              your turn! move a piece...{' '}
              {staged && <u onClick={submitMove}>click to confirm</u>}
              {ghostCanAct && <u onClick={ghostAttack}>attack</u>}
            </span>
          )}
          {turnState === TurnState.Submitting && (
            <span>submitting move...</span>
          )}
          {turnState === TurnState.Waiting && (
            <span>move confirmed. awaiting other player...</span>
          )}
        </p>
      ) : (
        <>
          <p>
            game complete! winner:{' '}
            {gameState.winner === GameWinner.Player1
              ? 'white (player 1)'
              : 'black (player 2)'}
          </p>
          <p>
            scores: <br />
            {getScores(gameState).map((entry, i) => (
              <>
                player {i + 1} ({entry.player.address}): {entry.score} <br />
              </>
            ))}
          </p>
        </>
      )}
    </StyledGame>
  );
}

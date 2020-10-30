import React, { memo, useContext, useLayoutEffect, useState } from 'react';
import styled from 'styled-components';
import AbstractGameManager from '../api/AbstractGameManager';
import { useZKChessState } from '../api/UIStateManager';
import { boardMap, boardLocMap, compareLoc, hasLoc } from '../utils/ChessUtils';
import {
  Color,
  ChessCell,
  BoardLocation,
  Ghost,
  Piece,
} from '../_types/global/GlobalTypes';
import { ObjectivePiece, ChessPiece, PiecePos } from './BoardPieces';

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

const GameCell = memo(function ({ location }: { location: BoardLocation }) {
  const { state, dispatch } = useZKChessState();
  const {
    session: { selected, canMove: canMoveArr, staged },
    computed: { gamePaused, board },
    game: { player },
  } = state;

  const canMove = hasLoc(canMoveArr, location);
  const cell = board[location[0]][location[1]];

  const isEmpty = !cell.piece && !cell.ghost;
  const canReallyMove = canMove && isEmpty;

  const pieceHandler = (obj: Piece | Ghost): React.MouseEventHandler => (
    e: React.MouseEvent
  ) => {
    if (gamePaused) return;
    if (obj.owner !== player?.account) return; // if i don't own it, do nothing

    if (selected?.id === obj.id) {
      // clear staged when i click on currently selected
      dispatch.updateSession({ staged: null });
    } else {
      dispatch.updateSession({ selected: obj }); // otherwise, i clicked a diff guy - select it
    }
    // if you clicked on a piece, don't ask the cell to do anything
    e.stopPropagation();
  };

  const cellHandler = (): void => {
    if (gamePaused) return;

    if (selected === null) return; // if selected is null, do nothing

    // if it's stageable, stage it
    if (canReallyMove) {
      dispatch.updateSession({ staged: [location, selected] });
      return;
    }

    if (isEmpty) dispatch.updateSession({ selected: null }); // otherwise, check if the cell is empty
  };

  return (
    <td onClick={cellHandler}>
      <StyledGameCell canMove={canReallyMove}>
        {cell.objective && <ObjectivePiece objective={cell.objective} />}
        {/* {enemyGhostOpacity !== null && (
          <ChessPiece
            piece={dummyGhost}
            pos={PiecePos.topLeft}
            disabled={true}
            style={{ opacity: enemyGhostOpacity }}
          />
        )} */}
        {[cell.piece, cell.ghost].map(
          (obj, i) =>
            obj && (
              <ChessPiece
                key={i}
                piece={obj}
                onClick={pieceHandler(obj)}
                isSelected={obj.id === selected?.id}
                pos={i === 1 ? PiecePos.botRight : PiecePos.normal}
                disabled={obj.owner !== player?.account || gamePaused}
              />
            )
        )}
        {staged && compareLoc(staged[0], location) && (
          <ChessPiece piece={staged[1]} staged isSelected={false} />
        )}
      </StyledGameCell>
    </td>
  );
});

export function GameBoard() {
  const { state } = useZKChessState();
  const board = state.computed.board;
  const myColor = state.game.player?.color || Color.WHITE;

  const transform = boardMap(myColor);
  const locMap = boardLocMap(myColor);

  return (
    <StyledGameBoard>
      <tbody>
        {transform(board).map((row: ChessCell[], i: number) => (
          <tr key={i}>
            {row.map((_cell: ChessCell, j: number) => {
              const loc: BoardLocation = locMap([i, j]);
              return <GameCell key={JSON.stringify(loc)} location={loc} />;
            })}
          </tr>
        ))}
      </tbody>
    </StyledGameBoard>
  );
}

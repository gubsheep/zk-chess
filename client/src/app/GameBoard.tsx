import React, {memo} from 'react';
import styled from 'styled-components';
import {useZKChessState} from '../api/UIStateManager';
import {boardMap, boardLocMap, compareLoc, hasLoc} from '../utils/ChessUtils';
import {
  ChessCell,
  BoardLocation,
  ZKPiece,
  Piece,
} from '../_types/global/GlobalTypes';
import {ObjectivePiece, ChessPiece, PiecePos, EnemyGhost} from './BoardPieces';

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

const StyledGameCell = styled.div<{canMove: boolean}>`
  width: 100%;
  height: 100%;
  margin: 0;

  background: ${(props) => (props.canMove ? '#f2f2f2' : 'none')};
`;

const GameCell = memo(function ({
  location,
  cell,
}: {
  location: BoardLocation;
  cell: ChessCell;
}) {
  const {state} = useZKChessState();
  const {
    session: {selected, staged},
    computed: {gamePaused, canMove: canMoveArr},
    game: {player},
    methods: {setSelected, setStaged},
  } = state;

  const canMove = hasLoc(canMoveArr, location);

  const isEmpty = !cell.piece && !cell.ghost;

  const pieceHandler = (obj: Piece): React.MouseEventHandler => (
    e: React.MouseEvent
  ) => {
    if (gamePaused) return;
    if (obj.owner !== player?.account) return; // if i don't own it, do nothing

    if (selected?.id === obj.id) {
      // clear staged when i click on currently selected
      setStaged(null);
    } else {
      setSelected(obj); // otherwise, i clicked a diff guy - select it
    }
    // if you clicked on a piece, don't ask the cell to do anything
    e.stopPropagation();
  };

  const cellHandler = (): void => {
    if (gamePaused) return;
    if (selected === null) return; // if selected is null, do nothing

    // if it's stageable, stage it
    if (canMove) {
      setStaged([location, selected]);
      return;
    }

    if (isEmpty) setSelected(null); // otherwise, check if the cell is empty
  };

  return (
    <td onClick={cellHandler}>
      <StyledGameCell canMove={canMove}>
        {cell.objective && <ObjectivePiece objective={cell.objective} />}
        <EnemyGhost location={location} />
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
  const {state} = useZKChessState();
  const {
    computed: {board},
    game: {player},
  } = state;

  const transform = boardMap(player);
  const locMap = boardLocMap(player);

  return (
    <StyledGameBoard>
      <tbody>
        {transform(board).map((row: ChessCell[], i: number) => (
          <tr key={i}>
            {row.map((_cell: ChessCell, j: number) => {
              const loc = locMap([i, j]);
              const cell = board[loc[0]][loc[1]];
              return (
                <GameCell
                  key={JSON.stringify(loc)}
                  location={loc}
                  cell={cell}
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    </StyledGameBoard>
  );
}

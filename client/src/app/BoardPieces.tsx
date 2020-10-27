import {
  Color,
  Objective,
  Piece,
  PieceType,
  Selectable,
} from '../_types/global/GlobalTypes';

import React, { useContext } from 'react';
import styled, { css } from 'styled-components';
import AbstractGameManager from '../api/AbstractGameManager';
import { GameManagerContext } from './LandingPage';
import { isGhost } from '../utils/ChessUtils';

const flexCenter = css`
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
`;

const ghostImgStyles = css`
  width: 80%;
  height: 80%;
  // opacity: 0.5;
`;

const normalImgStyles = css`
  width: 80%;
  height: 80%;
`;

export enum PiecePos {
  normal,
  topLeft,
  botRight,
}

const StyledPieceWrapper = styled.div<{
  pos: PiecePos;
  selected?: boolean;
  nohover?: boolean;
}>`
  position: absolute;
  ${flexCenter};

  width: ${({ pos }) => (pos === PiecePos.normal ? '100%' : '60%')};
  height: ${({ pos }) => (pos === PiecePos.normal ? '100%' : '60%')};

  ${({ pos }) =>
    pos === PiecePos.botRight ? 'bottom: 0; right: 0;' : 'top: 0; left: 0;'};

  // shitty but whatever
  ${({ selected }) =>
    selected ? 'background: #aaa !important; z-index: 1;' : 'none'};

  ${({ nohover }) =>
    !nohover &&
    `
    &:hover {
      background: #eee;
      z-index: 2;
    }
  `}
`;

const StyledBasePiece = styled.div`
  width: 100%;
  height: 100%;

  ${flexCenter};
`;

const StyledChessPiece = styled(StyledBasePiece)<{
  ghost?: boolean;
  staged?: boolean;
}>`
  img {
    ${(props) => (props.ghost ? ghostImgStyles : normalImgStyles)};
  }

  opacity: ${(props) => (props.staged ? '0.5' : '1.0')};
`;

const whitePieceUrls: Record<PieceType, string> = {
  King: './public/chess/white_king.svg',
  Knight: './public/chess/white_knight.svg',
};

const blackPieceUrls = {
  King: './public/chess/black_king.svg',
  Knight: './public/chess/black_knight.svg',
};

type HoverProps = {
  disabled?: boolean;
  onClick?: React.MouseEventHandler;
  pos?: PiecePos;
  isSelected: boolean;
};

export function ChessPiece({
  piece,
  staged,

  onClick,
  pos,
  isSelected,
  disabled,
}: {
  piece: Selectable;
  staged?: boolean;
} & HoverProps) {
  const gm = useContext<AbstractGameManager | null>(GameManagerContext);
  if (!gm) return <>error</>;

  const color = gm.getColor(piece.owner);

  let url: string = '';
  if (isGhost(piece)) {
    url =
      color === Color.BLACK
        ? './public/chess/black_ghost.svg'
        : './public/chess/white_ghost.svg';
  } else {
    const chessPiece = piece as Piece;
    url =
      color === Color.BLACK
        ? blackPieceUrls[chessPiece.pieceType]
        : whitePieceUrls[chessPiece.pieceType];
  }

  return (
    <StyledPieceWrapper
      pos={pos || PiecePos.normal}
      onClick={onClick}
      selected={isSelected}
      nohover={disabled}
    >
      <StyledChessPiece staged={staged}>
        <img src={url} />
      </StyledChessPiece>
    </StyledPieceWrapper>
  );
}

const neutralObj = css`
  background: #aaa;
  color: white;
`;
const blackObj = css`
  background: black;
  color: white;
`;
const whiteObj = css`
  background: white;
  border: 1px solid black;
  color: black;
`;

const StyledObjective = styled(StyledBasePiece)<{
  pieceColor: Color | null;
}>`
  span.obj {
    display: inline-block;
    width: 32pt;
    height: 32pt;

    ${({ pieceColor: color }) =>
      color === null
        ? neutralObj
        : color === Color.BLACK
        ? blackObj
        : whiteObj};

    border-radius: 16pt;

    display: flex;
    flex-direction: row;
    justify-content: space-around;
    align-items: center;
  }
`;

export function ObjectivePiece({ objective }: { objective: Objective }) {
  const gm = useContext<AbstractGameManager | null>(GameManagerContext);
  if (!gm) return <>error</>;

  const color = gm.getColor(objective.owner);

  return (
    <StyledPieceWrapper pos={PiecePos.normal} nohover>
      <StyledObjective pieceColor={color}>
        <span className='obj'>
          <span>{objective.value}</span>
        </span>
      </StyledObjective>
    </StyledPieceWrapper>
  );
}

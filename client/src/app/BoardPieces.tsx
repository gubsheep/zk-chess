import {
  Color,
  Objective,
  Piece,
  PieceType,
} from '../_types/global/GlobalTypes';

import React, { useContext } from 'react';
import styled, { css } from 'styled-components';
import AbstractGameManager from '../api/AbstractGameManager';
import { GameManagerContext } from './LandingPage';

const ghostImgStyles = css`
  width: 60%;
  height: 60%;
  // opacity: 0.5;
`;

const normalImgStyles = css`
  width: 80%;
  height: 80%;
`;

const StyledPiece = styled.div`
  position: absolute;
  width: 64pt;
  height: 64pt;

  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
`;

const StyledChessPiece = styled(StyledPiece)<{
  ghost?: boolean;
  staged?: boolean;
}>`
  img {
    ${(props) => (props.ghost ? ghostImgStyles : normalImgStyles)};
  }

  opacity: ${(props) => (props.staged ? '0.7' : '1.0')};
`;

const whitePieceUrls: Record<PieceType, string> = {
  King: './public/chess/white_king.svg',
  Knight: './public/chess/white_knight.svg',
};

const blackPieceUrls = {
  King: './public/chess/black_king.svg',
  Knight: './public/chess/black_knight.svg',
};

export function ChessPiece({
  piece,
  staged,
}: {
  piece: Piece;
  staged?: boolean;
}) {
  const gm = useContext<AbstractGameManager | null>(GameManagerContext);
  if (!gm) return <>error</>;

  const color = gm.getColor(piece.owner);

  const url =
    color === Color.BLACK
      ? blackPieceUrls[piece.pieceType]
      : whitePieceUrls[piece.pieceType];

  return (
    <StyledChessPiece staged={staged}>
      <img src={url} />
    </StyledChessPiece>
  );
}

export function Ghost({ color }: { color: Color }) {
  const url =
    color === Color.BLACK
      ? './public/chess/black_ghost.svg'
      : './public/chess/white_ghost.svg';
  return (
    <StyledChessPiece ghost>
      <img src={url} />
    </StyledChessPiece>
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

const StyledObjective = styled(StyledPiece)<{
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
    <StyledObjective pieceColor={color}>
      <span className='obj'>
        <span>{objective.value}</span>
      </span>
    </StyledObjective>
  );
}

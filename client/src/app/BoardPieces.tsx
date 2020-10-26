import {
  Color,
  Objective,
  Piece,
  PieceType,
} from '../_types/global/GlobalTypes';

import React from 'react';
import styled, { css } from 'styled-components';

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
  const url =
    piece.color === Color.BLACK
      ? blackPieceUrls[piece.pieceType]
      : whitePieceUrls[piece.pieceType];

  return (
    <StyledChessPiece staged={staged}>
      <img src={url} />
    </StyledChessPiece>
  );
}

export function Ghost() {
  return (
    <StyledChessPiece ghost>
      <img src={'./public/chess/white_ghost.svg'} />
    </StyledChessPiece>
  );
}

const StyledObjective = styled(StyledPiece)`
  span.obj {
    display: inline-block;
    width: 32pt;
    height: 32pt;
    background: gray;
    color: white;
    border-radius: 16pt;

    display: flex;
    flex-direction: row;
    justify-content: space-around;
    align-items: center;
  }
`;

export function ObjectivePiece({ objective }: { objective: Objective }) {
  return (
    <StyledObjective>
      <span className='obj'>
        <span>5</span>
      </span>
    </StyledObjective>
  );
}

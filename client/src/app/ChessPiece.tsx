import { PieceType } from '../_types/global/GlobalTypes';

import React from 'react';
import styled, { css } from 'styled-components';

const ghostImgStyles = css`
  width: 60%;
  height: 60%;
  opacity: 0.5;
`;

const normalImgStyles = css`
  width: 80%;
  height: 80%;
`;

const StyledChessPiece = styled.div<{ ghost?: boolean }>`
  position: absolute;
  width: 64pt;
  height: 64pt;

  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;

  img {
    ${(props) => (props.ghost ? ghostImgStyles : normalImgStyles)};
  }
`;

const pieceUrls = ['', './public/chess/white_king.svg'];

export function ChessPiece({ type }: { type: PieceType }) {
  return (
    <StyledChessPiece>
      <img src={pieceUrls[type]} />
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

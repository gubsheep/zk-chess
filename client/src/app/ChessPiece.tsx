import { Color, Piece, PieceType } from "../_types/global/GlobalTypes";

import React from "react";
import styled, { css } from "styled-components";

const ghostImgStyles = css`
  width: 60%;
  height: 60%;
  opacity: 0.5;
`;

const normalImgStyles = css`
  width: 80%;
  height: 80%;
`;

const StyledChessPiece = styled.div<{ ghost?: boolean; staged?: boolean }>`
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

  opacity: ${(props) => (props.staged ? "0.7" : "1.0")};
`;

const whitePieceUrls: Record<PieceType, string> = {
  King: "./public/chess/white_king.svg",
  Knight: "./public/chess/white_knight.svg",
};

const blackPieceUrls = {
  King: "./public/chess/black_king.svg",
  Knight: "./public/chess/black_knight.svg",
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
      <img src={"./public/chess/white_ghost.svg"} />
    </StyledChessPiece>
  );
}

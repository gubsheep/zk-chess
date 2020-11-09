import {
  BoardLocation,
  Color,
  ZKPiece,
  PieceType,
  Piece,
} from '../_types/global/GlobalTypes';

import React, {MutableRefObject, useLayoutEffect} from 'react';
import styled, {css} from 'styled-components';
import {compareLoc, isGhost} from '../utils/ChessUtils';
import {useZKChessState} from '../api/UIStateManager';
import {useState} from 'react';

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

  width: ${({pos}) => (pos === PiecePos.normal ? '100%' : '60%')};
  height: ${({pos}) => (pos === PiecePos.normal ? '100%' : '60%')};

  ${({pos}) =>
    pos === PiecePos.botRight ? 'bottom: 0; right: 0;' : 'top: 0; left: 0;'};

  ${({pos}) =>
    pos !== PiecePos.normal ? 'z-index: 2;' : PiecePos.topLeft && 'z-index: 1;'}

  // shitty but whatever
  ${({selected}) => selected && 'background: #ccc !important;'}

  ${({nohover}) =>
    !nohover &&
    `
    &:hover {
      background: rgba(120, 120, 120, 0.4);
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
  [PieceType.King]: './public/chess/white_king.svg',
  [PieceType.Knight]: './public/chess/white_knight.svg',
  [PieceType.Ghost]: './public/chess/white_ghost.svg',
};

const blackPieceUrls: Record<PieceType, string> = {
  [PieceType.King]: './public/chess/black_king.svg',
  [PieceType.Knight]: './public/chess/black_knight.svg',
  [PieceType.Ghost]: './public/chess/black_ghost.svg',
};

type HoverProps = {
  disabled?: boolean;
  onClick?: React.MouseEventHandler;
  pos?: PiecePos;
  isSelected?: boolean;
};

type ChessPieceProps = {
  piece: Piece;
  staged?: boolean;
  style?: React.CSSProperties;
} & HoverProps;

// TODO remove this
export const ChessPiece = React.forwardRef(
  (props: ChessPieceProps, ref: MutableRefObject<HTMLDivElement | null>) => {
    const {piece, staged, style, onClick, pos, isSelected, disabled} = props;

    const {state} = useZKChessState();
    const {methods} = state;

    const color = methods.getColor(piece.owner) || Color.WHITE;
    let url: string = '';
    if (isGhost(piece)) {
      console.log(piece);
      console.log(pos);
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

    // todo make this not shitty
    if (!(piece as Piece).alive) {
      return <></>;
    }

    return (
      <StyledPieceWrapper
        pos={pos || PiecePos.normal}
        onClick={onClick}
        selected={isSelected}
        nohover={disabled}
        style={style}
        ref={ref}
      >
        <StyledChessPiece staged={staged}>
          <img src={url} />
        </StyledChessPiece>
        <span style={{position: 'absolute', bottom: 0, right: 0}}>
          {piece.id}
        </span>
      </StyledPieceWrapper>
    );
  }
);

export function EnemyGhost({location}: {location: BoardLocation}) {
  const {state} = useZKChessState();
  const {
    game: {enemyPlayer, enemyGhost},
  } = state;

  const [styleObj, setStyleObj] = useState<React.CSSProperties>({
    display: 'none',
  });

  useLayoutEffect(() => {
    if (compareLoc(enemyGhost, location)) {
      setStyleObj({display: 'block'});
      setTimeout(() => {
        setStyleObj({display: 'none'});
      }, 1000);
    }
  }, [enemyGhost]);

  return (
    <ChessPiece
      piece={{owner: enemyPlayer?.account} as ZKPiece}
      pos={PiecePos.topLeft}
      disabled={true}
      style={styleObj}
    />
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

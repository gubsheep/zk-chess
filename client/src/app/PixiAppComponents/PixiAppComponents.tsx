import React from 'react';
import styled from 'styled-components';
import { Help } from './Help';
import { PieceList } from './PieceList';
import { TransactionList } from './TransactionList';

export const StyledPixiApp = styled.div`
  width: 100%;
  height: 100%;
  background: blue;

  canvas,
  img {
    image-rendering: -moz-crisp-edges;
    image-rendering: -webkit-crisp-edges;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  color: #e3e3e3;
`;

export const CanvasWrapper = styled.div`
  margin: 0 auto;
`;

const MTOP = 30;
export const GameWrapper = styled.div`
  padding-top: ${MTOP}px;
  width: 100%;
  background: #0d111c;
  position: relative;
`;

enum TVZIndex {
  Table,
  TV,
  Game,
  Toolbar,
}

const MBOTTOM = 60;
export const StyledTable = styled.div`
  // #7d3c35;
  // #4d2631;

  background: #4d2631;
  display: block;
  width: 100%;
  height: 256px;

  position: absolute;
  bottom: 0;
  z-index: ${TVZIndex.Table};
  bottom: -${MBOTTOM}px;

  overflow-x: hidden;

  & img {
    margin: 0 auto;
  }
`;

export const TV = styled.div`
  width: 100%;

  .wrapper {
    width: 100%;

    &.canvas {
      position: absolute;
      top: ${182 + MTOP}px;
      z-index: ${TVZIndex.Game};
    }

    &.img {
      position: relative;
      z-index: ${TVZIndex.TV};
      img {
        margin: 0 auto;
      }
    }
  }
`;

export const Toolbar = styled.div`
  background: #13081c;
  font-size: 1.5em;
  height: 2em;
  width: 100%;
  position: absolute;
  bottom: -${MBOTTOM + 20}px;

  z-index: ${TVZIndex.Toolbar};

  display: flex;
  flex-direction: row;
  justify-content: flex-start;

  border: 1px solid #655;
  border-left: none;
  border-right: none;
`;

export enum TabState {
  Transactions,
  Help,
  PieceList,
}

const StyledTab = styled.span<{ active: boolean }>`
  padding: 0 2em;
  line-height: 2em; // height of bar
  border-right: 1px solid rgba(255, 255, 255, 0.5);

  text-align: center;

  ${({ active }) => active && 'color: white; background: #a87 !important;'};

  transition: color 0.2s, background 0.2s;

  &:hover {
    cursor: pointer;
    color: white;
    background: #855;
  }
`;

export type TabHook = [TabState, (s: TabState) => void];
export function Tab({ hook, id }: { hook: TabHook; id: TabState }) {
  const [tabState, setTabState] = hook;
  const text = ['TRANSACTIONS', 'HELP', 'PIECE LIST'][id];

  return (
    <StyledTab active={tabState === id} onClick={() => setTabState(id)}>
      {text}
    </StyledTab>
  );
}

const StyledTextBody = styled.div`
  background: #2a2a2a;
  padding: 3em;
  padding-top: ${MBOTTOM + MTOP + 20}px;

  min-height: 30em;
`;

export function TextBody({ hook }: { hook: TabHook }) {
  const [tabState] = hook;

  return (
    <StyledTextBody>
      {tabState === TabState.Transactions && <TransactionList />}
      {tabState === TabState.Help && <Help />}
      {tabState === TabState.PieceList && <PieceList />}
    </StyledTextBody>
  );
}
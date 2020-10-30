import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { GameBoard } from './GameBoard';
import { GameControls } from './GameControls';

export enum TurnState {
  Moving, // no move made
  Submitting, // move submitted to chain
  Waiting, // move confirmed by chain; await other player
}

const StyledGame = styled.div`
  margin: 4em auto;
  width: fit-content;
`;

export function Game() {
  return (
    <StyledGame>
      <GameBoard />
      <GameControls />
    </StyledGame>
  );
}

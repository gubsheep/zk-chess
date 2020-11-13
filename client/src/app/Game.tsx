import React from 'react';
import AbstractGameManager from '../api/AbstractGameManager';
import styled from 'styled-components';
import PixiApp from './PixiApp';

const StyledGame = styled.div`
  width: 100%;
  height: 100%;
`;

export default function Game({
  gameManager,
}: {
  gameManager: AbstractGameManager;
}) {
  return (
    <StyledGame>
      <PixiApp gameManager={gameManager} />
    </StyledGame>
  );
}

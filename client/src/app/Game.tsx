import React from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import PixiApp from './PixiApp';

const StyledGame = styled.div`
  width: 100%;
  height: 100%;
`;

export default function Game() {
  const { tableId } = useParams<{ tableId: string }>();

  return (
    <StyledGame>
      <PixiApp tableId={tableId}/>
    </StyledGame>
  );
}

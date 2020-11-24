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

  console.log(
    'Colors and styles shamelessly copied from https://www.lexaloffle.com/pico-8.php. Thanks, Lexaloffle!'
  );

  return (
    <StyledGame> 
      <PixiApp tableId={tableId} />
    </StyledGame>
  );
}

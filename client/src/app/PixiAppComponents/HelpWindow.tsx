import React from 'react';
import { Help } from './Help';
import styled from 'styled-components';

const StyledHelpWindow = styled.div`
  margin: 4em auto;
  width: 80%;
  max-width: 80em;
`;

export function HelpWindow() {
  return (
    <StyledHelpWindow>
      <Help></Help>
    </StyledHelpWindow>
  );
}

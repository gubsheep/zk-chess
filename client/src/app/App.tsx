import React from 'react';

import {BrowserRouter as Router, Switch, Route} from 'react-router-dom';
import styled from 'styled-components';
import {LandingPage} from './LandingPage';
import PixiApp from './PixiApp';

function App() {
  return (
    <Router>
      <Switch>
        <Route path='/' component={LandingPage} />
      </Switch>
    </Router>
  );
}

const AppContainer = styled.div`
  height: 100%;
  width: 100%;
`;

export default function _App() {
  return (
    <AppContainer>
      {/* <App /> */}
      <PixiApp />
    </AppContainer>
  );
}

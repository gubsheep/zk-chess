import React from 'react';

import {BrowserRouter as Router, Switch, Route} from 'react-router-dom';
import {LandingPage} from './LandingPage';

export default function App() {
  return (
    <Router basename='/battleship'>
      <Switch>
        <Route path='/:tableId' component={LandingPage} />
        <Route path='/' component={LandingPage} />
      </Switch>
    </Router>
  );
}

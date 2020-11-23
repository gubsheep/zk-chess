import React from 'react';

import {BrowserRouter as Router, Switch, Route} from 'react-router-dom';
import Game from './Game';

export default function App() {
  return (
    <Router basename='/battleship'>
      <Switch>
        <Route path='/:tableId' component={Game} />
        <Route path='/' component={Game} />
      </Switch>
    </Router>
  );
}

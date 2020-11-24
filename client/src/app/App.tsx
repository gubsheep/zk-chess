import React from 'react';

import {BrowserRouter as Router, Switch, Route} from 'react-router-dom';
import Game from './Game';
import Homepage from './Homepage';

export default function App() {
  return (
    <Router basename='/bote'>
      <Switch>
        <Route path='/:tableId' component={Game} />
        <Route path='/' component={Homepage} />
      </Switch>
    </Router>
  );
}

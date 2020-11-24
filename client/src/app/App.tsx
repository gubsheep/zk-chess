import React from 'react';

import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import Game from './Game';
import Homepage from './Homepage';
import { HelpWindow } from './PixiAppComponents/HelpWindow';

export default function App() {
  return (
    <Router basename='/bote'>
      <Switch>
        <Route path='/help' component={HelpWindow} />
        <Route path='/:tableId' component={Game} />
        <Route path='/' component={Homepage} />
      </Switch>
    </Router>
  );
}

import React from 'react';

import {BrowserRouter as Router, Switch, Route} from 'react-router-dom';
import {LandingPage} from './LandingPage';

export default function App() {
  return (
    <Router>
      <Switch>
        <Route path='/' exact component={LandingPage} />
        <Route path='/:tableId' />
      </Switch>
    </Router>
  );
}

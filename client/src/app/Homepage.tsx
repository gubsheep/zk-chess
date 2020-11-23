import _ from 'lodash';
import React from 'react';

export default function HomePage() {
  return (
    <div>
      Please select a table:
      <ul>
        {_.range(0, 12).map((i) => (
          <li key={i}>
            <a href={'./game' + i}>Game {i}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

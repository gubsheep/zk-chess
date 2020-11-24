import React from 'react';
import styled from 'styled-components';

const StyledHelp = styled.div`
  font-size: 16pt;
  h1 {
    font-size: 2em;
    font-weight: 700;
  }

  h1,
  p,
  ul {
    margin: 0.5em 0;
  }

  li {
    margin-left: 1em;
    list-style: outside;
  }
`;

export function Help() {
  return (
    <StyledHelp>
      <h1>Welcome to BOTE FITE</h1>
      BOTE FITE is a two-player, turn-based strategy game built on xDAI with
      zkSNARKs.
      <h1>OBJECTIVE</h1>
      <p>
        Your goal in BOTE FITE is to destroy your opponent's BOTE, located at
        the end of the map. You can accomplish this by attacking your opponent's
        BOTE with ships.
      </p>
      <h1>SHIPS</h1>
      <p>
        Ships are the primary offensive unit in the game. They can move around
        the board and attack other ships. There are five different kinds of
        ships:
      </p>
      <ul>
        <li>
          The CRUISER is cheap, but has a low attack range and doesn't do much
          damage.
        </li>
        <li>
          The FRIGATE is a ranged ship, and can attack other ships from two
          units away.
        </li>
        <li>The CORVETTE is an extremely fast ship with low attack range.</li>
        <li>
          The SUBMARINE is a hidden unit that moves underwater and is only
          visible to its owner. If positioned under an enemy ship, it can
          strike, destroying itself and inflicting massive damage to the target
          ship.
        </li>
        <li>
          The WARSHIP is a slow and fragile ship with a powerful and high-range
          attack.
        </li>
      </ul>
      <p>
        Ships are purchased for GOLD, which you receive at the beginning of each
        turn. Newly-purchased ships must be placed on a tile adjacent to your
        BOTE. A ship can move and attack once per turn, beginning the turn after
        it is first purchased. With the exception of the submarine, ships cannot
        move through or on top of other ships.
      </p>
      <h1>CARDS</h1>
      <p>
        Cards are tools that allow you to buff your own ships or damage enemy
        ships for a fixed cost of two GOLD. You're permitted to draw one card
        per turn, and you can hold up to three cards in your hand. You can play
        as many cards as you like per turn. Your cards are private - your
        opponent will never know what is in your hand.
      </p>
      <h1>TURNS</h1>
      <p>
        Players alternate taking turns. At the beginning of your turn, you
        receive income (GOLD), which can be used to purchase ships and to play
        cards. Your income increases over the course of the game. Income does
        not roll over between turns; any unused income on a previous turn is
        discarded. Controlling an OIL RIG by positioning one of your ships on
        top of it also earns you extra income per turn. You can purchase ships,
        move ships, attack, draw a card, and play cards in any order you'd like.
        Once you are finished with your turn, click "END TURN."
      </p>
    </StyledHelp>
  );
}

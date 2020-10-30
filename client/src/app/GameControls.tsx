import React from 'react';
import { useZKChessState } from '../api/UIStateManager';
import { getScores } from '../utils/ChessUtils';
import { GameStatus } from '../_types/global/GlobalTypes';
import { TurnState } from './Game';

export function GameControls() {
  const { state } = useZKChessState();

  const {
    computed: { ghostCanAct },
    session: { staged, turnState },
    game: { gameState },
    methods: { submitMove, ghostAttack },
  } = state;

  return (
    <div>
      {gameState?.gameStatus !== GameStatus.COMPLETE ? (
        <p>
          {turnState === TurnState.Moving && (
            <span>
              your turn! move a piece...{' '}
              {staged && <u onClick={submitMove}>click to confirm</u>}
              {ghostCanAct && <u onClick={ghostAttack}>attack</u>}
            </span>
          )}
          {turnState === TurnState.Submitting && (
            <span>submitting move...</span>
          )}
          {turnState === TurnState.Waiting && (
            <span>move confirmed. awaiting other player...</span>
          )}
        </p>
      ) : (
        <>
          <p>game complete! winner: {'TODO: CALCULATE SCORES'}</p>
          <p>
            scores: <br />
            {getScores(gameState).map((entry, i) => (
              <>
                player {i + 1} ({entry.player.address}): {entry.score} <br />
              </>
            ))}
          </p>
        </>
      )}
    </div>
  );
}

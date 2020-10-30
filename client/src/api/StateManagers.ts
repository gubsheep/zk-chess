import { useCallback, useEffect } from 'react';
import { TurnState } from '../app/Game';
import { boardFromGame, getCanMove } from '../utils/ChessUtils';
import {
  Color,
  EthAddress,
  GameState,
  Ghost,
  Piece,
} from '../_types/global/GlobalTypes';
import AbstractGameManager, { GameManagerEvent } from './AbstractGameManager';
import { ActionType, useZKChessState } from './UIStateManager';

export type StateManagerHook = (
  gameManager: AbstractGameManager | null
) => void;

export const useInitGame: StateManagerHook = (
  gm: AbstractGameManager | null
) => {
  const { state, dispatch } = useZKChessState();
};

export const useSyncGame: StateManagerHook = (
  gm: AbstractGameManager | null
) => {
  const { setters } = useZKChessState();

  // sync the shared state to game state
  useEffect(() => {
    if (!gm) return;
    // subscribe to game state updates
    const syncState = () => {
      const newState = gm.getGameState();

      /*
      // check if enemy ghost has acted
      const enemyGhostLoc = enemyGhostMoved(
        gameState,
        newState,
        gm.getAccount()
      );
      if (enemyGhostLoc) {
        setEnemyGhost([enemyGhostLoc, 1]);
      }
      */
      setters.updateGame(newState);
      setters.updateSelected(null);
    };
    gm.addListener(GameManagerEvent.GameStart, syncState);
    gm.addListener(GameManagerEvent.MoveMade, syncState);
    gm.addListener(GameManagerEvent.GameFinished, syncState);

    syncState();

    return () => {
      gm.removeAllListeners(GameManagerEvent.GameStart);
      gm.removeAllListeners(GameManagerEvent.MoveMade);
      gm.removeAllListeners(GameManagerEvent.GameFinished);
    };
  }, [gm]);
};

export const useComputedState: StateManagerHook = (
  gm: AbstractGameManager | null
) => {
  const { state, setters, dispatch } = useZKChessState();

  useEffect(() => {
    if (!state.game) return;

    let colors = [Color.WHITE, Color.BLACK];
    if (state.game.myAddress === state.game.player2.address) {
      colors = [Color.BLACK, Color.WHITE];
    }

    dispatch({
      type: ActionType.UpdateComputed,
      computed: {
        player: {
          account: state.game.myAddress,
          color: colors[0],
        },
      },
    });

    const enemyAcc =
      state.game.myAddress === state.game.player1.address
        ? state.game.player2.address
        : state.game.player1.address;

    dispatch({
      type: ActionType.UpdateComputed,
      computed: {
        enemyPlayer: {
          account: enemyAcc,
          color: colors[1],
        },
      },
    });
  }, [state.game?.player1, state.game?.player2, state.game?.myAddress]);

  // update board whenever gameState is updated
  useEffect(() => {
    dispatch({
      type: ActionType.UpdateComputed,
      computed: {
        board: boardFromGame(state.game),
      },
    });
  }, [state.game]);

  useEffect(() => {
    const gamePaused =
      state.session.turnState >= TurnState.Submitting ||
      state.game?.gameState === GameState.COMPLETE;
    dispatch({
      type: ActionType.UpdateComputed,
      computed: {
        gamePaused,
      },
    });
  }, [state.session.turnState, state.game?.gameState]);

  // sync canmove to selected
  useEffect(() => {
    // TODO take this guy out; make basic dispatches first-order things
    dispatch({
      type: ActionType.UpdateCanMove,
      canMove: getCanMove(state.session.selected),
    });
  }, [state.session.selected]);

  /* attach event listeners */
  // TODO add pendingMoves to gameState
  // when a move is accepted, wait for a response
  useEffect(() => {
    /*
    const doAccept = () => setTurnState(TurnState.Submitting);
    gm.addListener(GameManagerEvent.MoveAccepted, doAccept);

    return () => {
      gm.removeAllListeners(GameManagerEvent.MoveAccepted);
    };
    */
  });

  // sync things to game state
  // calculate turn state
  /*
  useEffect(() => {
    if (gm.isMyTurn()) {
      setters.updateTurnState(TurnState.Moving);
    } else {
      setters.updateTurnState(TurnState.Waiting);
    }
  }, [gameState]);
  */

  const getColor = useCallback(
    (addr: EthAddress | null): Color | null => {
      if (state.computed.player.account === addr) return Color.WHITE;
      if (state.computed.enemyPlayer.account === addr) return Color.BLACK;
      return null;
    },
    [gm, state.computed.player.account, state.computed.enemyPlayer.account]
  );
  useEffect(() => {
    dispatch({
      type: ActionType.UpdateComputed,
      computed: {
        getColor,
      },
    });
  }, [getColor, gm]);
};

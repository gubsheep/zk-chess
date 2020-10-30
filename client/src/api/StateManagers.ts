import { useCallback, useEffect } from 'react';
import { TurnState } from '../app/Game';
import { boardFromGame, getCanMove } from '../utils/ChessUtils';
import {
  BoardLocation,
  ChessCell,
  Color,
  EthAddress,
  GameStatus,
  Ghost,
  PlayerInfo,
} from '../_types/global/GlobalTypes';
import { GameManagerEvent } from './AbstractGameManager';
import { useZKChessState } from './UIStateManager';

export const useInitGame = (): void => {
  const { state, dispatch } = useZKChessState();
};

export const useSyncGame = (): void => {
  const { gameManager: gm, dispatch } = useZKChessState();

  // sync the shared state to game state
  useEffect(() => {
    if (!gm) return;
    // subscribe to game state updates
    const syncState = () => {
      const gameState = gm.getGameState();

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
      dispatch.updateGame({ gameState });
      dispatch.updateSession({ selected: null });
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

export const useComputed = (): void => {
  const { state, dispatch, gameManager: gm } = useZKChessState();

  useEffect(() => {
    if (!state.game.gameState) return;
    const { myAddress, player1, player2 } = state.game.gameState;
    if (!myAddress) return;

    let colors = [Color.WHITE, Color.BLACK];
    if (myAddress === player2.address) {
      colors = [Color.BLACK, Color.WHITE];
    }

    const player: PlayerInfo = {
      account: myAddress,
      color: colors[0],
    };
    dispatch.updateGame({ player });

    const enemyAcc =
      myAddress === player1.address ? player2.address : player1.address;

    const enemyPlayer: PlayerInfo = {
      account: enemyAcc,
      color: colors[1],
    };
    dispatch.updateGame({ enemyPlayer });
  }, [state.game.gameState?.player1, state.game.gameState?.player2]);

  // update board whenever gameState is updated
  useEffect(() => {
    dispatch.updateComputed({
      board: boardFromGame(state.game.gameState),
    });
  }, [state.game.gameState]);

  useEffect(() => {
    const gamePaused =
      state.session.turnState >= TurnState.Submitting ||
      state.game?.gameState?.gameStatus === GameStatus.COMPLETE;

    dispatch.updateComputed({ gamePaused });
  }, [state.session.turnState, state.game?.gameState]);

  // sync canmove to selected
  useEffect(() => {
    if (!state.game.gameState) return;

    console.log(state.game.gameState, state.session.selected);

    const canMove = getCanMove(state.session.selected);
    const board = boardFromGame(state.game.gameState);
    for (let i = 0; i < canMove.length; i++) {
      const loc = canMove[i];

      // check for out of bounds
      const cell: ChessCell | undefined = board[loc[0]][loc[1]];
      if (cell && cell.piece) {
        canMove.splice(i--, 1);
      }
    }

    dispatch.updateSession({ canMove });
  }, [state.session.selected, state.game.gameState]);

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
};

export const useInitMethods = () => {
  const { state, gameManager: gm, dispatch } = useZKChessState();

  const getColor = useCallback(
    (addr: EthAddress | null): Color | null => {
      if (state.game.player?.account === addr) return Color.WHITE;
      if (state.game.enemyPlayer?.account === addr) return Color.BLACK;
      return null;
    },
    [gm]
  );

  useEffect(() => {
    dispatch.updateMethods({ getColor });
  }, [getColor, gm]);
};

import _ from 'lodash';
import { useLayoutEffect, useState } from 'react';
import { useCallback, useEffect } from 'react';
import { TurnState } from '../app/Game';
import {
  boardFromGame,
  compareLoc,
  enemyGhostMoved,
  getCanMove,
  isGhost,
} from '../utils/ChessUtils';
import {
  ChessCell,
  ChessGame,
  Color,
  EthAddress,
  GameStatus,
  PlayerInfo,
  Selectable,
  StagedLoc,
} from '../_types/global/GlobalTypes';
import { GameManagerEvent } from './AbstractGameManager';
import { useZKChessState } from './UIStateManager';

export const useInitGame = (): void => {
  const { state, dispatch } = useZKChessState();

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

    console.log('set colors:', colors);
  }, [state.game.gameState?.player1, state.game.gameState?.player2]);
};

export const useSyncGame = (): void => {
  const { gameManager: gm, dispatch } = useZKChessState();

  // sync the shared state to game state
  useEffect(() => {
    if (!gm) return;
    // subscribe to game state updates
    const syncState = () => {
      const gameState = gm.getGameState();

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
  const { state, dispatch } = useZKChessState();
  const {
    session: { selected, turnState, staged },
    game: { gameState, player },
    computed: { board, isMyTurn },
  } = state;

  // update board whenever gameState is updated
  useEffect(() => {
    dispatch.updateComputed({ board: boardFromGame(gameState) });
  }, [gameState]);

  // update gamepaused
  useLayoutEffect(() => {
    const gamePaused =
      turnState >= TurnState.Submitting ||
      gameState?.gameStatus === GameStatus.COMPLETE;

    dispatch.updateComputed({ gamePaused });
  }, [state.session.turnState, gameState]);

  // sync canmove to selected
  useLayoutEffect(() => {
    if (!state.game.gameState) return;

    const canMove = getCanMove(selected);

    if (selected && !isGhost(selected)) {
      const board = boardFromGame(gameState);
      for (let i = 0; i < canMove.length; i++) {
        const loc = canMove[i];

        // check for out of bounds
        const cell: ChessCell | undefined = board[loc[0]][loc[1]];
        if (cell && cell.piece) {
          canMove.splice(i--, 1);
        }
      }
    }

    dispatch.updateComputed({ canMove });
  }, [selected, gameState]);

  useEffect(() => {
    if (!selected || staged || !isGhost(selected)) {
      dispatch.updateComputed({ ghostCanAct: false });
      return;
    }

    // if the cell the ghost is on has an enemy piece
    for (const row of board) {
      for (const cell of row) {
        if (cell.piece && cell.ghost && cell.piece.owner !== cell.ghost.owner) {
          // should always be true, but a fallback just in case
          const fallback = compareLoc(selected.location, cell.ghost.location);
          dispatch.updateComputed({ ghostCanAct: fallback });
          return;
        }
      }
    }
  }, [selected, staged]);

  // see if it's my turn
  useEffect(() => {
    if (!gameState) return;
    const { gameStatus, player1, player2, myAddress } = gameState;

    if (
      gameStatus === GameStatus.COMPLETE ||
      gameStatus === GameStatus.WAITING_FOR_PLAYERS
    ) {
      dispatch.updateComputed({ isMyTurn: false });
      return;
    }

    let whoseTurn = player1;
    if (gameStatus === GameStatus.P2_TO_MOVE) {
      whoseTurn = player2;
    }
    const isMyTurn = myAddress === whoseTurn.address;

    dispatch.updateComputed({ isMyTurn });
  }, [gameState]);

  // sync things to game state
  useEffect(() => {
    if (isMyTurn) {
      dispatch.updateSession({ turnState: TurnState.Moving });
    } else {
      dispatch.updateSession({ turnState: TurnState.Waiting });
    }
  }, [isMyTurn]);

  // check if enemy ghost moved
  const [oldGameState, setOldGameState] = useState<ChessGame | null>(
    _.cloneDeep(gameState)
  );

  useLayoutEffect(() => {
    const enemyGhost = enemyGhostMoved(
      oldGameState,
      gameState,
      player ? player.account : null
    );
    if (enemyGhost) {
      dispatch.updateGame({ enemyGhost });
    }

    setOldGameState(_.cloneDeep(gameState));
  }, [gameState]);
};

export const useInitMethods = () => {
  const { state, gameManager: gm, dispatch } = useZKChessState();
  const {
    game: { player, enemyPlayer },
    session: { selected, staged },
  } = state;

  const getColor = useCallback(
    (addr: EthAddress | null): Color | null => {
      if (player?.account === addr) return Color.WHITE;
      if (enemyPlayer?.account === addr) return Color.BLACK;
      return null;
    },
    [gm, player, enemyPlayer]
  );

  const setStaged = useCallback(
    (staged: StagedLoc | null) => {
      dispatch.updateSession({ staged });
    },
    [dispatch]
  );

  const setSelected = useCallback(
    (selected: Selectable | null) => {
      dispatch.updateSession({ selected });
    },
    [dispatch]
  );

  const submitMove = useCallback(() => {
    if (!gm) return;
    console.log(staged, selected);
    if (staged && selected !== null) {
      if (isGhost(selected)) gm.moveGhost(selected.id, staged[0]);
      else gm.movePiece(selected.id, staged[0]);
      dispatch.updateSession({ turnState: TurnState.Submitting });
    }
  }, [gm, staged, selected]);

  const ghostAttack = useCallback(() => {
    if (!gm) return;
    gm.ghostAttack();
    dispatch.updateSession({ turnState: TurnState.Submitting });
  }, [gm, dispatch]);

  useLayoutEffect(() => {
    dispatch.updateMethods({
      getColor,
      setSelected,
      setStaged,
      submitMove,
      ghostAttack,
    });
  }, [gm, getColor, setSelected, setStaged, submitMove, ghostAttack]);
};

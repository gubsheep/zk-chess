import React, { useEffect, useReducer } from 'react';
import { useContext } from 'react';
import { createContainer } from 'react-tracked';
import { GameManagerContext } from '../app/LandingPage';
import {
  BoardLocation,
  ChessGame,
  Color,
  EthAddress,
  GameState,
  Selectable,
} from '../_types/global/GlobalTypes';
import AbstractGameManager, { GameManagerEvent } from './AbstractGameManager';

/* 
so the model is that there's a single shared state store, and that guy is
managing essentially 3 different sources of state - session UI state, 
stored UI state, and the current game state.

game state: synced with gamemanager, nullable (in case of errors)
ui state (combined): shared across all objects

*/

/* define ui / game state */

type SessionState = {
  selected: Selectable | null;
};

type PlayerInfo = {
  account: EthAddress | null;
  color: Color;
};

// type StoredState = {};
type ZKChessState = {
  // mutable states
  session: SessionState;
  game: ChessGame | null;

  // calculated info
  player: PlayerInfo | null;
};

const initialState: ZKChessState = {
  session: {
    selected: null,
  },
  game: null,
  player: null,
};

/* define reducers */

enum ActionType {
  UpdateGameState = 'UpdateGameState',
  UpdateSelected = 'UpdateSelected',
}

type Action =
  | { type: ActionType.UpdateGameState; game: ChessGame }
  | { type: ActionType.UpdateSelected; object: Selectable | null };

const reducer = (state: ZKChessState, action: Action): ZKChessState => {
  switch (action.type) {
    case ActionType.UpdateGameState:
      return {
        ...state,
        game: action.game,
      };
    case ActionType.UpdateSelected:
      return {
        ...state,
        session: {
          ...state.session,
          selected: action.object,
        },
      };
    default:
      return state;
  }
};

const useValue = () => useReducer(reducer, initialState);

const container = createContainer(useValue);

const { Provider, useTrackedState, useUpdate: useDispatch } = container;

/* define hooks */

type ZKChessUpdate = {
  updateGame: (state: ChessGame) => void;
  updateSelected: (loc: Selectable | null) => void;
};
type ZKChessDispatch = React.Dispatch<Action>;
// todo turn this into a struct
type ZKChessHook = [ZKChessState, ZKChessUpdate, ZKChessDispatch];

const useZKChessState = (): ZKChessHook => {
  const state = useTrackedState();
  const dispatch = useDispatch();

  const updateGame = (newState: ChessGame) =>
    dispatch({ type: ActionType.UpdateGameState, game: newState });

  const updateSelected = (loc: Selectable | null) =>
    dispatch({ type: ActionType.UpdateSelected, object: loc });

  return [
    state,
    {
      updateGame,
      updateSelected,
    },
    dispatch,
  ];
};

function ZKChessStateSyncer({
  children,
  gameManager: gm,
}: {
  children: React.ReactNode;
  gameManager: AbstractGameManager | null;
}) {
  const [, dispatch] = useZKChessState();

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
      dispatch.updateGame(newState);
      dispatch.updateSelected(null);
    };
    gm.addListener(GameManagerEvent.GameStart, syncState);
    gm.addListener(GameManagerEvent.MoveMade, syncState);
    gm.addListener(GameManagerEvent.GameFinished, syncState);

    return () => {
      gm.removeAllListeners(GameManagerEvent.GameStart);
      gm.removeAllListeners(GameManagerEvent.MoveMade);
      gm.removeAllListeners(GameManagerEvent.GameFinished);
    };
  }, [gm]);

  return (
    <GameManagerContext.Provider value={gm}>
      {children}
    </GameManagerContext.Provider>
  );
}
function ZKChessStateProvider({
  children,
  gameManager,
}: {
  children: React.ReactNode;
  gameManager: AbstractGameManager | null;
}) {
  return (
    <Provider>
      <ZKChessStateSyncer gameManager={gameManager}>
        {children}
      </ZKChessStateSyncer>
    </Provider>
  );
}

export { useZKChessState, ZKChessStateProvider };

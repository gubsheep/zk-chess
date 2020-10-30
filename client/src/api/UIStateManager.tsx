import React, { useReducer } from 'react';
import { createContainer } from 'react-tracked';
import { TurnState } from '../app/Game';
import {
  BoardLocation,
  ChessBoard,
  ChessGame,
  Color,
  EthAddress,
  Selectable,
  StagedLoc,
  Piece,
  Ghost,
} from '../_types/global/GlobalTypes';
import AbstractGameManager from './AbstractGameManager';
import { useSyncGame, useComputedState, useInitGame } from './StateManagers';

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
  canMove: BoardLocation[];
  staged: StagedLoc | null;

  turnState: TurnState;
};

type ComputedState = {
  board: ChessBoard;
  gamePaused: boolean;
  // TODO move this guy out of computed
  enemyPlayer: PlayerInfo;
  player: PlayerInfo;

  getColor: (obj: EthAddress | null) => Color | null;
};

type PlayerInfo = {
  account: EthAddress | null;
  color: Color | null;
};

// TODO maybe we need the notion of set vs computed state?
// TODO refactor this and give each guy some assertions
// type StoredState = {};

type ZKChessState = {
  session: SessionState;
  computed: ComputedState;
  game: ChessGame | null;
};

const initialState: ZKChessState = {
  session: {
    selected: null,
    canMove: [],
    staged: null,
    turnState: TurnState.Moving,
  },
  computed: {
    board: [], // todo make this not fail silently (make nullable)
    gamePaused: false,
    player: {
      account: null,
      color: null,
    },
    enemyPlayer: {
      account: null,
      color: null,
    },
    getColor: (_) => Color.WHITE,
  },
  game: null,
};

/* define reducers */

// TODO can we make this shorter somehow? what if we useState instead of useReducer?
export enum ActionType {
  UpdateGameState = 'UpdateGameState',
  UpdateSelected = 'UpdateSelected',
  UpdateCanMove = 'UpdateCanMove',
  UpdateStaged = 'UpdateStaged',
  UpdateTurnState = 'UpdateTurnState',

  UpdateComputed = 'UpdateComputed',
  UpdatePlayer = 'UpdatePlayer',
}

type Action =
  | { type: ActionType.UpdateGameState; game: ChessGame }
  | { type: ActionType.UpdateSelected; object: Selectable | null }
  | { type: ActionType.UpdateCanMove; canMove: BoardLocation[] }
  | { type: ActionType.UpdateStaged; staged: StagedLoc | null }
  | { type: ActionType.UpdateTurnState; turnState: TurnState }
  | { type: ActionType.UpdateComputed; computed: Partial<ComputedState> };

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
    case ActionType.UpdateCanMove:
      return {
        ...state,
        session: {
          ...state.session,
          canMove: action.canMove,
        },
      };
    case ActionType.UpdateStaged:
      return {
        ...state,
        session: {
          ...state.session,
          staged: action.staged,
        },
      };
    case ActionType.UpdateTurnState:
      return {
        ...state,
        session: {
          ...state.session,
          turnState: action.turnState,
        },
      };
    case ActionType.UpdateComputed:
      return {
        ...state,
        computed: {
          ...state.computed,
          ...action.computed,
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

type ZKChessSetters = {
  updateGame: (state: ChessGame) => void;
  updateSelected: (loc: Selectable | null) => void;
  updateStaged: (staged: StagedLoc | null) => void;
  updateTurnState: (turnState: TurnState) => void;
};

// type ZKChessGetters = {};

type ZKChessDispatch = React.Dispatch<Action>;

// todo turn this into a struct
type ZKChessHook = {
  state: ZKChessState;
  setters: ZKChessSetters;
  // getters: ZKChessGetters;

  // fallback
  dispatch: ZKChessDispatch;
};

const useZKChessState = (): ZKChessHook => {
  const state = useTrackedState();
  const dispatch = useDispatch();

  const updateGame = (newState: ChessGame) =>
    dispatch({ type: ActionType.UpdateGameState, game: newState });

  const updateSelected = (obj: Selectable | null) => {
    dispatch({ type: ActionType.UpdateSelected, object: obj });
  };

  const updateStaged = (staged: StagedLoc | null) => {
    dispatch({ type: ActionType.UpdateStaged, staged });
  };

  const updateTurnState = (turnState: TurnState) => {
    dispatch({ type: ActionType.UpdateTurnState, turnState });
  };

  return {
    state,
    setters: {
      updateGame,
      updateSelected,
      updateStaged,
      updateTurnState,
    },
    // getters: {},
    dispatch,
  };
};

function GameStateManager({
  children,
  gameManager,
}: {
  children: React.ReactNode;
  gameManager: AbstractGameManager | null;
}) {
  useInitGame(gameManager);
  useSyncGame(gameManager); // sync with contract stuff

  useComputedState(gameManager); // listen for ui changes
  return (
    // <GameManagerContext.Provider value={gameManager}>
    <>{children}</>
    // </GameManagerContext.Provider>
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
      <GameStateManager gameManager={gameManager}>{children}</GameStateManager>
    </Provider>
  );
}

export { useZKChessState, ZKChessStateProvider };

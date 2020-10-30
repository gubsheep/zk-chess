import React, { useContext, useReducer } from 'react';
import { createContainer } from 'react-tracked';
import { QueueMethods } from 'react-use/lib/useQueue';
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
  Player,
  PlayerInfo,
} from '../_types/global/GlobalTypes';
import AbstractGameManager from './AbstractGameManager';
import { useSyncGame, useComputed, useInitGame, useInitMethods } from './StateManagers';

/* exports ZKChessStateProvider and useZKChessState - single entrypoint into the API */

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
};


type StateMethods = {
  getColor: (obj: EthAddress | null) => Color | null;
};

type ChessGameState = {
  gameState: ChessGame | null;
  player: PlayerInfo | null;
  enemyPlayer: PlayerInfo | null;
};

// TODO maybe we need the notion of set vs computed state?
// TODO refactor this and give each guy some assertions
// type StoredState = {};

type ZKChessState = {
  game: ChessGameState;
  session: SessionState;
  // stored: StoredState;
  computed: ComputedState;
  methods: StateMethods;
};

const initialState: ZKChessState = {
  game: {
    gameState: null,
    player: null,
    enemyPlayer: null,
  },
  session: {
    selected: null,
    canMove: [],
    staged: null,
    turnState: TurnState.Moving,
  },
  computed: {
    board: [], // todo make this not fail silently (make nullable)
    gamePaused: false,
  },
  methods: {
    getColor: (_) => Color.WHITE,
  },
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
  UpdateGame = 'UpdateGame',
  UpdateSession = 'UpdateSession',
  UpdateMethods = 'UpdateMethods',
}

type Action =
  | { type: ActionType.UpdateGameState; game: ChessGame }
  | { type: ActionType.UpdateSelected; object: Selectable | null }
  | { type: ActionType.UpdateCanMove; canMove: BoardLocation[] }
  | { type: ActionType.UpdateStaged; staged: StagedLoc | null }
  | { type: ActionType.UpdateTurnState; turnState: TurnState }

  | { type: ActionType.UpdateComputed; computed: Partial<ComputedState> }
  | { type: ActionType.UpdateGame; game: Partial<ChessGameState> }
  | { type: ActionType.UpdateSession; session: Partial<SessionState> }
  | { type: ActionType.UpdateMethods; methods: Partial<StateMethods> };


// TODO refactor this guy to 'react-use'/ useMethods
const reducer = (state: ZKChessState, action: Action): ZKChessState => {
  switch (action.type) {
    case ActionType.UpdateGameState:
      return {
        ...state,
        game: {
          ...state.game,
          gameState: action.game,
        },
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
    case ActionType.UpdateGame:
      return {
        ...state,
        game: {
          ...state.game,
          ...action.game,
        },
      };
    case ActionType.UpdateSession:
      return {
        ...state,
        session: {
          ...state.session,
          ...action.session,
        },
      };
    case ActionType.UpdateMethods:
      return {
        ...state,
        methods: {
          ...state.methods,
          ...action.methods,
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

type ZKChessHook = {
  state: ZKChessState;
  setters: ZKChessSetters;
  // getters: ZKChessGetters;
  gameManager: AbstractGameManager | null;
  dispatch: ZKChessDispatch;
};

// should only call this inside of ZKChessStateProvider
const useZKChessState = (): ZKChessHook => {
  const state = useTrackedState();
  const dispatch = useDispatch();
  const gameManager = useGameManager();

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
    gameManager,
  };
};

const GameManagerContext = React.createContext<AbstractGameManager | null>(
  null
);
const useGameManager = () =>
  useContext<AbstractGameManager | null>(GameManagerContext);

function GameStateManager({ children }: { children: React.ReactNode }) {
  useInitGame();
  useSyncGame(); // sync with contract stuff
  useComputed(); // listen for ui changes
  useInitMethods(); // add methods

  return <>{children}</>;
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
      <GameManagerContext.Provider value={gameManager}>
        <GameStateManager>{children}</GameStateManager>
      </GameManagerContext.Provider>
    </Provider>
  );
}

export { useZKChessState, ZKChessStateProvider };

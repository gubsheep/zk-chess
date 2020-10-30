import React, { useContext, useReducer } from 'react';
import { createContext } from 'react';
import { createContainer } from 'react-tracked';
import { keys } from 'ts-transformer-keys';
import { TurnState } from '../app/Game';
import {
  BoardLocation,
  ChessBoard,
  ChessGame,
  Color,
  EthAddress,
  Selectable,
  StagedLoc,
  PlayerInfo,
} from '../_types/global/GlobalTypes';
import AbstractGameManager from './AbstractGameManager';
import {
  useSyncGame,
  useComputed,
  useInitGame,
  useInitMethods,
} from './StateManagers';

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
  staged: StagedLoc | null;
  turnState: TurnState;
};

type ComputedState = {
  board: ChessBoard;
  gamePaused: boolean;
  canMove: BoardLocation[];
  ghostCanAct: boolean;
};

type StateMethods = {
  getColor: (obj: EthAddress | null) => Color | null;

  setSelected: (obj: Selectable | null) => void;
  setStaged: (obj: StagedLoc | null) => void;

  submitMove: () => void;
  ghostAttack: () => void;
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
    staged: null,
    turnState: TurnState.Moving,
  },
  computed: {
    board: [], // todo make this not fail silently (make nullable)
    canMove: [],
    gamePaused: false,
    ghostCanAct: false,
  },
  methods: {
    getColor: (_) => Color.WHITE,
    setSelected: () => {},
    setStaged: () => {},
    submitMove: () => {},
    ghostAttack: () => {},
  },
};

/* define reducers */
interface Actions {
  updateComputed: Partial<ComputedState>;
  updateGame: Partial<ChessGameState>;
  updateSession: Partial<SessionState>;
  updateMethods: Partial<StateMethods>;
}

// type Action<K extends keyof Actions> = { type: K; arg: Actions[K] };

// TODO refactor this guy to 'react-use'/ useMethods
const reducer = (
  state: ZKChessState,
  { type, arg }: { type: keyof Actions; arg: Actions[typeof type] }
): ZKChessState => {
  // note that these guys don't get type validation, since we have partial types
  switch (type) {
    case 'updateComputed':
      return {
        ...state,
        computed: {
          ...state.computed,
          ...arg,
        },
      };
    case 'updateGame':
      return {
        ...state,
        game: {
          ...state.game,
          ...arg,
        },
      };
    case 'updateSession':
      return {
        ...state,
        session: {
          ...state.session,
          ...arg,
        },
      };
    case 'updateMethods':
      return {
        ...state,
        methods: {
          ...state.methods,
          ...arg,
        },
      };
    default:
      return state;
  }
};

const useValue = () => useReducer(reducer, initialState);
const container = createContainer(useValue);
const { Provider, useTrackedState, useUpdate: useDispatch } = container;

type DispatchProxy = {
  [key in keyof Actions]: (arg: Actions[key]) => void;
};

const getDispatchProxy = (
  dispatch: ReturnType<typeof useDispatch>
): DispatchProxy => {
  const obj: Partial<DispatchProxy> = {};
  const myKeys = keys<Actions>();
  for (const key of myKeys) {
    obj[key] = (arg: Actions[typeof key]) => dispatch({ type: key, arg });
  }

  return obj as DispatchProxy;
};

/* define hooks */

type ZKChessHook = {
  state: ZKChessState;
  gameManager: AbstractGameManager | null;
  dispatch: DispatchProxy;
};

// should only call this inside of ZKChessStateProvider
const useZKChessState = (): ZKChessHook => {
  const state = useTrackedState();
  const dispatch = getDispatchProxy(useDispatch());
  const gameManager = useGameManager();

  return {
    state,
    dispatch,
    gameManager,
  };
};

const GameManagerContext = createContext<AbstractGameManager | null>(null);
const useGameManager = () =>
  useContext<AbstractGameManager | null>(GameManagerContext);

function GameStateManager({ children }: { children: React.ReactNode }) {
  useInitGame(); // things that should only be done once
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

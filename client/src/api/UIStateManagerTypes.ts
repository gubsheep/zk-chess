import { TurnState } from '../app/Game';
import {
  Selectable,
  StagedLoc,
  ChessBoard,
  BoardLocation,
  EthAddress,
  Color,
  ChessGame,
  PlayerInfo,
} from '../_types/global/GlobalTypes';
import AbstractGameManager from './AbstractGameManager';

export type SessionState = {
  selected: Selectable | null;
  staged: StagedLoc | null;
  turnState: TurnState;
};

export type ComputedState = {
  board: ChessBoard;
  gamePaused: boolean;
  canMove: BoardLocation[];
  ghostCanAct: boolean;
  isMyTurn: boolean;
};

export type StateMethods = {
  getColor: (obj: EthAddress | null) => Color | null;

  setSelected: (obj: Selectable | null) => void;
  setStaged: (obj: StagedLoc | null) => void;

  submitMove: () => void;
  ghostAttack: () => void;
};

export type ChessGameState = {
  gameState: ChessGame | null;
  player: PlayerInfo | null;
  enemyPlayer: PlayerInfo | null;
};

export type ZKChessState = {
  game: ChessGameState;
  session: SessionState;
  computed: ComputedState;
  methods: StateMethods;
};

export interface Actions {
  updateComputed: Partial<ComputedState>;
  updateGame: Partial<ChessGameState>;
  updateSession: Partial<SessionState>;
  updateMethods: Partial<StateMethods>;
}

export type DispatchProxy = {
  [key in keyof Actions]: (arg: Actions[key]) => void;
};

export type ZKChessHook = {
  state: ZKChessState;
  gameManager: AbstractGameManager | null;
  dispatch: DispatchProxy;
};

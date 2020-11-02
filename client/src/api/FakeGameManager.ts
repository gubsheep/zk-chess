import {EventEmitter} from 'events';
import {
  BoardLocation,
  ChessGame,
  EthAddress,
} from '../_types/global/GlobalTypes';
import ContractsAPI from './ContractsAPI';
import SnarkHelper from './SnarkArgsHelper';
import _ from 'lodash';

import AbstractGameManager, {GameManagerEvent} from './AbstractGameManager';

import {almostEmptyAddress, emptyAddress} from '../utils/CheckedTypeUtils';
import {compareLoc, sampleGame} from '../utils/ChessUtils';
import autoBind from 'auto-bind';

class FakeGameManager extends EventEmitter implements AbstractGameManager {
  private readonly account: EthAddress | null;

  private readonly contractsAPI: ContractsAPI;
  private readonly snarkHelper: SnarkHelper;

  private gameState: ChessGame;
  private constructor() {
    super();

    this.gameState = _.cloneDeep(sampleGame);
    this.account = emptyAddress;
    autoBind(this);
  }

  public destroy(): void {
    // removes singletons of ContractsAPI, LocalStorageManager, MinerManager
    this.contractsAPI.removeAllListeners();

    this.contractsAPI.destroy();
    this.snarkHelper.destroy();
  }

  static async create(): Promise<FakeGameManager> {
    // initialize dependencies according to a DAG
    const gameManager = new FakeGameManager();

    // @ts-ignore
    window['gm'] = gameManager;

    return gameManager;
  }

  getAccount(): EthAddress | null {
    return this.account;
  }

  getEnemyAccount(): EthAddress | null {
    return almostEmptyAddress;
  }

  getGameAddr(): EthAddress | null {
    return null;
  }

  getGameState(): ChessGame {
    return this.gameState;
  }

  refreshGameIdList(): Promise<void> {
    return Promise.resolve();
  }

  getAllGameIds(): string[] {
    return [];
  }

  refreshGameState(): Promise<ChessGame> {
    return Promise.resolve(this.gameState);
  }

  async setGame(gameId: string): Promise<void> {
    return Promise.resolve();
  }

  createGame(): Promise<void> {
    return Promise.resolve();
  }

  joinGame(): Promise<void> {
    return Promise.resolve();
  }

  movePiece(pieceId: number, to: BoardLocation): Promise<void> {
    console.log(`moved piece ${pieceId} to ${to}!`);

    const newState = _.cloneDeep(this.gameState);
    for (let i = 0; i < newState.player1pieces.length; i++) {
      if (newState.player1pieces[i].id === pieceId) {
        console.log('found a piece!');
        newState.player1pieces[i].location = to;
      }
    }

    this.gameState = newState;
    console.log(this.gameState);

    return Promise.resolve();
  }

  moveGhost(ghostId: number, to: BoardLocation): Promise<void> {
    console.log(`moved ghost ${ghostId} to ${to}!`);

    const newState = _.cloneDeep(this.gameState);
    newState.myGhost.location = to;
    this.gameState = newState;

    return Promise.resolve();
  }

  ghostAttack(): Promise<void> {
    console.log('ghost attack!');

    const newState = _.cloneDeep(this.gameState);
    const loc = newState.myGhost.location;
    for (let i = 0; i < newState.player2pieces.length; i++) {
      // if my ghost is overlapping
      if (compareLoc(newState.player2pieces[i].location, loc)) {
        newState.player2pieces.splice(i, 1);
        break;
      }
    }
    this.gameState = newState;

    return Promise.resolve();
  }

  // AI functions
  opponentMove(): void {
    this.gameState.player2pieces[1].location = [4, 2];
    this.gameState.turnNumber = 0;
    this.emit(GameManagerEvent.MoveMade);
  }

  opponentAttack(): void {
    const newState = _.cloneDeep(this.gameState);
    newState.player1pieces.splice(0, 1);
    this.gameState = newState;
    this.gameState.turnNumber = 0;
    this.emit(GameManagerEvent.MoveMade);
  }
}

export default FakeGameManager;

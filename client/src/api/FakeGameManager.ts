import {EventEmitter} from 'events';
import {
  BoardLocation,
  ChessGame,
  EthAddress,
  isKnown,
  isZKPiece,
} from '../_types/global/GlobalTypes';
import ContractsAPI from './ContractsAPI';
import SnarkHelper from './SnarkArgsHelper';
import _ from 'lodash';

import AbstractGameManager from './AbstractGameManager';

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
    for (let i = 0; i < newState.pieces.length; i++) {
      const piece = newState.pieces[i];
      if (piece.id === pieceId && (!isZKPiece(piece) || isKnown(piece))) {
        console.log('found a piece!');
        piece.location = to;
      }
    }

    this.gameState = newState;
    console.log(this.gameState);

    return Promise.resolve();
  }

  endTurn(): Promise<void> {
    return Promise.resolve();
  }

  // AI functions
  opponentMove(): void {
    /*
    this.gameState.player2pieces[1].location = [4, 2];
    this.gameState.turnNumber = 0;
    this.emit(GameManagerEvent.ActionMade);
    */
  }

  opponentAttack(): void {
    /*
    const newState = _.cloneDeep(this.gameState);
    newState.player1pieces.splice(0, 1);
    this.gameState = newState;
    this.gameState.turnNumber = 0;
    this.emit(GameManagerEvent.ActionMade);
    */
  }
}

export default FakeGameManager;

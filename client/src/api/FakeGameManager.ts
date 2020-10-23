import { EventEmitter } from 'events';
import {
  BoardLocation,
  ChessGame,
  EthAddress,
  PlayerMap,
} from '../_types/global/GlobalTypes';
import ContractsAPI from './ContractsAPI';
import SnarkHelper from './SnarkArgsHelper';
import _ from 'lodash';

import AbstractGameManager from './AbstractGameManager';

export enum GameManagerEvent {
  PieceMoved = 'PieceMoved',
}
import { ContractsAPIEvent } from '../_types/darkforest/api/ContractsAPITypes';
import { emptyAddress } from '../utils/CheckedTypeUtils';
import { sampleGame } from '../utils/ChessUtils';

class FakeGameManager extends EventEmitter implements AbstractGameManager {
  private readonly account: EthAddress | null;

  private readonly contractsAPI: ContractsAPI;
  private readonly snarkHelper: SnarkHelper;

  private gameState: ChessGame;
  private constructor() {
    super();

    this.gameState = _.cloneDeep(sampleGame);
  }

  public destroy(): void {
    // removes singletons of ContractsAPI, LocalStorageManager, MinerManager
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.PlayerInit);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.PlanetUpdate);

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

  getGameAddr(): EthAddress | null {
    return null;
  }

  getGameState(): ChessGame {
    return this.gameState;
  }

  joinGame(gameAddr: EthAddress): Promise<void> {
    return Promise.resolve();
  }

  movePiece(pieceId: number, to: BoardLocation): Promise<void> {
    for (const piece of this.gameState.myPieces) {
      if (piece.id === pieceId) {
        console.log('found a piece!');
        piece.location = to;
      }
    }
    console.log(this.gameState);
    return Promise.resolve();
  }

  moveGhost(ghostId: number, to: BoardLocation): Promise<void> {
    return Promise.resolve();
  }

  ghostAttack(): Promise<void> {
    return Promise.resolve();
  }
}

export default FakeGameManager;

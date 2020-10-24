import {EventEmitter} from 'events';
import {
  BoardLocation,
  ChessGame,
  EthAddress,
  PlayerMap,
} from '../_types/global/GlobalTypes';
import ContractsAPI from './ContractsAPI';
import SnarkHelper from './SnarkArgsHelper';
import _ from 'lodash';

import AbstractGameManager, {GameManagerEvent} from './AbstractGameManager';

import {ContractsAPIEvent} from '../_types/darkforest/api/ContractsAPITypes';
import {emptyAddress} from '../utils/CheckedTypeUtils';
import {sampleGame} from '../utils/ChessUtils';
import autoBind from 'auto-bind';
import {getRandomActionId} from '../utils/Utils';

class FakeGameManager extends EventEmitter implements AbstractGameManager {
  private readonly account: EthAddress | null;

  private readonly contractsAPI: ContractsAPI;
  private readonly snarkHelper: SnarkHelper;

  private gameState: ChessGame;
  private constructor() {
    super();

    this.gameState = _.cloneDeep(sampleGame);
    autoBind(this);
  }

  public destroy(): void {
    // removes singletons of ContractsAPI, LocalStorageManager, MinerManager
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.ProofVerified);

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

  joinGame(): Promise<void> {
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

  confirmMove(): void {
    this.emit(GameManagerEvent.MoveAccepted);

    setTimeout(() => {
      this.emit(GameManagerEvent.MoveConfirmed);
      console.log('gm confirm move');
    }, Math.random() * 5000);
  }

  makeProof(): FakeGameManager {
    this.snarkHelper.getProof(1, 1, 1).then((args) => {
      this.contractsAPI.submitProof(args, getRandomActionId());
    });
    return this;
  }
}

export default FakeGameManager;

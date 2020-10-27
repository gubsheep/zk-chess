import { EventEmitter } from 'events';
import {
  BoardLocation,
  ChessGame,
  Color,
  EthAddress,
  PlayerMap,
} from '../_types/global/GlobalTypes';
import ContractsAPI from './ContractsAPI';
import SnarkHelper from './SnarkArgsHelper';
import _ from 'lodash';

import AbstractGameManager, { GameManagerEvent } from './AbstractGameManager';

import { ContractsAPIEvent } from '../_types/darkforest/api/ContractsAPITypes';
import { almostEmptyAddress, emptyAddress } from '../utils/CheckedTypeUtils';
import { sampleGame } from '../utils/ChessUtils';
import autoBind from 'auto-bind';
import { getRandomActionId } from '../utils/Utils';

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

  getAccount(): EthAddress | null {
    return this.account;
  }

  isMyTurn(): boolean {
    const { turnNumber, player1, player2 } = this.gameState;
    const player = turnNumber % 2 === 0 ? player1 : player2;
    return this.account === player.address;
  }

  getColor(account: EthAddress | null): Color | null {
    if (this.gameState.player1.address === account) return Color.WHITE;
    if (this.gameState.player2.address === account) return Color.BLACK;
    return null;
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
    console.log(`moved piece ${pieceId} to ${to}!`);

    const newState = _.cloneDeep(this.gameState);
    for (let i = 0; i < newState.myPieces.length; i++) {
      if (newState.myPieces[i].id === pieceId) {
        console.log('found a piece!');
        newState.myPieces[i].location = to;
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
    return Promise.resolve();
  }

  makeProof(): FakeGameManager {
    this.snarkHelper.getProof(1, 1, 1).then((args) => {
      this.contractsAPI.submitProof(args, getRandomActionId());
    });
    return this;
  }

  // AI functions
  confirmMove(): void {
    this.emit(GameManagerEvent.MoveAccepted);
    this.gameState.turnNumber = 1;

    setTimeout(() => {
      this.emit(GameManagerEvent.MoveConfirmed);
      console.log('gm confirm move');
      console.log(this.gameState);
    }, 500);
  }

  opponentMove(): void {
    this.gameState.theirPieces[1].location = [4, 2];
    this.gameState.turnNumber = 0;
    this.emit(GameManagerEvent.MoveConfirmed);
  }
}

export default FakeGameManager;

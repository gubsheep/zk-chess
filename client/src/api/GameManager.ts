import { EventEmitter } from 'events';
import {
  BoardLocation,
  ChessGame,
  Color,
  EthAddress,
} from '../_types/global/GlobalTypes';
import ContractsAPI from './ContractsAPI';
import SnarkHelper from './SnarkArgsHelper';
import { sampleGame } from '../utils/ChessUtils';
import _ from 'lodash';

import AbstractGameManager from './AbstractGameManager';

import { ContractsAPIEvent } from '../_types/darkforest/api/ContractsAPITypes';
import { emptyAddress } from '../utils/CheckedTypeUtils';
import { getRandomActionId } from '../utils/Utils';

class GameManager extends EventEmitter implements AbstractGameManager {
  private readonly account: EthAddress | null;

  private readonly contractsAPI: ContractsAPI;
  private readonly snarkHelper: SnarkHelper;

  private gameState: ChessGame;

  private constructor(
    account: EthAddress | null,
    contractsAPI: ContractsAPI,
    snarkHelper: SnarkHelper
  ) {
    super();

    this.account = account;

    this.gameState = _.cloneDeep(sampleGame);
    this.contractsAPI = contractsAPI;
    this.snarkHelper = snarkHelper;
  }

  public destroy(): void {
    // removes singletons of ContractsAPI, SnarkHelper
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.ProofVerified);

    this.contractsAPI.destroy();
    this.snarkHelper.destroy();
  }

  static async create(): Promise<GameManager> {
    // initialize dependencies according to a DAG

    // first we initialize the ContractsAPI and get the user's eth account, and load contract constants + state
    const contractsAPI = await ContractsAPI.create();

    // then we initialize the local storage manager and SNARK helper
    const account = contractsAPI.account;
    const snarkHelper = SnarkHelper.create();

    // get data from the contract
    const gameManager = new GameManager(account, contractsAPI, snarkHelper);

    // set up listeners: whenever ContractsAPI reports some game state update, do some logic
    gameManager.contractsAPI.on(ContractsAPIEvent.ProofVerified, () => {
      console.log('proof verified');
    });

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
    if (this.gameState.player1.address === account) return Color.BLACK;
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
    return Promise.resolve();
  }

  moveGhost(ghostId: number, to: BoardLocation): Promise<void> {
    return Promise.resolve();
  }

  ghostAttack(): Promise<void> {
    return Promise.resolve();
  }

  makeProof(): GameManager {
    this.snarkHelper.getProof(1, 1, 1).then((args) => {
      this.contractsAPI.submitProof(args, getRandomActionId());
    });
    return this;
  }
}

export default GameManager;

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

import AbstractGameManager from './AbstractGameManager';

export enum GameManagerEvent {
  PieceMoved = 'PieceMoved',
}
import {ContractsAPIEvent} from '../_types/darkforest/api/ContractsAPITypes';
import {emptyAddress} from '../utils/CheckedTypeUtils';

class GameManager extends EventEmitter implements AbstractGameManager {
  private readonly account: EthAddress | null;

  private readonly contractsAPI: ContractsAPI;
  private readonly snarkHelper: SnarkHelper;

  /*
  private constructor(
    account: EthAddress | null,
    balance: number,
    contractsAPI: ContractsAPI,
    snarkHelper: SnarkHelper
  ) {
    super();

    this.account = account;
    this.balance = balance;

    this.contractsAPI = contractsAPI;
    this.snarkHelper = snarkHelper;

    this.balanceInterval = setInterval(() => {
      if (this.account) {
        EthereumAccountManager.getInstance()
          .getBalance(this.account)
          .then((balance) => {
            this.balance = balance;
          });
      }
    }, 5000);
  }
  */

  public destroy(): void {
    // removes singletons of ContractsAPI, LocalStorageManager, MinerManager
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.PlayerInit);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.PlanetUpdate);

    this.contractsAPI.destroy();
    this.snarkHelper.destroy();
  }

  static async create(): Promise<GameManager> {
    // initialize dependencies according to a DAG

    const gameManager = new GameManager();
    /*

    // first we initialize the ContractsAPI and get the user's eth account, and load contract constants + state
    const contractsAPI = await ContractsAPI.create();

    // then we initialize the local storage manager and SNARK helper
    const account = contractsAPI.account;
    const balance = await EthereumAccountManager.getInstance().getBalance(
      account
    );
    const snarkHelper = SnarkHelper.create();

    // get data from the contract
    const gameManager = new GameManager(
      account,
      balance,
      contractsAPI,
      snarkHelper
    );

    // set up listeners: whenever ContractsAPI reports some game state update, do some logic
    gameManager.contractsAPI.on(
      ContractsAPIEvent.PlayerInit,
      (player: Player) => {
        gameManager.players.set(player.address, player);
      }
    );
    */

    return gameManager;
  }

  getGameAddr(): EthAddress | null {
    return null;
  }

  getGameState(): ChessGame {
    return {
      myAddress: emptyAddress,
      player1: {address: emptyAddress},
      player2: {address: emptyAddress},
      turnNumber: 0,
      myPieces: [],
      theirPieces: [],
      myGhost: {id: 0, owner: emptyAddress, location: [0, 0]},
      objectives: [],
    };
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
}

export default GameManager;

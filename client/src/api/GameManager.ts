import {EventEmitter} from 'events';
import {
  BoardLocation,
  ChessGame,
  Color,
  EthAddress,
  GameState,
} from '../_types/global/GlobalTypes';
import ContractsAPI from './ContractsAPI';
import SnarkHelper from './SnarkArgsHelper';
import _ from 'lodash';

import AbstractGameManager, {GameManagerEvent} from './AbstractGameManager';

import {
  ContractsAPIEvent,
  EthTxType,
  SubmittedTx,
  UnsubmittedAction,
  UnsubmittedGhostAttack,
  UnsubmittedGhostMove,
  UnsubmittedJoin,
  UnsubmittedMove,
} from '../_types/darkforest/api/ContractsAPITypes';
import {emptyAddress} from '../utils/CheckedTypeUtils';
import {getRandomActionId} from '../utils/Utils';
import {BigInteger} from 'big-integer';
import bigInt from 'big-integer';
import mimcHash from '../hash/mimc';

class GameManager extends EventEmitter implements AbstractGameManager {
  private readonly account: EthAddress | null;

  private readonly contractsAPI: ContractsAPI;
  private readonly snarkHelper: SnarkHelper;

  private gameState: ChessGame;
  private ghostCommitmentsMap: Map<string, [number, number, BigInteger]>;

  private constructor(
    account: EthAddress | null,
    contractsAPI: ContractsAPI,
    snarkHelper: SnarkHelper,
    gameState: ChessGame,
    ghostCommitmentsMap: Map<string, [number, number, BigInteger]>
  ) {
    super();

    this.account = account;

    this.contractsAPI = contractsAPI;
    this.snarkHelper = snarkHelper;

    this.gameState = gameState;
    this.ghostCommitmentsMap = ghostCommitmentsMap;
  }

  static async create(): Promise<GameManager> {
    // initialize dependencies according to a DAG

    const contractsAPI = await ContractsAPI.create();
    const account = contractsAPI.account;
    const contractGameState = await contractsAPI.getGameState();
    const snarkHelper = SnarkHelper.create();
    const ghostCommitmentsMap = new Map<string, [number, number, BigInteger]>();
    ghostCommitmentsMap.set(mimcHash(3, 3, 0).toString(), [3, 3, bigInt(0)]);
    let salt = '0';
    let location: BoardLocation = [3, 3];
    const commitmentsMapEntry = ghostCommitmentsMap.get(
      contractGameState.myContractGhost.commitment
    );
    if (commitmentsMapEntry) {
      location = [commitmentsMapEntry[0], commitmentsMapEntry[1]];
      salt = commitmentsMapEntry[2].toString();
    }
    const gameState = {
      ...contractGameState,
      myGhost: {
        ...contractGameState.myContractGhost,
        location,
        salt,
      },
    };

    // get data from the contract
    const gameManager = new GameManager(
      account,
      contractsAPI,
      snarkHelper,
      gameState,
      ghostCommitmentsMap
    );

    // set up listeners: whenever ContractsAPI reports some game state update, do some logic
    contractsAPI.on(ContractsAPIEvent.ProofVerified, () => {
      console.log('proof verified');
    });
    contractsAPI.on(ContractsAPIEvent.GameStart, async () => {
      console.log('game started');
      await gameManager.refreshGameState();
      gameManager.emit(GameManagerEvent.GameStart, gameManager.getGameState());
    });
    contractsAPI.on(ContractsAPIEvent.MoveMade, async () => {
      console.log('move made');
      await gameManager.refreshGameState();
      gameManager.emit(GameManagerEvent.MoveMade, gameManager.getGameState());
    });
    contractsAPI.on(ContractsAPIEvent.GameFinished, async () => {
      console.log('game finished');
      await gameManager.refreshGameState();
      gameManager.emit(
        GameManagerEvent.GameFinished,
        gameManager.getGameState()
      );
    });

    contractsAPI.on(
      ContractsAPIEvent.TxInitialized,
      async (unminedTx: UnsubmittedAction) => {
        gameManager.emit(GameManagerEvent.TxInitialized, unminedTx);
      }
    );
    contractsAPI.on(
      ContractsAPIEvent.TxInitFailed,
      async (unminedTx: UnsubmittedAction, error: Error) => {
        gameManager.emit(GameManagerEvent.TxInitFailed, unminedTx, error);
      }
    );
    contractsAPI.on(
      ContractsAPIEvent.TxSubmitted,
      async (unminedTx: SubmittedTx) => {
        gameManager.emit(GameManagerEvent.TxSubmitted, unminedTx);
      }
    );
    contractsAPI.on(
      ContractsAPIEvent.TxFailed,
      async (unminedTx: SubmittedTx, error: Error) => {
        gameManager.emit(GameManagerEvent.TxFailed, unminedTx, error);
      }
    );
    contractsAPI.on(
      ContractsAPIEvent.TxConfirmed,
      async (unminedTx: SubmittedTx) => {
        gameManager.emit(GameManagerEvent.TxConfirmed, unminedTx);
      }
    );

    // @ts-ignore
    window['gm'] = gameManager;

    return gameManager;
  }

  public destroy(): void {
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.ProofVerified);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.GameStart);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.MoveMade);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.GameFinished);

    this.contractsAPI.removeAllListeners(ContractsAPIEvent.TxInitialized);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.TxInitFailed);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.TxSubmitted);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.TxFailed);
    this.contractsAPI.removeAllListeners(ContractsAPIEvent.TxConfirmed);

    this.contractsAPI.destroy();
    this.snarkHelper.destroy();
  }

  getAccount(): EthAddress | null {
    return this.account;
  }

  getEnemyAccount(): EthAddress | null {
    return emptyAddress;
  }

  isMyTurn(): boolean {
    const {gameState, player1, player2} = this.gameState;
    if (
      gameState === GameState.COMPLETE ||
      gameState === GameState.WAITING_FOR_PLAYERS
    ) {
      return false;
    }
    let whoseTurn = player1;
    if (gameState === GameState.P2_TO_MOVE) {
      whoseTurn = player2;
    }
    return this.account === whoseTurn.address;
  }

  getGameAddr(): EthAddress | null {
    return this.contractsAPI.getContractAddress();
  }

  getGameState(): ChessGame {
    return this.gameState;
  }

  async refreshGameState(): Promise<ChessGame> {
    const contractGameState = await this.contractsAPI.getGameState();
    let salt = '0';
    let location: BoardLocation = [3, 3];
    const commitmentsMapEntry = this.ghostCommitmentsMap.get(
      contractGameState.myContractGhost.commitment
    );
    if (commitmentsMapEntry) {
      location = [commitmentsMapEntry[0], commitmentsMapEntry[1]];
      salt = commitmentsMapEntry[2].toString();
    }
    this.gameState = {
      ...contractGameState,
      myGhost: {
        ...contractGameState.myContractGhost,
        location,
        salt,
      },
    };
    return this.gameState;
  }

  joinGame(): Promise<void> {
    const unsubmittedJoin: UnsubmittedJoin = {
      actionId: getRandomActionId(),
      type: EthTxType.JOIN_GAME,
    };
    this.contractsAPI.onTxInit(unsubmittedJoin);
    this.contractsAPI.joinGame(unsubmittedJoin);
    return Promise.resolve();
  }

  movePiece(pieceId: number, to: BoardLocation): Promise<void> {
    const unsubmittedMove: UnsubmittedMove = {
      actionId: getRandomActionId(),
      type: EthTxType.MOVE,
      pieceId,
      to,
    };
    this.contractsAPI.onTxInit(unsubmittedMove);
    this.contractsAPI.movePiece(pieceId, to[1], to[0], unsubmittedMove);
    return Promise.resolve();
  }

  moveGhost(ghostId: number, to: BoardLocation): Promise<void> {
    // const newSalt = bigInt.randBetween(bigInt(0), LOCATION_ID_UB).toString();
    const newSalt = '0';
    this.ghostCommitmentsMap.set(mimcHash(to[1], to[0], newSalt).toString(), [
      to[1],
      to[0],
      bigInt(newSalt),
    ]);
    const unsubmittedGhostMove: UnsubmittedGhostMove = {
      actionId: getRandomActionId(),
      type: EthTxType.GHOST_MOVE,
      pieceId: ghostId,
      to,
      newSalt,
    };
    this.contractsAPI.onTxInit(unsubmittedGhostMove);

    const {myGhost} = this.gameState;
    const oldLoc = myGhost.location;
    this.snarkHelper
      .getGhostMoveProof(
        oldLoc[1],
        oldLoc[0],
        myGhost.salt,
        to[1],
        to[0],
        newSalt
      )
      .then((args) => {
        console.log(args);
        this.contractsAPI.moveGhost(args, ghostId, unsubmittedGhostMove);
      });
    return Promise.resolve();
  }

  ghostAttack(): Promise<void> {
    const {myGhost} = this.gameState;
    const pieceId = myGhost.id;
    const attackAt = myGhost.location;
    const unsubmittedGhostAttack: UnsubmittedGhostAttack = {
      actionId: getRandomActionId(),
      type: EthTxType.GHOST_ATTACK,
      pieceId,
      at: attackAt,
    };
    this.contractsAPI.onTxInit(unsubmittedGhostAttack);
    this.contractsAPI.ghostAttack(
      pieceId,
      attackAt[1],
      attackAt[0],
      myGhost.salt,
      unsubmittedGhostAttack
    );
    return Promise.resolve();
  }
}

export default GameManager;

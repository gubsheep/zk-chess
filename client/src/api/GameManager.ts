import {EventEmitter} from 'events';
import {
  BoardLocation,
  ChessGame,
  Color,
  EthAddress,
} from '../_types/global/GlobalTypes';
import ContractsAPI from './ContractsAPI';
import SnarkHelper from './SnarkArgsHelper';
import _ from 'lodash';

import AbstractGameManager, {GameManagerEvent} from './AbstractGameManager';

import {
  ContractsAPIEvent,
  EthTxType,
  ProveArgIdx,
  SubmittedTx,
  UnsubmittedAction,
  UnsubmittedJoin,
  UnsubmittedMove,
  UnsubmittedProve,
  ZKArgIdx,
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
    const gameState = {
      ...contractGameState,
      myGhost: {
        ...contractGameState.myContractGhost,
        location: (ghostCommitmentsMap
          .get(contractGameState.myContractGhost.commitment)
          ?.slice(0, 2) as [number, number]) || [3, 3],
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
    const {turnNumber, player1, player2} = this.gameState;
    const player = turnNumber % 2 === 0 ? player1 : player2;
    return this.account === player.address;
  }

  getColor(account: EthAddress | null): Color | null {
    if (this.gameState.player1.address === account) return Color.WHITE;
    if (this.gameState.player2.address === account) return Color.BLACK;
    return null;
  }

  getGameAddr(): EthAddress | null {
    return this.contractsAPI.getContractAddress();
  }

  getGameState(): ChessGame {
    return this.gameState;
  }

  async refreshGameState(): Promise<ChessGame> {
    const contractGameState = await this.contractsAPI.getGameState();
    this.gameState = {
      ...contractGameState,
      myGhost: {
        ...contractGameState.myContractGhost,
        location: (this.ghostCommitmentsMap
          .get(contractGameState.myContractGhost.commitment)
          ?.slice(0, 2) as [number, number]) || [3, 3],
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
    return Promise.resolve();
  }

  ghostAttack(): Promise<void> {
    return Promise.resolve();
  }

  makeProof(): GameManager {
    this.snarkHelper.getProof(1, 1, 1).then((args) => {
      const unsubmittedProve: UnsubmittedProve = {
        actionId: getRandomActionId(),
        type: EthTxType.PROVE,
        output: args[ZKArgIdx.DATA][ProveArgIdx.OUTPUT],
      };
      this.contractsAPI.onTxInit(unsubmittedProve);
      this.contractsAPI.submitProof(args, unsubmittedProve);
    });
    return this;
  }
}

export default GameManager;

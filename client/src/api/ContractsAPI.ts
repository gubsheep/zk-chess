//import * as EventEmitter from 'events';
import { EventEmitter } from 'events';
import { EthAddress } from '../_types/global/GlobalTypes';
// NOTE: DO NOT IMPORT FROM ETHERS SUBPATHS. see https://github.com/ethers-io/ethers.js/issues/349 (these imports trip up webpack)
// in particular, the below is bad!
// import {TransactionReceipt, Provider, TransactionResponse, Web3Provider} from "ethers/providers";
import { Contract, providers } from 'ethers';
import _ from 'lodash';

import { address } from '../utils/CheckedTypeUtils';
import {
  UnconfirmedTx,
  UnconfirmedInit,
  EthTxType,
  UnconfirmedMove,
  ContractsAPIEvent,
  UnconfirmedUpgrade,
  SubmittedTx,
  UnconfirmedBuyHat,
} from '../_types/darkforest/api/ContractsAPITypes';
import EthereumAccountManager from './EthereumAccountManager';

export function isUnconfirmedInit(tx: UnconfirmedTx): tx is UnconfirmedInit {
  return tx.type === EthTxType.INIT;
}

export function isUnconfirmedMove(tx: UnconfirmedTx): tx is UnconfirmedMove {
  return tx.type === EthTxType.MOVE;
}

export function isUnconfirmedUpgrade(
  tx: UnconfirmedTx
): tx is UnconfirmedUpgrade {
  return tx.type === EthTxType.UPGRADE;
}

export function isUnconfirmedBuyHat(
  tx: UnconfirmedTx
): tx is UnconfirmedBuyHat {
  return tx.type === EthTxType.BUY_HAT;
}

export const contractPrecision = 1000;

type QueuedTxRequest = {
  actionId: string;
  contract: Contract;
  method: string; // make this an enum

  /* eslint-disable @typescript-eslint/no-explicit-any */
  args: any[];
  overrides: providers.TransactionRequest;
};

class TxExecutor extends EventEmitter {
  private txRequests: QueuedTxRequest[];
  private pendingExec: boolean;
  private nonce: number;
  private nonceLastUpdated: number;

  constructor(nonce: number) {
    super();

    this.txRequests = [];
    this.pendingExec = false;
    this.nonce = nonce;
    this.nonceLastUpdated = Date.now();
  }

  makeRequest(
    txRequest: QueuedTxRequest
  ): Promise<providers.TransactionResponse> {
    this.txRequests.push(txRequest);
    if (!this.pendingExec) {
      const toExec = this.txRequests.shift();
      if (toExec) this.execute(toExec);
    }
    return new Promise<providers.TransactionResponse>((resolve, reject) => {
      this.once(
        txRequest.actionId,
        (res: providers.TransactionResponse, e: Error) => {
          if (res) {
            resolve(res);
          } else {
            reject(e);
          }
        }
      );
    });
  }

  async execute(txRequest: QueuedTxRequest) {
    this.pendingExec = true;
    try {
      console.log('executing tx');
      // check if balance too low
      const ethConnection = EthereumAccountManager.getInstance();
      const balance = await ethConnection.getBalance(
        ethConnection.getAddress()
      );
      if (balance < 0.002) {
        throw new Error('xDAI balance too low!');
      }

      if (Date.now() - this.nonceLastUpdated > 30000) {
        this.nonce = await EthereumAccountManager.getInstance().getNonce();
      }
      // await this.popupConfirmationWindow(txRequest);
      try {
        const res = await txRequest.contract[txRequest.method](
          ...txRequest.args,
          {
            ...txRequest.overrides,
            nonce: this.nonce,
          }
        );
        this.nonce += 1;
        this.nonceLastUpdated = Date.now();
        this.emit(txRequest.actionId, res);
      } catch (e) {
        console.error('error while submitting tx:');
        console.error(e);
        throw new Error('Unknown error occurred.');
      }
    } catch (e) {
      this.emit(txRequest.actionId, undefined, e);
    }
    this.pendingExec = false;
    const next = this.txRequests.shift();
    if (next) {
      this.execute(next);
    }
  }
}

class ContractsAPI extends EventEmitter {
  readonly account: EthAddress;
  private coreContract: Contract;
  private readonly txRequestExecutor: TxExecutor;

  private constructor(
    account: EthAddress,
    coreContract: Contract,
    nonce: number
  ) {
    super();
    this.account = account;
    this.coreContract = coreContract;
    this.txRequestExecutor = new TxExecutor(nonce);
  }

  static async create(): Promise<ContractsAPI> {
    const ethConnection = EthereumAccountManager.getInstance();
    const contract: Contract = await ethConnection.loadCoreContract();

    const account: EthAddress = ethConnection.getAddress();
    const nonce: number = await ethConnection.getNonce();

    const contractsAPI: ContractsAPI = new ContractsAPI(
      account,
      contract,
      nonce
    );
    contractsAPI.setupEventListeners();

    return contractsAPI;
  }

  destroy(): void {
    this.removeEventListeners();
  }

  private setupEventListeners(): void {
    // TODO replace these with block polling
    // this.coreContract
    //   .on(ContractEvent.PlayerInitialized, async (player, locRaw, _: Event) => {
    //   });

    const ethConnection = EthereumAccountManager.getInstance();

    ethConnection.on('ChangedRPCEndpoint', async () => {
      this.coreContract = await ethConnection.loadCoreContract();
    });
  }

  removeEventListeners(): void {
    // this.coreContract.removeAllListeners(ContractEvent.PlayerInitialized);
  }

  public getContractAddress(): EthAddress {
    return address(this.coreContract.address);
  }

  public onTxInit(unminedTx: UnconfirmedTx): void {
    this.emit(ContractsAPIEvent.TxInitialized, unminedTx);
  }

  public onTxSubmit(unminedTx: SubmittedTx): void {
    // TODO encapsulate this into terminalemitter
    this.emit(ContractsAPIEvent.TxSubmitted, unminedTx);
    EthereumAccountManager.getInstance()
      .waitForTransaction(unminedTx.txHash)
      .then((receipt) => {
        this.onTxConfirmation(unminedTx, receipt.status === 1);
      });
  }

  private onTxConfirmation(unminedTx: SubmittedTx, success: boolean) {
    if (success) {
      console.log('success');
    } else {
      console.log('fail');
    }
    this.emit(ContractsAPIEvent.TxConfirmed, unminedTx);
  }
}

export default ContractsAPI;

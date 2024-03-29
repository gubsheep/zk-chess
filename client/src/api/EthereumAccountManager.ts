import * as stringify from 'json-stable-stringify';
import {JsonRpcProvider, TransactionReceipt} from '@ethersproject/providers';
import {providers, Contract, Wallet, utils, ContractInterface} from 'ethers';
import {EthAddress} from '../_types/global/GlobalTypes';
import {address} from '../utils/CheckedTypeUtils';
import {EventEmitter} from 'events';
import {XDAI_CHAIN_ID} from '../utils/constants';

const isProd = process.env.NODE_ENV === 'production';
// const isProd = true;

class EthereumAccountManager extends EventEmitter {
  static instance: EthereumAccountManager | null = null;

  private provider: JsonRpcProvider;
  private signer: Wallet | null;
  private rpcURL: string;
  private readonly knownAddresses: EthAddress[];

  private constructor() {
    super();

    let url: string;
    if (isProd) {
      url =
        localStorage.getItem('XDAI_RPC_ENDPOINT') ||
        'https://xdai.poanetwork.dev';
    } else {
      url = 'http://localhost:8545';
    }
    this.setRpcEndpoint(url);
    this.knownAddresses = [];
    const knownAddressesStr = localStorage.getItem('KNOWN_ADDRESSES');
    if (knownAddressesStr) {
      const addrStrs = JSON.parse(knownAddressesStr) as string[];
      for (const addrStr of addrStrs) {
        this.knownAddresses.push(address(addrStr));
      }
    }
  }

  static getInstance(): EthereumAccountManager {
    if (!EthereumAccountManager.instance) {
      EthereumAccountManager.instance = new EthereumAccountManager();
    }
    return EthereumAccountManager.instance;
  }

  public getRpcEndpoint(): string {
    return this.rpcURL;
  }

  public async setRpcEndpoint(url: string): Promise<void> {
    try {
      this.rpcURL = url;
      const newProvider = new providers.JsonRpcProvider(this.rpcURL);
      this.provider = newProvider;
      this.provider.pollingInterval = 4000;
      if (isProd) {
        if ((await newProvider.getNetwork()).chainId !== XDAI_CHAIN_ID) {
          throw new Error('not a valid xDAI RPC URL');
        }
      }
      if (this.signer) {
        this.signer = new Wallet(this.signer.privateKey, this.provider);
      } else {
        this.signer = null;
      }
      localStorage.setItem('XDAI_RPC_ENDPOINT', this.rpcURL);
      this.emit('ChangedRPCEndpoint');
    } catch (e) {
      console.error(`error setting rpc endpoint: ${e}`);
      this.setRpcEndpoint('https://xdai.poanetwork.dev');
      return;
    }
  }

  public async loadContract(
    contractAddress: string,
    contractABI: ContractInterface
  ): Promise<Contract> {
    if (this.signer) {
      return new Contract(contractAddress, contractABI, this.signer);
    } else {
      throw new Error('no signer found');
    }
  }

  public async loadGameContract(contractAddress: string): Promise<Contract> {
    const contractABI = (
      await fetch('/bote/public/contracts/ZKChessGame.json').then((x) =>
        x.json()
      )
    ).abi;
    return this.loadContract(contractAddress, contractABI);
  }

  public async loadFactoryContract(): Promise<Contract> {
    const contractABI = (
      await fetch('/bote/public/contracts/ZKChessGameFactory.json').then((x) =>
        x.json()
      )
    ).abi;

    const contractAddress = isProd
      ? require('../utils/prod_contract_addr').contractAddress
      : require('../utils/local_contract_addr').contractAddress;

    return this.loadContract(contractAddress, contractABI);
  }

  public getAddress(): EthAddress {
    // throws if no account has been set yet
    if (!this.signer) {
      throw new Error('account not selected yet');
    }
    return address(this.signer.address);
  }

  public getNonce(): Promise<number> {
    // throws if no account has been set yet
    if (!this.signer) {
      throw new Error('account not selected yet');
    }
    return this.provider.getTransactionCount(this.signer.address);
  }

  public setAccount(address: EthAddress): void {
    const skey = localStorage.getItem(`skey-${address}`);
    if (skey) {
      this.signer = new Wallet(skey, this.provider);
    } else {
      throw new Error('private key for address not found');
    }
  }

  // returns public key
  public addAccount(skey: string): EthAddress {
    // throws if invalid secret key
    const addr = address(utils.computeAddress(skey));
    if (!this.knownAddresses.includes(addr)) {
      localStorage.setItem(`skey-${addr}`, skey);
      this.knownAddresses.push(addr);
      localStorage.setItem('KNOWN_ADDRESSES', stringify(this.knownAddresses));
    }
    return addr;
  }

  public getKnownAccounts(): EthAddress[] {
    return this.knownAddresses;
  }

  public async signMessage(message: string): Promise<string> {
    if (!this.signer) {
      throw new Error('no signer yet');
    }
    return this.signer.signMessage(message);
  }

  public async getBalance(address: EthAddress): Promise<number> {
    const balanceWeiBN = await this.provider.getBalance(address);
    return parseFloat(utils.formatEther(balanceWeiBN));
  }

  public getPrivateKey(): string {
    if (!this.signer) {
      throw new Error('no signer yet');
    }
    return this.signer.privateKey;
  }

  public async waitForTransaction(txHash: string): Promise<TransactionReceipt> {
    return this.provider.waitForTransaction(txHash, 1);
  }
}

export default EthereumAccountManager;

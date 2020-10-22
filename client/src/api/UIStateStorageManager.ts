import { contractAddress } from '../utils/local_contract_addr';
import { EthAddress } from '../_types/global/GlobalTypes';

export enum UIDataKey {
  terminalEnabled = 'terminalEnabled',
  sidebarEnabled = 'sidebarEnabled',
  tutorialCompleted = 'tutorialCompleted',

  welcomedPlayer = 'welcomedPlayer',
  foundSpace = 'foundSpace',
  foundDeepSpace = 'foundDeepSpace',
  foundPirates = 'foundPirates',
  foundSilver = 'foundSilver',
  foundComet = 'foundComet',

  notifMove = 'notifMove',
  newPlayer = 'newPlayer',
  highPerf = 'highPerf',
}
export type UIDataValue = boolean;

export type UIData = {
  sidebarEnabled: boolean;
  terminalEnabled: boolean;
  tutorialCompleted: boolean;

  welcomedPlayer: boolean;
  foundSpace: boolean;
  foundDeepSpace: boolean;
  foundPirates: boolean;
  foundSilver: boolean;
  foundComet: boolean;

  notifMove: boolean;
  newPlayer: boolean;
  highPerf: boolean;
};

export const defaultUserData: UIData = {
  terminalEnabled: true,
  sidebarEnabled: true,
  tutorialCompleted: false,

  welcomedPlayer: false,
  foundSpace: false,
  foundDeepSpace: false,
  foundPirates: false,
  foundSilver: false,
  foundComet: false,

  notifMove: true,
  newPlayer: true,

  highPerf: false,
};

// singleton who should never be initialized before gameUIManager
class UIStateStorageManager {
  private static instance: UIStateStorageManager;
  account: EthAddress | null;
  contractAddress: string;

  private constructor(account: EthAddress | null, contractAddress: string) {
    this.account = account;
    this.contractAddress = contractAddress;
  }

  public static create(
    account: EthAddress | null,
    contractAddress: string
  ): UIStateStorageManager {
    UIStateStorageManager.instance = new UIStateStorageManager(
      account,
      contractAddress
    );
    return UIStateStorageManager.instance;
  }

  // TODO implement this
  public destroy(): void {
    // in the future we can use this for things that are polled like viewport
    // this.save();

    // don't need to do anything else
    return;
  }

  private getKey(): string {
    if (!this.account) return 'user-data';
    return `${this.account}-${contractAddress}-data`;
  }

  // manage user data
  private save(data: UIData) {
    localStorage.setItem(this.getKey(), JSON.stringify(data));
  }

  private load(): UIData {
    const str = localStorage.getItem(this.getKey());

    if (str) return JSON.parse(str);
    else {
      // default values
      return defaultUserData;
    }
  }

  setUIDataItem(key: UIDataKey, value: UIDataValue): void {
    const obj = this.load();
    obj[key] = value;
    this.save(obj);
  }

  getUIDataItem(key: UIDataKey): UIDataValue {
    const val = this.load()[key];
    return val;
  }
}

export default UIStateStorageManager;

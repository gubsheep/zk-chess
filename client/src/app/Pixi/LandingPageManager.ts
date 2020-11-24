import EthereumAccountManager from '../../api/EthereumAccountManager';
import GameManager from '../../api/GameManager';
import { PixiManager } from '../../api/PixiManager';
import { EthAddress } from '../../_types/global/GlobalTypes';
import { PlayerName } from './@PixiTypes';

export const PLAYER_1 =
  '0x044C7963E9A89D4F8B64AB23E02E97B2E00DD57FCB60F316AC69B77135003AEF';

export const PLAYER_2 =
  '0x523170AAE57904F24FFE1F61B7E4FF9E9A0CE7557987C2FC034EACB1C267B4AE';

export const SPECTATOR =
  '0x67195c963ff445314e667112ab22f4a7404bad7f9746564eb409b9bb8c6aed32';

export class LandingPageManager {
  static instance: LandingPageManager | null;
  manager: PixiManager;

  ethConnection: EthereumAccountManager;
  tableId: string;

  p1: EthAddress;
  p2: EthAddress;
  spec: EthAddress;

  constructor(pixiManager: PixiManager, tableId: string) {
    this.manager = pixiManager;
    this.tableId = tableId;

    this.ethConnection = EthereumAccountManager.getInstance();
    this.p1 = this.ethConnection.addAccount(PLAYER_1);
    this.p2 = this.ethConnection.addAccount(PLAYER_2);
    this.spec = this.ethConnection.addAccount(SPECTATOR);
  }

  static initialize(gameManager: PixiManager, tableId: string) {
    const lpManager = new LandingPageManager(gameManager, tableId);
    LandingPageManager.instance = lpManager;
    return lpManager;
  }

  async initGame(player: PlayerName) {
    console.log(player);

    let acc = this.p1;
    if (player === PlayerName.Bob) acc = this.p2;
    else if (player === PlayerName.Spectator) acc = this.spec;

    this.ethConnection.setAccount(acc);

    this.manager.initGame(player);
  }

  createTable() {
    console.log('table created');
  }
}

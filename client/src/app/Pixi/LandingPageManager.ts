import { PixiManager } from '../../api/PixiManager';

export enum InitState {
  NONE,
  CREATE_TABLE,
  WHICH_PLAYER,
}

export class LandingPageManager {
  static instance: LandingPageManager | null;
  manager: PixiManager;

  initState: InitState;

  constructor(pixiManager: PixiManager) {
    this.manager = pixiManager;
    this.initState = InitState.NONE;
  }

  static initialize(gameManager: PixiManager) {
    const lpManager = new LandingPageManager(gameManager);
    LandingPageManager.instance = lpManager;
    return lpManager;
  }

  createTable() {
    console.log('table created');
  }
}

import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../../api/PixiManager';
import { PixiObject } from '../PixiObject';
import { CreateTable } from './CreateTable';
import { PlayerButtons } from './PlayerButtons';
import { SetSail } from './SetSail';
import { Title } from './Title';

export class GameInitUI extends PixiObject {
  playerButtons: PlayerButtons;

  constructor(manager: PixiManager) {
    super(manager, GameZIndex.GameInit);
    this.playerButtons = new PlayerButtons(manager);

    this.addChild(this.playerButtons);
    this.addChild(new Title(manager));
    this.addChild(new SetSail(manager, this.initGame));
    // this.addChild(new CreateTable(manager));
  }

  private initGame() {
    this.setActive(false);
    this.manager.landingManager.initGame(this.playerButtons.selected);
  }
}

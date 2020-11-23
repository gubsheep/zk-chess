import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../../api/PixiManager';
import { PixiObject } from '../PixiObject';
import { UI } from '../Utils/TextureLoader';
import { Title } from './Title';

export class GameInitUI extends PixiObject {
  constructor(manager: PixiManager) {
    super(manager, GameZIndex.GameInit);
    const cache = PIXI.utils.TextureCache;

    const p1 = new PIXI.Sprite(cache[UI.P1]);
    const p2 = new PIXI.Sprite(cache[UI.P2]);
    const spec = new PIXI.Sprite(cache[UI.SPECTATE]);

    const title = new PIXI.Sprite(cache[UI.TITLE]);
    const setsail = new PIXI.Sprite(cache[UI.SETSAIL]);
    const boat = new PIXI.Sprite(cache[UI.BOAT]);

    this.addChild(new Title(manager));
  }

  initGame() {
    this.setActive(false);
    this.manager.initGame();
  }
}

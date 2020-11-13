import { GameZIndex, PixiManager } from '../../api/PixiManager';
import { GameObject } from './GameObject';
import { BG_IMAGE } from './TextureLoader';
import * as PIXI from 'pixi.js';

export class Background extends GameObject {
  constructor(manager: PixiManager) {
    const cache = PIXI.utils.TextureCache;
    let texture = cache[BG_IMAGE];
    const { width, height } = manager.app.renderer;
    let bgsprite = new PIXI.TilingSprite(texture, width, height);
    super(manager, bgsprite, GameZIndex.Background);
  }
}

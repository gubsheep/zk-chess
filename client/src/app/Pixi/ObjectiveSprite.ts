import { PixiManager } from '../../api/PixiManager';
import { PixiObject } from './PixiObject';
import { PlayerColor } from './@PixiTypes';
import { objectiveShader } from './Shaders';
import { OBJECTIVE } from './TextureLoader';
import * as PIXI from 'pixi.js';

export class ObjectiveSprite extends PixiObject {
  color: PlayerColor | null;

  constructor(manager: PixiManager, color: PlayerColor | null = null) {
    super(manager);
    const cache = PIXI.utils.TextureCache;
    const sprite = new PIXI.Sprite(cache[OBJECTIVE]);
    this.object.addChild(sprite);

    this.setColor(color);
  }

  setColor(color: PlayerColor | null) {
    this.color = color;
    this.setFilters([objectiveShader(color)]);
  }
}

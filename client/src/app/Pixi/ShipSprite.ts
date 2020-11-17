import { PixiManager } from '../../api/PixiManager';
import { PixiObject } from './PixiObject';
import * as PIXI from 'pixi.js';
import { PieceType } from '../../_types/global/GlobalTypes';
import { PlayerColor } from './PixiTypes';
import { playerShader } from './Shaders';
import { SHIPS, SPRITE_W } from './TextureLoader';

export class ShipSprite extends PixiObject {
  type: PieceType | null;
  color: PlayerColor | null;
  rect: PIXI.Graphics;

  constructor(
    manager: PixiManager,
    type: PieceType | null = null,
    color: PlayerColor | null = null
  ) {
    super(manager);

    const rect = new PIXI.Graphics();
    this.object.addChild(rect);

    this.rect = rect;

    this.setType(type);
    this.setColor(color);
  }

  loop() {
    const cache = PIXI.utils.TextureCache;
    super.loop();
    this.rect.clear();

    if (this.type === null) return;
    this.rect.beginTextureFill({ texture: cache[SHIPS[this.type]] });
    this.rect.drawRect(0, 0, SPRITE_W, SPRITE_W);
    this.rect.endFill();
  }

  setType(type: PieceType | null) {
    this.type = type;
  }

  setColor(color: PlayerColor | null) {
    this.color = color;

    if (color === PlayerColor.Blue) {
      this.rect.scale.x = -1;
      this.rect.x = SPRITE_W;
    } else {
      this.rect.scale.x = 1;
      this.rect.x = 0;
    }

    this.setFilters(color ? [playerShader(color)] : []);
  }
}

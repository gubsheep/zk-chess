import * as PIXI from 'pixi.js';
import { ColorOverlayFilter } from '@pixi/filter-color-overlay';
import { PixiManager } from '../../../api/PixiManager';
import { PieceType } from '../../../_types/global/GlobalTypes';
import { PlayerColor } from '../@PixiTypes';
import { SHIPS, SPRITE_W } from '../Utils/TextureLoader';
import { ShipSprite } from './ShipSprite';
import { PixiObject } from '../PixiObject';
import { Ship } from './Ship';

export const WHITE = 0xffffff;
export const RED = 0xff0000;
export const GREEN = 0x00ff00;

export class FlashSprite extends PixiObject {
  color: PlayerColor | null;
  type: PieceType | null;

  flashColor: number;

  sprite: ShipSprite;

  lastFlashed: number;

  constructor(
    manager: PixiManager,
    type: PieceType | null = null,
    color: PlayerColor | null = null
  ) {
    super(manager);

    this.lastFlashed = -Infinity;

    this.type = type;
    this.color = color;

    this.setFlashColor(0xff0000);

    this.sprite = new ShipSprite(manager, type, color);
    this.setAlpha(0);
    this.addChild(this.sprite);
  }

  setFlashColor(flashColor: number) {
    this.setFilters([new ColorOverlayFilter(flashColor)]);
  }

  flash() {
    this.lastFlashed = this.lifetime;
    this.setAlpha(1);
  }

  loop() {
    super.loop();

    const diff = this.lifetime - this.lastFlashed;
    if (diff < 18) {
      this.setAlpha(this.lifetime % 6 < 3 ? 1 : 0);
    } else {

      this.setAlpha(0);
    }
  }

  setColor(color: PlayerColor | null) {
    this.color = color;

    if (color === PlayerColor.Blue) {
      this.object.scale.x = -1;
      this.object.x = SPRITE_W;
    } else {
      this.object.scale.x = 1;
      this.object.x = 0;
    }
  }
}

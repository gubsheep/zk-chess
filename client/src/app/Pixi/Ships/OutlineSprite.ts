import * as PIXI from 'pixi.js';
import { ColorOverlayFilter } from '@pixi/filter-color-overlay';
import { PixiManager } from '../../../api/PixiManager';
import { PieceType } from '../../../_types/global/GlobalTypes';
import { PlayerColor } from '../@PixiTypes';
import { SHIPS, SPRITE_W } from '../Utils/TextureLoader';
import { ShipSprite } from './ShipSprite';
import { PixiObject } from '../PixiObject';

export class OutlineSprite extends PixiObject {
  sprites: ShipSprite[];
  color: PlayerColor | null;
  type: PieceType | null;

  constructor(
    manager: PixiManager,
    type: PieceType | null = null,
    color: PlayerColor | null = null
  ) {
    super(manager);

    this.type = type;
    this.color = color;

    this.setFilters([new ColorOverlayFilter(0xffffff)]);

    const s1 = new ShipSprite(manager, type, color);
    s1.setPosition({ x: 0, y: -1 });
    const s2 = new ShipSprite(manager, type, color);
    s2.setPosition({ x: 0, y: 1 });
    const s3 = new ShipSprite(manager, type, color);
    s3.setPosition({ x: 1, y: 0 });
    const s4 = new ShipSprite(manager, type, color);
    s4.setPosition({ x: -1, y: 0 });

    this.sprites = [];
    [s1, s2, s3, s4].map((s) => {
      this.addChild(s);
      this.sprites.push(s);
    });
  }

  loop() {
    super.loop();

    for (const sprite of this.sprites) {
      sprite.setColor(this.color);
      sprite.setType(this.type);
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

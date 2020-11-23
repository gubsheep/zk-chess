import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { Player } from '../../../_types/global/GlobalTypes';
import { PlayerType } from '../@PixiTypes';
import { PixiObject, Wrapper } from '../PixiObject';
import { UI } from '../Utils/TextureLoader';

const cache = PIXI.utils.TextureCache;

const textures: Record<PlayerType, string> = {
  Player1: UI.P1,
  Player2: UI.P2,
  Spectator: UI.SPECTATE,
};

class PlayerButton extends PixiObject {
  boat: PIXI.Container;
  sprite: PIXI.Sprite;
  parent: PlayerButtons;

  type: PlayerType;

  constructor(manager: PixiManager, type: PlayerType, parent: PlayerButtons) {
    super(manager);
    this.parent = parent;
    this.type = type;

    const sprite = new PIXI.Sprite(cache[textures[type]]);
    sprite.pivot.x = sprite.width / 2;
    sprite.x = sprite.width / 2;
    this.sprite = sprite;

    this.boat = new PIXI.Sprite(cache[UI.BOAT]);
    this.boat.x = -this.boat.width - 15;

    this.object.addChild(this.boat, this.sprite);

    this.setInteractive({ mouseover: this.onMouseOver });
  }

  loop() {
    super.loop();

    if (this.parent.selected === this.type) {
      this.sprite.rotation = 0.2 * Math.sin(this.lifetime / 15);

      const scale = 1 + 0.1 * Math.sin(this.lifetime / 20);
      this.sprite.scale.set(scale, scale);
      this.boat.visible = true;
    } else {
      this.sprite.rotation = 0;
      this.sprite.scale.set(1, 1);

      this.boat.visible = false;
    }
  }

  private onMouseOver() {
    this.parent.setSelected(this.type);
  }
}

export class PlayerButtons extends PixiObject {
  selected: PlayerType;

  constructor(manager: PixiManager) {
    super(manager);
    this.selected = PlayerType.Player1;

    const p1 = new PlayerButton(manager, PlayerType.Player1, this);
    const p2 = new PlayerButton(manager, PlayerType.Player2, this);
    const spec = new PlayerButton(manager, PlayerType.Spectator, this);

    const offset = p1.object.height + 10;

    p2.setPosition({ y: offset });
    spec.setPosition({ y: 2 * offset });

    this.addChild(p1, p2, spec);
    this.positionSelf();
  }

  setSelected(type: PlayerType) {
    this.selected = type;
  }

  positionSelf() {
    this.setPosition({
      x: Math.floor(60),
      y: Math.floor(130),
    });
  }
}

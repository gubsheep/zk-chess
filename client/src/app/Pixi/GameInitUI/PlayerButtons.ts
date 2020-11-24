import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { PlayerName } from '../@PixiTypes';
import { PixiObject, Wrapper } from '../PixiObject';
import { UI } from '../Utils/TextureLoader';

const cache = PIXI.utils.TextureCache;

const textures: Record<PlayerName, string> = {
  Alice: UI.P1,
  Bob: UI.P2,
  Spectator: UI.SPECTATE,
};

class PlayerButton extends PixiObject {
  boat: PIXI.Container;
  sprite: PIXI.Sprite;
  parent: PlayerButtons;

  type: PlayerName;

  constructor(manager: PixiManager, type: PlayerName, parent: PlayerButtons) {
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
  selected: PlayerName;

  constructor(manager: PixiManager) {
    super(manager);
    this.selected = PlayerName.Alice;

    const p1 = new PlayerButton(manager, PlayerName.Alice, this);
    const p2 = new PlayerButton(manager, PlayerName.Bob, this);
    const spec = new PlayerButton(manager, PlayerName.Spectator, this);

    const offset = p1.object.height + 10;

    p2.setPosition({ y: offset });
    spec.setPosition({ y: 2 * offset });

    this.addChild(p1, p2, spec);
    this.positionSelf();
  }

  setSelected(type: PlayerName) {
    this.selected = type;
  }

  positionSelf() {
    this.setPosition({
      x: Math.floor(60),
      y: Math.floor(130),
    });
  }
}

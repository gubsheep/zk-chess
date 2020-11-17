import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { VisiblePiece, PieceType } from '../../../_types/global/GlobalTypes';
import { Wrapper } from '../PixiObject';
import { PieceObject } from '../PieceObject';
import { BoardCoords, CanvasCoords } from '../@PixiTypes';
import { boardCoordsFromLoc } from '../PixiUtils';
import { ShipSprite } from './ShipSprite';
import { StatIcon, StatType, STATICON_W } from '../StatIcon';
import { SPRITE_W } from '../TextureLoader';

const waterline = (type: PieceType): number => {
  if (type === PieceType.Submarine_04) return 32;
  else return 28;
};

export class Ship extends PieceObject {
  coords: BoardCoords;

  mask: PIXI.Graphics;
  pieceData: VisiblePiece;

  atkObj: StatIcon;
  hpObj: StatIcon;

  sprite: ShipSprite;

  waterline: PIXI.Graphics;

  constructor(manager: PixiManager, data: VisiblePiece) {
    super(manager, data);

    const atkObj = new StatIcon(manager, StatType.Atk);
    const hpObj = new StatIcon(manager, StatType.Hp);
    this.atkObj = atkObj;
    this.hpObj = hpObj;

    this.addChild(atkObj, hpObj);

    const iconY = 1;
    atkObj.setPosition({ x: SPRITE_W - 2 * STATICON_W - 3, y: iconY });
    hpObj.setPosition({ x: SPRITE_W - STATICON_W, y: iconY });
    this.shipContainer.addChild(atkObj, hpObj);

    this.waterline = new PIXI.Graphics();
    this.object.addChild(this.waterline);

    const hitArea = new PIXI.Rectangle(0, 0, SPRITE_W, SPRITE_W);
    this.setInteractive({
      hitArea,
      mouseover: this.onMouseOver,
      mouseout: this.onMouseOut,
      click: this.onClick,
    });

    const mask = new PIXI.Graphics();
    this.shipContainer.children[0].object.mask = mask;
    this.mask = mask;
    this.updateMask();

    const coords = boardCoordsFromLoc(data.location);
    this.coords = coords;
    this.setLocation(coords);
  }

  setPosition({ x, y }: CanvasCoords) {
    super.setPosition({ x, y });
    this.updateMask();
  }

  private updateMask() {
    const { x, y } = this.object.position;
    const mask = this.mask;
    mask.clear();
    mask.beginFill(0xffffff, 1.0);
    mask.drawRect(x, y, SPRITE_W, waterline(this.getType()));
    mask.endFill();
  }

  onMouseOver() {
    this.manager.mouseManager.setHoveringShip(this);
  }

  onMouseOut() {
    this.manager.mouseManager.setHoveringShip(null);
  }

  onClick() {
    this.manager.mouseManager.shipClicked(this);
  }

  loop() {
    super.loop();

    const { hp, atk } = this.pieceData;
    this.atkObj.setValue(atk);
    this.hpObj.setValue(hp);

    // bob
    this.bob();
  }

  private bob() {
    const frames = 30;
    const boat = this.shipContainer;
    this.waterline.clear();
    if (this.manager.frameCount % (2 * frames) < frames) {
      boat.setPosition({ y: 2 });
      this.waterline.beginFill(0x000000, 0.8);
      this.waterline.drawRect(3, 27, 26, 1);
    } else {
      boat.setPosition({ y: 1 });
      this.waterline.beginFill(0x000000, 0.6);
      this.waterline.drawRect(5, 27, 22, 1);
    }
    this.waterline.endFill();
    this.updateMask();
  }
}

import { PixiManager } from "../../api/PixiManager";
import { VisiblePiece, GameObject, PieceType } from "../../_types/global/GlobalTypes";
import { PieceObject } from "./PieceObject";
import { BoardCoords, CanvasCoords } from "./PixiTypes";
import { boardCoordsFromLoc } from "./PixiUtils";
import { ShipSprite } from "./ShipSprite";
import { StatIcon, StatType, STATICON_W } from "./StatIcon";
import { SPRITE_W } from "./TextureLoader";

const waterline = (type: PieceType): number => {
  if (type === PieceType.Mothership_00) return 28;
  else if (type === PieceType.Submarine_04) return 32;
  else return 25;
};

export class Ship extends PieceObject {
  coords: BoardCoords;

  mask: PIXI.Graphics;
  pieceData: VisiblePiece;

  atkObj: StatIcon;
  hpObj: StatIcon;

  sprite: ShipSprite;

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

    const hitArea = new PIXI.Rectangle(0, 0, SPRITE_W, SPRITE_W);
    this.setInteractive({
      hitArea,
      mouseover: this.onMouseOver,
      mouseout: this.onMouseOut,
      click: this.onClick,
    });

    let mask = new PIXI.Graphics();
    // this.shipContainer.object.mask = mask;
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
    const { x, y } = this.shipContainer.object;
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
    if (this.manager.frameCount % (2 * frames) < frames) {
      boat.setPosition({ y: 2 });
    } else {
      boat.setPosition({ y: 0 });
    }
  }
}
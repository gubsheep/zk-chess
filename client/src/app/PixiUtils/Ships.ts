import * as PIXI from 'pixi.js';
import { PixiManager } from '../../api/PixiManager';
import {
  isKnown,
  isLocatable,
  isZKPiece,
  Piece,
  PieceType,
  VisiblePiece,
  ZKPiece,
} from '../../_types/global/GlobalTypes';
import { GameObject, Wrapper } from './GameObject';
import { BoardCoords, CanvasCoords, PlayerColor } from './PixiTypes';
import { boardCoordsFromLoc } from './PixiUtils';
import { ShipManager } from './ShipManager';
import { ShipSprite } from './ShipSprite';
import { StatIcon, STATICON_W, StatType } from './StatIcon';
import { SPRITE_W } from './TextureLoader';

const waterline = (type: PieceType): number => {
  if (type === PieceType.Mothership_00) return 28;
  else if (type === PieceType.Submarine_04) return 32;
  else return 25;
};

export enum ShipState {
  Summoned,
  Active,
  Moved,
  Attacked,
}

export class PieceObject extends GameObject {
  pieceData: Piece;

  sprite: ShipSprite;
  shipContainer: Wrapper; // just holds the sprite (so we can anchor icons to it)
  container: Wrapper; // holds info about masking, interactability, etc.

  shipManager: ShipManager;

  constructor(manager: PixiManager, data: Piece) {
    super(manager);
    this.shipManager = manager.shipManager;
    this.pieceData = data;

    const { owner } = data;
    const color = manager.api.getColor(owner);

    const sprite = new ShipSprite(manager, this.pieceData.pieceType, color);
    this.sprite = sprite;

    const shipContainer = new Wrapper(manager, new PIXI.Container());
    shipContainer.addChild(sprite);
    this.shipContainer = shipContainer;

    const container = new Wrapper(manager, new PIXI.Container());
    container.addChild(shipContainer);
    this.container = container;

    this.addChild(shipContainer);
  }

  isZk() {
    return isZKPiece(this.pieceData);
  }

  getType(): PieceType {
    return this.pieceData.pieceType;
  }

  isAlive(): boolean {
    return this.pieceData.alive;
  }

  setLocation(coords: BoardCoords) {
    const topLeft = this.manager.gameBoard.getTopLeft(coords);
    this.setPosition(this.calcLoc(topLeft));
  }

  calcLoc({ x, y }: CanvasCoords): CanvasCoords {
    return { x: x + 2, y: y + 2 };
  }

  getCoords(): BoardCoords {
    if (isLocatable(this.pieceData)) {
      return boardCoordsFromLoc(this.pieceData.location);
    } else {
      return { row: -1, col: -1 }; // TODO remove this when you have a good way to deal with invisible commitments
    }
  }
}

export class Ship extends PieceObject {
  coords: BoardCoords;

  mask: PIXI.Graphics;
  pieceData: VisiblePiece;
  shipContainer: GameObject;

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
    this.setActive(this.pieceData.alive);

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

export const SUB_X = 6;
export const SUB_Y = 11;
export const SUB_W = 22;
export const SUB_H = 12;

export class Submarine extends PieceObject {
  constructor(manager: PixiManager, data: ZKPiece) {
    super(manager, data);

    if (isKnown(data)) {
      this.setLocation(boardCoordsFromLoc(data.location));
    } else {
      this.setLocation({ row: 0, col: 0 });
    }
    const hitArea = new PIXI.Rectangle(
      SUB_X - 1,
      SUB_Y - 1,
      SUB_W + 2,
      SUB_H + 2
    );
    this.setInteractive({
      hitArea,
      mouseover: this.onMouseOver,
      mouseout: this.onMouseOut,
      click: this.onClick,
    });
  }
  onMouseOver() {
    this.manager.mouseManager.setHoveringSubmarine(this);
  }

  onMouseOut() {
    this.manager.mouseManager.setHoveringSubmarine(null);
  }

  onClick() {
    this.manager.mouseManager.subClicked(this);
  }

  calcLoc({ x, y }: CanvasCoords): CanvasCoords {
    const idx = this.shipManager.getSubIdx(this);
    const delY = 12 - 8 * idx;
    const sgn = this.manager.api.getOwner(this) === PlayerColor.Red ? 1 : -1;
    const delX = (8 - 2 * idx) * sgn;
    return { x: x + 2 + delX, y: y + 2 + delY };
  }

  loop() {
    super.loop();
    const coords = this.getCoords();
    coords && this.setLocation(coords);

    this.setZIndex(-this.shipManager.getSubIdx(this));
  }
}

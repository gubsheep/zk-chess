import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../api/PixiManager';
import {
  isKnown,
  isLocatable,
  isZKPiece,
  Piece,
  PieceType,
  VisiblePiece,
  ZKPiece,
} from '../../_types/global/GlobalTypes';
import { GameObject } from './GameObject';
import { BoardCoords, CanvasCoords, PlayerColor } from './PixiTypes';
import { boardCoordsFromLoc, Wrapper } from './PixiUtils';
import { ShipManager } from './ShipManager';
import { ShipSprite } from './ShipSprite';
import { TextObject } from './Text';
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

  shipContainer: GameObject;

  shipManager: ShipManager;

  constructor(manager: PixiManager, data: Piece) {
    super(manager);
    this.shipManager = manager.shipManager;

    this.pieceData = data;

    const { owner } = data;
    const color = manager.api.getColor(owner);

    const sprite = new ShipSprite(manager, this.pieceData.pieceType, color);
    this.sprite = sprite;

    const container = new PIXI.Container();
    const shipContainer = new Wrapper(manager, container);
    this.shipContainer = shipContainer;
    shipContainer.addChild(sprite);

    this.addChild(shipContainer);
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
}

export class Ship extends PieceObject {
  coords: BoardCoords;

  mask: PIXI.Graphics;
  pieceData: VisiblePiece;
  shipContainer: GameObject;

  stats: TextObject;

  sprite: ShipSprite;

  constructor(manager: PixiManager, data: VisiblePiece) {
    super(manager, data);

    const stats = new TextObject(manager, '1/1');
    this.stats = stats;

    this.addChild(stats);

    const hitArea = new PIXI.Rectangle(0, 0, SPRITE_W, SPRITE_W);
    this.shipContainer.setInteractive({
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

  getCoords(): BoardCoords {
    return boardCoordsFromLoc(this.pieceData.location);
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
    this.manager.mouseManager.setHoveringShip(this.id);
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
    this.stats.setText(`${atk}/${hp}`);

    // bob
    this.bob();
  }

  private bob() {
    const frames = 30;
    const boat = this.shipContainer.children[0].object;
    if (this.manager.frameCount % (2 * frames) < frames) {
      boat.y = 2;
    } else {
      boat.y = 0;
    }
  }
}

export class Submarine extends PieceObject {
  constructor(manager: PixiManager, data: ZKPiece) {
    super(manager, data);

    if (isKnown(data)) {
      this.setLocation(boardCoordsFromLoc(data.location));
    } else {
      this.setLocation({ row: 0, col: 0 });
    }
  }
  getCoords(): BoardCoords | null {
    if (isLocatable(this.pieceData)) {
      return boardCoordsFromLoc(this.pieceData.location);
    } else {
      return null;
    }
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

    this.setZIndex(this.shipManager.getSubIdx(this));
  }
}

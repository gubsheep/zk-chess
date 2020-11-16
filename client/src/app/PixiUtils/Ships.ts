import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../api/PixiManager';
import { PieceType, VisiblePiece } from '../../_types/global/GlobalTypes';
import { GameObject } from './GameObject';
import { BoardCoords, CanvasCoords } from './PixiTypes';
import { boardCoordsFromLoc, Wrapper } from './PixiUtils';
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

export class Ship extends GameObject {
  coords: BoardCoords;

  hasMoved: boolean;

  mask: PIXI.Graphics;
  pieceData: VisiblePiece;
  shipContainer: GameObject;

  stats: TextObject;

  sprite: ShipSprite;

  constructor(manager: PixiManager, data: VisiblePiece) {
    super(manager, GameZIndex.Ships);

    this.pieceData = data;

    const { location, owner } = data;
    const color = manager.api.getColor(owner);
    const coords = boardCoordsFromLoc(location);

    const container = new PIXI.Container();
    const shipContainer = new Wrapper(manager, container);
    this.shipContainer = shipContainer;

    const stats = new TextObject(manager, '1/1');
    this.stats = stats;

    this.addChild(shipContainer, stats);

    this.hasMoved = false;

    // probably gets rolled up into general props

    const sprite = new ShipSprite(manager, this.pieceData.pieceType, color);
    this.sprite = sprite;

    shipContainer.addChild(sprite);

    const hitArea = new PIXI.Rectangle(0, 0, SPRITE_W, SPRITE_W);
    shipContainer.setInteractive({
      hitArea,
      mouseover: this.onMouseOver,
      mouseout: this.onMouseOut,
      click: this.onClick,
    });

    let mask = new PIXI.Graphics();
    container.mask = mask;
    this.mask = mask;
    this.updateMask();

    this.setCoords(coords);

    this.coords = coords;
  }

  setPosition({ x, y }: CanvasCoords) {
    super.setPosition({ x, y });
    this.updateMask();
  }

  getType(): PieceType {
    return this.pieceData.pieceType;
  }

  isAlive(): boolean {
    return this.pieceData.alive;
  }

  private updateMask() {
    const { x, y } = this.shipContainer.object;
    const mask = this.mask;
    mask.clear();
    mask.beginFill(0xffffff, 1.0);
    mask.drawRect(x, y, SPRITE_W, waterline(this.getType()));
    mask.endFill();
  }

  setCoords(coords: BoardCoords) {
    this.coords = coords;
    const { x, y } = this.manager.gameBoard.getTopLeft(coords);
    this.setPosition({ x: x + 2, y: y + 2 });
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

    const { showZk } = this.manager.mouseManager;

    this.sprite.setAlpha(showZk ? 0.3 : 1);

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

export const RED_MOTHERSHIP_COORDS: BoardCoords = { row: 2, col: 0 };
export const BLUE_MOTHERSHIP_COORDS: BoardCoords = { row: 2, col: 6 };

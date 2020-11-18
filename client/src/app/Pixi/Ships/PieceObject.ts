import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import {
  isLocatable,
  isZKPiece,
  Piece,
  PieceType,
} from '../../../_types/global/GlobalTypes';
import { PixiObject, Wrapper } from '../PixiObject';
import { BoardCoords, CanvasCoords } from '../@PixiTypes';
import { boardCoordsFromLoc } from '../Utils/PixiUtils';
import { ShipManager } from './ShipManager';
import { ShipSprite } from './ShipSprite';
import { OutlineSprite } from './OutlineSprite';
import { ClickState } from '../MouseManager';

export enum ShipState {
  Summoned,
  Active,
  Moved,
  Attacked,
}

export class PieceObject extends PixiObject {
  pieceData: Piece;

  sprite: ShipSprite;
  outlineSprite: OutlineSprite;
  shipContainer: Wrapper; // just holds the sprite (so we can anchor icons to it)
  container: Wrapper; // holds info about masking, interactability, etc.

  shipManager: ShipManager;

  hover: boolean;
  hoverable: boolean;

  constructor(manager: PixiManager, data: Piece) {
    super(manager);
    this.shipManager = manager.shipManager;
    this.pieceData = data;

    this.hover = false;
    this.hoverable = true;

    const { owner } = data;
    const color = manager.api.getColor(owner);

    this.sprite = new ShipSprite(manager, this.pieceData.pieceType, color);
    this.outlineSprite = new OutlineSprite(
      manager,
      this.pieceData.pieceType,
      color
    );

    const shipContainer = new Wrapper(manager, new PIXI.Container());
    shipContainer.addChild(this.outlineSprite, this.sprite);
    this.shipContainer = shipContainer;

    const container = new Wrapper(manager, new PIXI.Container());
    container.addChild(shipContainer);
    this.container = container;

    this.addChild(shipContainer);
  }

  setHoverable(hoverable: boolean) {
    this.hoverable = hoverable;
  }

  setLocation(coords: BoardCoords) {
    const topLeft = this.manager.gameBoard.getTopLeft(coords);
    if (topLeft) {
      this.setPosition(this.calcLoc(topLeft));
    }
  }

  calcLoc(c: CanvasCoords) {
    return c;
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

  isSelected(): boolean {
    const {
      mouseManager: { selectedShip, clickState },
      api,
    } = this.manager;

    if (this.pieceData.id === api.getMyMothership().pieceData.id) {
      return clickState === ClickState.Deploying;
    } else {
      return selectedShip?.pieceData.id === this.pieceData.id;
    }
  }

  getCoords(): BoardCoords {
    if (isLocatable(this.pieceData)) {
      return boardCoordsFromLoc(this.pieceData.location);
    } else {
      return { row: -1, col: -1 }; // TODO remove this when you have a good way to deal with invisible commitments
    }
  }

  loop() {
    super.loop();
    this.setActive(this.pieceData.alive);

    const { api } = this.manager;
    if (this.getType() !== PieceType.Mothership_00) {
      if (api.hasAttacked(this)) {
        this.sprite.setGray(0.4);
      } else if (api.hasMoved(this)) {
        this.sprite.setGray(1.0);
      } else {
        this.sprite.setGray(1);
      }
    }

    if (this.isSelected()) {
      this.outlineSprite.setAlpha(1);
    } else {
      if (this.hoverable) this.outlineSprite.setAlpha(this.hover ? 0.5 : 0);
    }
  }

  onMouseOver() {
    this.hover = true;
  }

  onMouseOut() {
    this.hover = false;
  }
}

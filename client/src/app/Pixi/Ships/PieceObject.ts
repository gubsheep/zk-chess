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

export enum ShipState {
  Summoned,
  Active,
  Moved,
  Attacked,
}

export class PieceObject extends PixiObject {
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

    if (this.getType() !== PieceType.Mothership_00) {
      const { api } = this.manager;
      if (api.hasAttacked(this)) {
        this.sprite.setGray(0.4);
      } else if (api.hasMoved(this)) {
        this.sprite.setGray(1.0);
      } else {
        this.sprite.setGray(1);
      }
    }
  }
}

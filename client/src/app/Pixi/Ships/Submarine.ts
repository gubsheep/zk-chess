import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { ZKPiece, isKnown } from '../../../_types/global/GlobalTypes';
import { CanvasCoords, PlayerColor } from '../@PixiTypes';
import { PieceObject } from './PieceObject';
import { boardCoordsFromLoc } from '../Utils/PixiUtils';
import { Bubble } from '../Utils/Bubble';

export const SUB_X = 6;
export const SUB_Y = 11;
export const SUB_W = 22;
export const SUB_H = 12;

export class Submarine extends PieceObject {
  bubble: Bubble;
  constructor(manager: PixiManager, data: ZKPiece) {
    super(manager, data);

    this.bubble = new Bubble(manager);
    this.shipContainer.addChild(this.bubble);

    if (isKnown(data)) {
      this.setActive(true);
      this.setLocation(boardCoordsFromLoc(data.location));
    } else {
      this.setActive(false);
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
    super.onMouseOver();
    this.manager.mouseManager.setHoveringSubmarine(this);
  }

  onMouseOut() {
    super.onMouseOut();
    this.manager.mouseManager.setHoveringSubmarine(null);
  }

  onClick() {
    if (this.manager.api.isMyTurn()) this.manager.mouseManager.subClicked(this);
  }

  calcLoc({ x, y }: CanvasCoords): CanvasCoords {
    const idx = this.shipManager.getSubIdx(this);
    const delY = 12 - 8 * idx;
    const sgn = this.manager.api.getOwner(this) === PlayerColor.Red ? 1 : -1;
    const delX = (8 - 2 * idx) * sgn;
    return { x: x + 2 + delX, y: y + 2 + delY };
    // return { x: x + 2, y: y + 2 };
  }

  loop() {
    super.loop();
    const coords = this.getCoords();
    coords && this.setLocation(coords);

    this.setZIndex(-this.shipManager.getSubIdx(this));

    this.bob();
  }

  private bob() {
    const { api } = this.manager;
    const frames = api.hasAttacked(this) ? 90 : 45;

    const boat = this.shipContainer;
    if (this.manager.frameCount % frames === 30) {
      this.bubble.tick();
    }
    if (this.manager.frameCount % (2 * frames) < frames) {
      boat.setPosition({ y: 1 });
    } else {
      boat.setPosition({ y: 0 });
    }
  }
}

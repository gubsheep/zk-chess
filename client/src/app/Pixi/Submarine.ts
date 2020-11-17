import * as PIXI from 'pixi.js';
import { PixiManager } from '../../api/PixiManager';
import { ZKPiece, isKnown } from '../../_types/global/GlobalTypes';
import { PieceObject } from './PieceObject';
import { CanvasCoords, PlayerColor } from './@PixiTypes';
import { boardCoordsFromLoc } from './PixiUtils';

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

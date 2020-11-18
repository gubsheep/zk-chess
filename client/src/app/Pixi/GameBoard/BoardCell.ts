import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../../api/PixiManager';
import { PixiObject } from '../PixiObject';
import { CanvasCoords, BoardCoords } from '../@PixiTypes';
import { Ship } from '../Ships/Ship';
import { BoardRect } from './BoardRect';

export const CELL_W = 36;

export enum BoardCellZIndex {
  Rect,
  Objective,
}

export class BoardCell extends PixiObject {
  topLeft: CanvasCoords;
  ship: Ship | null;
  submarines: Ship[];
  idx: BoardCoords;

  constructor(manager: PixiManager, idx: BoardCoords, topLeft: CanvasCoords) {
    super(manager, GameZIndex.UI);

    // TODO refactor these into a single rect
    const rect = new BoardRect(manager, idx);
    this.addChild(rect);

    this.setPosition(topLeft);

    this.setInteractive({
      hitArea: new PIXI.Rectangle(0, 0, CELL_W, CELL_W),
      mouseover: this.onMouseOver,
      mouseout: this.onMouseOut,
      click: this.onClick,
    });

    this.topLeft = topLeft;
    this.ship = null;
    this.idx = idx;
    this.submarines = [];
  }

  private onClick() {
    this.manager.mouseManager.cellClicked(this.idx);
  }

  private onMouseOver() {
    this.manager.mouseManager.setHoveringCell(this.idx);
  }

  private onMouseOut() {
    this.manager.mouseManager.setHoveringCell(null);
  }
}

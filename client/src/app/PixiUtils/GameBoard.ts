import {
  BoardCoords,
  BoxBounds,
  CanvasCoords,
  LineAlignment,
  PlayerColor,
  ShipType,
} from './PixiTypes';
import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../api/PixiManager';
import { GameObject } from './GameObject';
import { Ship } from './Ships';
import { compareBoardCoords, idxsIncludes } from './Utils';
import { ClickState } from './MouseManager';
import { SHIPS, SPRITE_W } from './TextureLoader';
import { playerShader } from './Shaders';

const numX = 7;
const numY = 5;
const CELL_W = 36;
const BORDER = 2;

enum CellZIndex {
  Base,
  Deploy,
}

class StagedShip extends GameObject {
  type: ShipType | null;
  rect: PIXI.Graphics;

  constructor(manager: PixiManager) {
    const container = new PIXI.Container();
    super(manager, container);

    this.type = null;
    const rect = new PIXI.Graphics();

    rect.position.set(2, 2);
    const alphaFilter = new PIXI.filters.AlphaFilter(0.7);
    rect.filters = [playerShader(manager.myColor), alphaFilter];
    container.addChild(rect);

    this.rect = rect;
  }

  loop() {
    const cache = PIXI.utils.TextureCache;
    super.loop();
    this.rect.clear();

    if (this.type === null) return;
    this.rect.beginTextureFill({ texture: cache[SHIPS[this.type]] });
    this.rect.drawRect(0, 0, SPRITE_W, SPRITE_W);
    this.rect.endFill();
  }

  setType(type: ShipType | null) {
    this.type = type;
  }
}

export class BoardCell extends GameObject {
  topLeft: CanvasCoords;
  ship: Ship | null;
  submarines: Ship[];
  idx: BoardCoords;

  deployRect: PIXI.DisplayObject;
  stagedShip: StagedShip;

  constructor(manager: PixiManager, idx: BoardCoords, topLeft: CanvasCoords) {
    const container = new PIXI.Container();
    super(manager, container);

    const rectangle = new PIXI.Graphics();
    rectangle.beginFill(0x222266, 0.4);
    rectangle.drawRect(0, 0, CELL_W, CELL_W);
    rectangle.endFill();
    rectangle.zIndex = CellZIndex.Base;

    const deployRect = new PIXI.Graphics();
    deployRect.beginFill(0xaa7777, 0.8);
    deployRect.lineStyle(2, 0x995555, 0.8, LineAlignment.Inner);
    deployRect.drawRect(0, 0, CELL_W, CELL_W);
    deployRect.endFill();
    rectangle.zIndex = CellZIndex.Deploy;
    deployRect.visible = false;

    const stagedShip = new StagedShip(manager);
    this.stagedShip = stagedShip;

    container.addChild(rectangle, deployRect);
    this.addChild(stagedShip);

    this.setPosition(topLeft);
    this.deployRect = deployRect;

    container.interactive = true;
    container.hitArea = new PIXI.Rectangle(0, 0, CELL_W, CELL_W);
    container
      .on('mouseover', this.onMouseOver)
      .on('mouseout', this.onMouseOut)
      .on('click', this.onClick);

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

  loop() {
    super.loop();
    const {
      mouseManager: { clickState, deployStaged, deployIdxs, deployType },
    } = this.manager;

    this.deployRect.visible =
      clickState === ClickState.Deploying && idxsIncludes(deployIdxs, this.idx);
    this.stagedShip.setType(
      compareBoardCoords(this.idx, deployStaged) ? deployType : null
    );
  }
}

export class GameBoard extends GameObject {
  cells: BoardCell[][];
  bounds: BoxBounds;

  constructor(manager: PixiManager) {
    const container = new PIXI.Container();
    const grid: (BoardCell | null)[][] = [...Array(numY)].map((_e) =>
      Array(numX).map(() => null)
    );

    super(manager, container, GameZIndex.Board);

    for (let i = 0; i < numY; i++) {
      for (let j = 0; j < numX; j++) {
        const idx: BoardCoords = { row: i, col: j };
        const x = idx.col * CELL_W + (idx.col - 1) * BORDER;
        const y = idx.row * CELL_W + (idx.row - 1) * BORDER;

        const cell = new BoardCell(manager, idx, { x, y });
        grid[i][j] = cell;
        this.addChild(cell);
      }
    }

    this.cells = grid as BoardCell[][];
    this.positionSelf();
  }

  at({ row, col }: BoardCoords): BoardCell | null {
    return this.cells[row][col] || null;
  }

  getTopLeft({ row, col }: BoardCoords): CanvasCoords {
    const cell = this.cells[row][col];
    if (cell) {
      return this.object.toGlobal(cell.topLeft);
    } else {
      console.error('array out of bounds on grid');
      return { x: 0, y: 0 };
    }
  }

  positionSelf() {
    const { width, height } = this.manager.app.renderer;
    const sumW = (BORDER + CELL_W) * numX - BORDER;
    const sumH = (BORDER + CELL_W) * numY - BORDER;

    const x = Math.floor((width - sumW) / 2);
    const y = Math.floor((height - sumH) / 2) - 20;

    this.setPosition({ x, y });

    this.bounds = { left: x, top: y, right: x + sumW, bottom: y + sumH };
  }
}

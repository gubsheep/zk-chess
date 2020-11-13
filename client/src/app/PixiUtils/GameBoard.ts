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
import { compareBoardCoords, idxsIncludes, makeRect } from './Utils';
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
  Move,
  Attack,
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
  moveRect: PIXI.DisplayObject;
  attackRect: PIXI.DisplayObject;

  stagedShip: StagedShip;

  constructor(manager: PixiManager, idx: BoardCoords, topLeft: CanvasCoords) {
    const container = new PIXI.Container();
    super(manager, container);

    const rectangle = makeRect(CELL_W, CELL_W, 0x222266, 0.4);
    rectangle.zIndex = CellZIndex.Base;

    const depRect = makeRect(CELL_W, CELL_W, 0xaa7777, 0.8, 0x995555, 2, 0.8);
    depRect.zIndex = CellZIndex.Deploy;
    depRect.visible = false;
    this.deployRect = depRect;

    const movRect = makeRect(CELL_W, CELL_W, 0x7777bb, 0.8, 0x555599, 2, 0.8);
    movRect.zIndex = CellZIndex.Move;
    movRect.visible = false;
    this.moveRect = movRect;

    const atkRect = makeRect(CELL_W, CELL_W, 0xaa7777, 0.8, 0x995555, 2, 0.8);
    atkRect.zIndex = CellZIndex.Attack;
    atkRect.visible = false;
    this.attackRect = atkRect;

    const stagedShip = new StagedShip(manager);
    this.stagedShip = stagedShip;

    container.addChild(rectangle, depRect, movRect, atkRect);
    this.addChild(stagedShip);

    this.setPosition(topLeft);

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
      mouseManager: {
        clickState,
        deployStaged,
        deployIdxs,
        deployType,
        moveIdxs,
        moveAttackIdxs,
        moveStaged,
        selectedShip,
      },
    } = this.manager;

    this.deployRect.visible =
      clickState === ClickState.Deploying && idxsIncludes(deployIdxs, this.idx);
    this.moveRect.visible =
      clickState === ClickState.Moving && idxsIncludes(moveIdxs, this.idx);

    this.attackRect.visible =
      !this.moveRect.visible &&
      clickState === ClickState.Moving &&
      idxsIncludes(moveAttackIdxs, this.idx);

    if (clickState === ClickState.Deploying) {
      const show = compareBoardCoords(this.idx, deployStaged);
      this.stagedShip.setType(show ? deployType : null);
    } else if (clickState === ClickState.Moving) {
      const show = compareBoardCoords(this.idx, moveStaged);
      this.stagedShip.setType(selectedShip && show ? selectedShip.type : null);
    } else {
      // none
      this.stagedShip.setType(null);
    }
  }
}

export class GameBoard extends GameObject {
  cells: BoardCell[][];
  bounds: BoxBounds;

  width: number;
  height: number;

  constructor(manager: PixiManager) {
    const container = new PIXI.Container();
    super(manager, container, GameZIndex.Board);

    this.width = numX;
    this.height = numY;

    const grid: (BoardCell | null)[][] = [...Array(this.height)].map((_e) =>
      Array(this.width).map(() => null)
    );

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

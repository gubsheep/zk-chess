import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { PieceType } from '../../../_types/global/GlobalTypes';
import { GameObject } from '../GameObject';
import { ClickState } from '../MouseManager';
import { CanvasCoords, BoardCoords } from '../PixiTypes';
import { makeRect, idxsIncludes, compareBoardCoords } from '../PixiUtils';
import { playerShader } from '../Shaders';
import { Ship } from '../Ships';
import { SHIPS, SPRITE_W } from '../TextureLoader';

enum CellZIndex {
  Base,
  Deploy,
  Move,
  Attack,
  Target,
}

class StagedShip extends GameObject {
  type: PieceType | null;
  rect: PIXI.Graphics;

  constructor(manager: PixiManager) {
    super(manager);
    const container = this.object;

    this.type = null;
    const rect = new PIXI.Graphics();

    rect.position.set(2, 2);
    const alphaFilter = new PIXI.filters.AlphaFilter(0.7);
    rect.filters = [playerShader(manager.api.getMyColor()), alphaFilter];
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

  setType(type: PieceType | null) {
    this.type = type;
  }
}

export const CELL_W = 36;

export class BoardCell extends GameObject {
  topLeft: CanvasCoords;
  ship: Ship | null;
  submarines: Ship[];
  idx: BoardCoords;

  deployRect: PIXI.DisplayObject;
  moveRect: PIXI.DisplayObject;
  attackRect: PIXI.DisplayObject;
  targetRect: PIXI.DisplayObject;

  stagedShip: StagedShip;

  constructor(manager: PixiManager, idx: BoardCoords, topLeft: CanvasCoords) {
    super(manager);
    const container = this.object;

    // TODO refactor these into a single rect
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

    const target = makeRect(CELL_W, CELL_W, 0x995555, 0.8, 0x663333, 2, 0.8);
    target.zIndex = CellZIndex.Target;
    target.visible = false;
    this.targetRect = target;

    const stagedShip = new StagedShip(manager);
    this.stagedShip = stagedShip;

    container.addChild(rectangle, depRect, movRect, atkRect, target);
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
        attackStaged,
      },
    } = this.manager;

    this.deployRect.visible =
      clickState === ClickState.Deploying && idxsIncludes(deployIdxs, this.idx);
    this.moveRect.visible =
      clickState === ClickState.Acting && idxsIncludes(moveIdxs, this.idx);

    this.attackRect.visible =
      !this.moveRect.visible &&
      clickState === ClickState.Acting &&
      idxsIncludes(moveAttackIdxs, this.idx);

    this.targetRect.visible =
      clickState === ClickState.Acting &&
      compareBoardCoords(attackStaged, this.idx);

    if (clickState === ClickState.Deploying) {
      const show = compareBoardCoords(this.idx, deployStaged);
      this.stagedShip.setType(show ? deployType : null);
    } else if (clickState === ClickState.Acting) {
      const show = compareBoardCoords(this.idx, moveStaged);
      this.stagedShip.setType(selectedShip && show ? selectedShip.type : null);
    } else {
      // none
      this.stagedShip.setType(null);
    }
  }
}

import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { BoardCoords, LineAlignment } from '../@PixiTypes';
import { ClickState } from '../MouseManager';
import { PixiObject } from '../PixiObject';
import { compareBoardCoords, idxsIncludes } from '../Utils/PixiUtils';
import { BoardCellZIndex, CELL_W } from './BoardCell';

const DARK_BLUE = [0x4444aa, 0.8]; // selected
const BLUE = [0x7777bb, 0.8]; // move
const BASE = [0x222266, 0.4];

const RED = [0xaa7777, 0.8]; // deploy, atk
const DARKER_RED = [0x663344, 0.8]; // target

export class BoardRect extends PixiObject {
  rect: PIXI.Graphics;
  idx: BoardCoords;
  constructor(manager: PixiManager, idx: BoardCoords) {
    super(manager);
    this.setZIndex(BoardCellZIndex.Rect);
    this.idx = idx;

    const rect = new PIXI.Graphics();
    this.object.addChild(rect);

    this.rect = rect;
  }

  loop() {
    super.loop();

    const {
      mouseManager: {
        clickState,
        deployIdxs,
        moveIdxs,
        moveAttackIdxs,
        attackIdxs,
        attackStaged,
        selectedShip,
        stagedSpellTarget,
      },
      api,
    } = this.manager;

    this.rect.clear();
    let fill = [0, 0];
    let stroke = [0x000000, 0.2];

    const shipAt = api.shipAt(this.idx);
    const enemyShipAt = shipAt && !api.ownedByMe(shipAt);

    const isZk =
      selectedShip?.isZk() &&
      compareBoardCoords(selectedShip.getCoords(), this.idx);

    const spellTarget = clickState === ClickState.Casting && !!shipAt;

    const spell =
      clickState === ClickState.Casting &&
      compareBoardCoords(stagedSpellTarget, this.idx);

    const deploy =
      clickState === ClickState.Deploying && idxsIncludes(deployIdxs, this.idx);
    const move =
      clickState === ClickState.Acting && idxsIncludes(moveIdxs, this.idx);

    const zkAtk = enemyShipAt;

    const movAtk =
      clickState === ClickState.Acting &&
      idxsIncludes(
        moveAttackIdxs.map((el) => el.attack),
        this.idx
      );

    const atk =
      clickState === ClickState.Acting && idxsIncludes(attackIdxs, this.idx);

    const notzkAtk = !move && (atk || movAtk);

    const target =
      enemyShipAt &&
      clickState === ClickState.Acting &&
      compareBoardCoords(attackStaged, this.idx);

    const selected =
      selectedShip && compareBoardCoords(selectedShip.getCoords(), this.idx);

    if (selected) {
      fill = DARK_BLUE;
    } else if (spell) {
      fill = DARKER_RED;
    } else if (spellTarget) {
      fill = RED;
    } else if (deploy) {
      fill = RED;
    } else if (target) {
      fill = DARKER_RED;
    } else if (!isZk && notzkAtk) {
      fill = RED;
    } else if (isZk && zkAtk) {
      fill = RED;
    } else if (move) {
      fill = BLUE;
    } else {
      fill = BASE;
      stroke = [0, 0];
    }

    this.rect.beginFill(...fill);
    this.rect.lineStyle(2, stroke[0], stroke[1], LineAlignment.Inner);

    this.rect.drawRect(0, 0, CELL_W, CELL_W);
    this.rect.endFill();
  }
}

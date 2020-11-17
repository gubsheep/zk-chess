import { Link } from 'react-router-dom';
import { PixiManager, GameZIndex } from '../../../api/PixiManager';
import { PieceType } from '../../../_types/global/GlobalTypes';
import { CHAR_H, LINE_SPACING } from '../../Pixi/Utils/FontLoader';
import { PixiObject } from '../PixiObject';
import { LinkObject, TextAlign } from '../Text';
import { GameGrid } from './GameGrid';
import { GameBoardObject } from './GridObject';

// TODO make a GridObject class?
export class ConfirmCancelButtons extends GameBoardObject {
  confirm: LinkObject;
  moveSub: LinkObject;
  atkSub: LinkObject;

  constructor(manager: PixiManager, grid: GameGrid) {
    super(manager, grid);

    const confirm = new LinkObject(
      manager,
      'Confirm',
      this.onConfirm,
      TextAlign.Right
    );
    this.confirm = confirm;

    const moveSub = new LinkObject(
      manager,
      'Move Sub',
      this.onMove,
      TextAlign.Right
    );
    this.moveSub = moveSub;

    const atkSub = new LinkObject(
      manager,
      'Strike!',
      this.onStrike,
      TextAlign.Right
    );
    this.atkSub = atkSub;

    const cancel = new LinkObject(
      manager,
      'Cancel',
      this.onCancel,
      TextAlign.Right
    );
    cancel.setPosition({ x: 0, y: CHAR_H + LINE_SPACING });

    this.addChild(cancel, confirm, atkSub, moveSub);
  }

  private onCancel() {
    this.manager.mouseManager.cancel();
  }

  private onConfirm() {
    this.manager.mouseManager.confirm();
  }

  private onMove() {
    this.manager.mouseManager.moveSub();
  }

  private onStrike() {
    this.manager.mouseManager.attackSub();
  }

  loop() {
    super.loop();

    const { selectedShip, moveStaged } = this.manager.mouseManager;

    const isZk = selectedShip && selectedShip.isZk();

    this.confirm.setActive(!isZk);
    this.moveSub.setActive(!!(isZk && moveStaged));
    this.atkSub.setActive(!!(isZk && !moveStaged));
  }

  positionGrid(gridW: number, gridH: number) {
    this.setPosition({
      y: gridH + 2,
      x: gridW - 2,
    });
  }
}

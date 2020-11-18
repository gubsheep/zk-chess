import { Link } from 'react-router-dom';
import { PixiManager, GameZIndex } from '../../../api/PixiManager';
import { PieceType } from '../../../_types/global/GlobalTypes';
import { CHAR_H, LINE_SPACING } from '../Utils/FontLoader';
import { PixiObject } from '../PixiObject';
import { GameGrid } from './GameGrid';
import { GameBoardObject } from './GridObject';
import { TextAlign } from '../Utils/TextObject';
import { LinkObject } from '../Utils/LinkObject';
import { ConfirmButton } from './ConfirmButton';
import { MoveSubButton } from './MoveSubButton';
import { StrikeButton } from './StrikeButton';
import { CancelButton } from './CancelButton';

// TODO make a GridObject class?
export class ConfirmCancelButtons extends GameBoardObject {
  confirm: LinkObject;
  moveSub: LinkObject;
  atkSub: LinkObject;

  constructor(manager: PixiManager, grid: GameGrid) {
    super(manager, grid);

    this.confirm = new ConfirmButton(manager);
    this.moveSub = new MoveSubButton(manager);
    this.atkSub = new StrikeButton(manager);
    const cancel = new CancelButton(manager);

    cancel.setPosition({ x: 0, y: CHAR_H + LINE_SPACING });

    this.addChild(cancel, this.confirm, this.atkSub, this.moveSub);
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

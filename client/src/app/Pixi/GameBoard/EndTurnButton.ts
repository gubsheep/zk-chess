import { PixiManager } from '../../../api/PixiManager';
import { CHAR_H } from '../Utils/FontLoader';
import { LinkObject } from '../Utils/LinkObject';
import { TextAlign } from '../Utils/Text';
import { GameGrid } from './GameGrid';
import { GameBoardObject } from './GridObject';

class EndTurnText extends LinkObject {
  constructor(manager: PixiManager) {
    super(manager, 'End Turn', TextAlign.Right);
  }

  onClick() {
    this.manager.mouseManager.endTurn();
  }

  isEnabled(): boolean {
    return this.manager.api.isMyTurn();
  }
}

export class EndTurnButton extends GameBoardObject {
  constructor(manager: PixiManager, grid: GameGrid) {
    super(manager, grid);
    this.addChild(new EndTurnText(manager));
  }

  positionGrid(gridW: number, _gridH: number) {
    this.setPosition({
      y: -CHAR_H - 6,
      x: gridW - 2,
    });
  }
}

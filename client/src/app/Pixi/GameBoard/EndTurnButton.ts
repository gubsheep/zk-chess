import { PixiManager } from '../../../api/PixiManager';
import { CHAR_H } from '../Utils/FontLoader';
import { LinkObject, TextAlign } from '../Utils/Text';
import { GameGrid } from './GameGrid';
import { GameBoardObject } from './GridObject';

export class EndTurnButton extends GameBoardObject {
  constructor(manager: PixiManager, grid: GameGrid) {
    super(manager, grid);

    const endTurn = new LinkObject(
      manager,
      'End Turn',
      this.endTurn,
      TextAlign.Right
    );

    this.addChild(endTurn);
  }

  positionGrid(gridW: number, _gridH: number) {
    this.setPosition({
      y: -CHAR_H - 6,
      x: gridW - 2,
    });
  }

  private endTurn() {
    this.manager.mouseManager.endTurn();
  }
}

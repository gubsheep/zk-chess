import { PixiManager } from '../../api/PixiManager';
import { BoardCell } from './GameBoard';
import { BoardCoords, ShipType } from './PixiTypes';
import { Ship } from './Ships';
import { idxsIncludes } from './Utils';

export enum ClickState {
  None,
  Deploying,
  Moving,
  Attacking,
}

export class MouseManager {
  clickState: ClickState;
  manager: PixiManager;

  hoveringCell: BoardCoords | null;
  hoveringShip: Ship;

  deployType: ShipType | null;
  deployIdxs: BoardCoords[];
  deployStaged: BoardCoords | null;

  constructor(manager: PixiManager) {
    this.clickState = ClickState.None;
    this.manager = manager;
  }

  private setClickState(state: ClickState) {
    if (state !== ClickState.Deploying) {
      this.deployType = null;
      this.deployIdxs = [];
      this.deployStaged = null;
    }
    this.clickState = state;
  }

  // to help with managing events
  setHoveringCell(cell: BoardCoords | null) {
    this.hoveringCell = cell;
  }

  setHoveringShip(ship: Ship) {
    this.hoveringShip = ship;
  }

  // callable events
  buyShip(type: ShipType) {
    if (type === ShipType.Mothership_00) {
      console.error('cant buy a mothership');
      return;
    }

    this.setClickState(ClickState.Deploying);
    this.deployType = type;

    const { myMothership: mothership } = this.manager;
    const { row: my, col: mx } = mothership.coords;
    this.deployIdxs = [
      { row: my + 1, col: mx },
      { row: my - 1, col: mx },
      { row: my, col: mx + 1 },
      { row: my, col: mx - 1 },
    ];

    console.log('bought a ship!');
  }

  cellClicked(idx: BoardCoords) {
    if (this.clickState === ClickState.Deploying) {
      if (idxsIncludes(this.deployIdxs, idx)) {
        this.deployStaged = idx;
      }
    }
  }
}

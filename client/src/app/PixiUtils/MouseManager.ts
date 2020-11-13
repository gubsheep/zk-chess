import { PixiManager } from '../../api/PixiManager';
import { BoardCoords, ShipType } from './PixiTypes';
import { Ship } from './Ships';
import { compareBoardCoords, idxsIncludes } from './Utils';

export enum ClickState {
  None,
  Deploying,
  Moving,
  Attacking,
}

export class MouseManager {
  clickState: ClickState = ClickState.None;
  manager: PixiManager;

  hoveringCell: BoardCoords | null = null;
  hoveringShip: number | null = null;

  deployType: ShipType | null = null;
  deployIdxs: BoardCoords[] = [];
  deployStaged: BoardCoords | null = null;

  selectedShip: Ship | null = null;
  moveIdxs: BoardCoords[] = [];
  moveAttackIdxs: BoardCoords[] = [];
  moveStaged: BoardCoords | null = null;

  constructor(manager: PixiManager) {
    this.manager = manager;
  }

  private clearDeploy() {
    this.deployType = null;
    this.deployIdxs = [];
    this.deployStaged = null;
  }

  private clearMove() {
    this.moveStaged = null;
    this.moveIdxs = [];
    this.moveAttackIdxs = [];
  }

  private setClickState(state: ClickState) {
    this.clearDeploy();
    this.clearMove();
    this.clickState = state;
  }

  // to help with managing events
  setHoveringCell(cell: BoardCoords | null) {
    this.hoveringCell = cell;
  }

  setHoveringShip(id: number | null) {
    this.hoveringShip = id;
  }

  // callable events
  confirm() {
    if (this.clickState === ClickState.Deploying) {
      if (this.deployStaged && this.deployType) {
        this.manager.gameApi.deployShip(this.deployType, this.deployStaged);
      } else console.error('something went wrong in confirm');
    } else if (this.clickState === ClickState.Moving) {
      if (this.selectedShip && this.moveStaged) {
        this.manager.gameApi.moveShip(this.selectedShip, this.moveStaged);
      } else console.error('something went wrong in confirm');
    }

    this.setClickState(ClickState.None);
  }

  cancel() {
    this.setClickState(ClickState.None);
  }

  buyShip(type: ShipType) {
    if (type === ShipType.Mothership_00) {
      console.error('cant buy a mothership');
      return;
    }

    this.setClickState(ClickState.Deploying);

    this.deployType = type;

    const { myMothership: mothership } = this.manager;
    const { row: my, col: mx } = mothership.coords;
    const deployIdxs = [
      { row: my + 1, col: mx },
      { row: my - 1, col: mx },
      { row: my, col: mx + 1 },
      { row: my, col: mx - 1 },
    ];
    for (let i = 0; i < deployIdxs.length; i++) {
      const loc = deployIdxs[i];
      for (const piece of this.manager.pieces) {
        if (compareBoardCoords(piece.coords, loc)) deployIdxs.splice(i--, 1);
      }
    }

    this.deployIdxs = deployIdxs;
  }

  cellClicked(idx: BoardCoords) {
    if (this.clickState === ClickState.Deploying) {
      if (idxsIncludes(this.deployIdxs, idx)) {
        this.deployStaged = idx;
      }
    } else if (this.clickState === ClickState.Moving) {
      if (idxsIncludes(this.moveIdxs, idx)) {
        this.moveStaged = idx;
      }
    }
  }

  shipClicked(ship: Ship) {
    if (ship.type === ShipType.Mothership_00) return;

    const { gameApi: api } = this.manager;
    if (this.clickState === ClickState.None) {
      this.setClickState(ClickState.Moving);
      this.selectedShip = ship;

      this.moveIdxs = api.findMoves(ship.type, ship.coords);
      this.moveAttackIdxs = api.findAttacksWithMove(ship.type, ship.coords);

      console.log(this.moveAttackIdxs);
      console.log(this.moveIdxs);
    }
  }
}

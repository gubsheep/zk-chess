import { PixiManager } from '../../api/PixiManager';
import { PieceType } from '../../_types/global/GlobalTypes';
import { BoardCoords } from './PixiTypes';
import { Ship, ShipState } from './Ships';
import { compareBoardCoords, idxsIncludes } from './PixiUtils';

export enum ClickState {
  None,
  Deploying,
  Acting,
}

export class MouseManager {
  clickState: ClickState = ClickState.None;
  manager: PixiManager;

  hoveringCell: BoardCoords | null = null;
  hoveringShip: number | null = null;

  deployType: PieceType | null = null;
  deployIdxs: BoardCoords[] = [];
  deployStaged: BoardCoords | null = null;

  selectedShip: Ship | null = null;
  moveIdxs: BoardCoords[] = [];
  moveAttackIdxs: BoardCoords[] = [];
  moveStaged: BoardCoords | null = null;
  attackStaged: BoardCoords | null = null;

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
    this.attackStaged = null;
    this.moveIdxs = [];
    this.moveAttackIdxs = [];
  }

  private clearAll() {
    this.clearDeploy();
    this.clearMove();
  }

  private setClickState(state: ClickState) {
    this.clearAll();
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
        this.manager.api.deploy(this.deployType, this.deployStaged);
      } else console.error('something went wrong in confirm');
    } else if (this.clickState === ClickState.Acting) {
      if (this.selectedShip && this.attackStaged) {
        this.manager.api.attack(this.selectedShip, this.attackStaged);
      } else if (this.selectedShip && this.moveStaged) {
        this.manager.api.move(this.selectedShip, this.moveStaged);
      } else console.error('something went wrong in confirm');
    }

    this.setClickState(ClickState.None);
  }

  cancel() {
    this.setClickState(ClickState.None);
  }

  endTurn() {
    this.manager.api.endTurn();
  }

  buyShip(type: PieceType) {
    if (type === PieceType.Mothership_00) {
      console.error('cant buy a mothership');
      return;
    }

    this.setClickState(ClickState.Deploying);

    this.deployType = type;

    const mothership = this.manager.api.getMyMothership();
    const { row: my, col: mx } = mothership.coords;
    const deployIdxs = [
      { row: my + 1, col: mx },
      { row: my - 1, col: mx },
      { row: my, col: mx + 1 },
      { row: my, col: mx - 1 },
    ];
    for (let i = 0; i < deployIdxs.length; i++) {
      const loc = deployIdxs[i];
      for (const piece of this.manager.ships) {
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
    } else if (this.clickState === ClickState.Acting) {
      // first, check if there is an enemy boat
      const ship = this.manager.api.shipAt(idx);
      if (ship && idxsIncludes(this.moveAttackIdxs, idx)) {
        this.attackStaged = idx;
        this.moveStaged = null;
      } else if (idxsIncludes(this.moveIdxs, idx)) {
        this.attackStaged = null;
        this.moveStaged = idx;
      }
    }
  }

  shipClicked(ship: Ship) {
    const type = ship.getType();
    if (type === PieceType.Mothership_00) return;

    const { api: api } = this.manager;
    if (api.hasAttacked(ship)) return;

    if (this.clickState === ClickState.None) {
      // initiate ship movement
      this.setClickState(ClickState.Acting);
      this.selectedShip = ship;

      if (!api.hasMoved(ship)) {
        this.moveIdxs = api.findMoves(type, ship.coords);
        this.moveAttackIdxs = api.findAttacksWithMove(type, ship.coords);
      } else {
        this.moveIdxs = [];
        this.moveAttackIdxs = api.findAttacks(type, ship.coords);
      }
    }

    // bubble the event
    this.cellClicked(ship.coords);
  }
}

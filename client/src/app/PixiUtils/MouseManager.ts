import { PixiManager } from '../../api/PixiManager';
import { PieceType } from '../../_types/global/GlobalTypes';
import { BoardCoords, MoveAttack } from './PixiTypes';
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

  selectedShip: Ship | null = null;

  deployType: PieceType | null = null;
  deployIdxs: BoardCoords[] = [];
  deployStaged: BoardCoords | null = null;

  moveIdxs: BoardCoords[] = [];
  moveAttackIdxs: MoveAttack[] = [];
  attackIdxs: BoardCoords[] = [];

  moveStaged: BoardCoords | null = null;
  attackStaged: BoardCoords | null = null;

  constructor(manager: PixiManager) {
    this.manager = manager;
  }

  private clearStaged() {
    this.deployType = null;
    this.deployIdxs = [];
    this.deployStaged = null;
    this.attackStaged = null;
    this.moveStaged = null;
  }

  private clearSelected() {
    this.moveIdxs = [];
    this.moveAttackIdxs = [];
    this.attackIdxs = [];
    this.selectedShip = null;
  }

  private clearAll() {
    this.clearStaged();
    this.clearSelected();
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
      if (this.selectedShip && this.moveStaged) {
        this.manager.api.move(this.selectedShip, this.moveStaged);
      }

      console.log(this.selectedShip, this.attackStaged);
      if (this.selectedShip && this.attackStaged) {
        const selectedShip = this.selectedShip;
        const attackStaged = this.attackStaged;
        setTimeout(() => {
          console.log(selectedShip, attackStaged);
          this.manager.api.attack(selectedShip, attackStaged);
        }, 1000);
      }
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

  private canAttackFromStaged(target: BoardCoords) {
    const {
      selectedShip: selected,
      moveStaged,
      manager: { api },
    } = this;

    return (
      moveStaged &&
      selected &&
      api.canAttack(selected.getType(), moveStaged, target)
    );
  }

  cellClicked(idx: BoardCoords) {
    // this.clearStaged();
    const { api } = this.manager;
    if (this.clickState === ClickState.Deploying) {
      if (idxsIncludes(this.deployIdxs, idx)) {
        this.deployStaged = idx;
      }
    } else if (this.clickState === ClickState.Acting) {
      // first, check if there is an enemy boat
      const ship = api.shipAt(idx);
      console.log(ship, this.moveAttackIdxs, idx);
      if (ship) {
        // there's an enemy boat, and I can reach it
        if (idxsIncludes(this.attackIdxs, idx)) {
          this.attackStaged = idx;
          if (!this.canAttackFromStaged(idx)) this.moveStaged = null;
          return;
        }
        for (const movAtk of this.moveAttackIdxs) {
          if (compareBoardCoords(movAtk.attack, idx)) {
            // there's an enemy boat, but i can't reach it
            this.attackStaged = movAtk.attack;
            // if i can reach it from the current staged loc, don't change move
            if (!this.canAttackFromStaged(movAtk.attack)) {
              this.moveStaged = movAtk.move;
            }
            return;
          }
        }
      } else if (idxsIncludes(this.moveIdxs, idx)) {
        // there is no enemy boat, but you clicked a move cell
        this.attackStaged = null;
        this.moveStaged = idx;
      }
    }
  }

  private setSelected(ship: Ship) {
    this.setClickState(ClickState.Acting);
    const type = ship.getType();
    const { api } = this.manager;
    this.selectedShip = ship;

    this.attackIdxs = api.findAttacks(type, ship.coords);
    if (!api.hasMoved(ship)) {
      console.log('setting moves');
      this.moveIdxs = api.findMoves(type, ship.coords);
      this.moveAttackIdxs = api.findMoveAttacks(type, ship.coords);
    } else {
      this.moveIdxs = [];
      this.moveAttackIdxs = [];
    }
  }

  shipClicked(ship: Ship) {
    const { api } = this.manager;
    const type = ship.getType();
    if (api.ownedByMe(ship)) {
      if (type === PieceType.Mothership_00) return;
      if (api.hasAttacked(ship)) return;
      if (
        this.clickState === ClickState.None ||
        this.clickState === ClickState.Acting
      ) {
        // initiate ship actions
        this.setSelected(ship);
      }
    }

    // bubble the event
    this.cellClicked(ship.coords);
  }
}

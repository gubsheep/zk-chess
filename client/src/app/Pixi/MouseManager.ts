import { PixiManager } from '../../api/PixiManager';
import { PieceType } from '../../_types/global/GlobalTypes';
import { PieceObject } from './Ships/PieceObject';
import { BoardCoords, MoveAttack } from './@PixiTypes';
import { compareBoardCoords, idxsIncludes } from './Utils/PixiUtils';
import { Ship } from './Ships/Ship';
import { Submarine } from './Ships/Submarine';
import { InitState } from '../../api/GameAPI';

export enum ClickState {
  None,
  Deploying,
  Acting,
}

export class MouseManager {
  showZk: boolean = false;

  clickState: ClickState = ClickState.None;
  manager: PixiManager;

  hoveringCell: BoardCoords | null = null;
  hoveringShip: Ship | null = null;
  hoveringSub: Submarine | null = null;

  selectedShip: PieceObject | null = null;

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

  setClickState(state: ClickState) {
    this.clearAll();
    this.clickState = state;
  }

  // setters
  setShowZk(showZk: boolean) {
    this.showZk = showZk;
  }

  // to help with managing events
  setHoveringCell(cell: BoardCoords | null) {
    this.hoveringCell = cell;
  }

  setHoveringShip(ship: Ship | null) {
    this.hoveringShip = ship;
  }

  setHoveringSubmarine(sub: Submarine | null) {
    this.hoveringSub = sub;
  }

  // callable events
  confirm() {
    const {
      selectedShip,
      deployStaged,
      deployType,
      clickState,
      moveStaged,
      attackStaged,
      manager: { api },
    } = this;

    // const isSub = selectedShip && selectedShip.isZk();
    // const isShip = selectedShip && !selectedShip.isZk();

    if (clickState === ClickState.Deploying) {
      if (deployStaged && deployType) {
        api.deploy(deployType, deployStaged);
      } else console.error('something went wrong in confirm');
    } else if (clickState === ClickState.Acting && selectedShip) {
      if (selectedShip && moveStaged && attackStaged) {
        api.moveAttack(selectedShip, moveStaged, attackStaged);
      } else if (selectedShip && moveStaged) {
        api.move(selectedShip, moveStaged);
      } else if (selectedShip && attackStaged) {
        api.attack(selectedShip, attackStaged);
      }
    }

    this.setClickState(ClickState.None);
  }

  moveSub(): void {
    const {
      selectedShip,
      moveStaged,
      clickState,
      manager: { api },
    } = this;

    if (
      clickState === ClickState.Acting &&
      selectedShip &&
      selectedShip.isZk() &&
      moveStaged
    ) {
      api.move(selectedShip, moveStaged);
    } else {
      console.error('error with moving sub');
    }

    this.setClickState(ClickState.None);
  }

  attackSub(): void {
    const {
      selectedShip,
      clickState,
      manager: { api },
      moveStaged,
    } = this;

    if (
      clickState === ClickState.Acting &&
      selectedShip &&
      selectedShip.isZk() &&
      !moveStaged
    ) {
      api.attack(selectedShip, selectedShip.getCoords());
    } else {
      console.error('error with moving sub');
    }
    this.setClickState(ClickState.None);
  }

  cancel() {
    this.setClickState(ClickState.None);
  }

  endTurn() {
    this.manager.api.endTurn();
    this.setClickState(ClickState.None);
  }

  buyShip(type: PieceType) {
    if (type === PieceType.Mothership_00) {
      console.error('cant buy a mothership');
      return;
    }

    this.setClickState(ClickState.Deploying);

    this.deployType = type;

    const mothership = this.manager.api.getMyMothership();
    if (!mothership) return;

    const { row: my, col: mx } = mothership.coords;
    const deployIdxs = [
      { row: my + 1, col: mx },
      { row: my - 1, col: mx },
      { row: my, col: mx + 1 },
      { row: my, col: mx - 1 },
    ];

    if (type !== PieceType.Submarine_04) {
      for (let i = 0; i < deployIdxs.length; i++) {
        const loc = deployIdxs[i];
        for (const piece of this.manager.shipManager.ships) {
          if (piece.isAlive() && compareBoardCoords(piece.coords, loc))
            deployIdxs.splice(i--, 1);
        }
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

  private setSelected(ship: PieceObject | null) {
    if (ship === null) {
      console.log('setting to null!');
      this.selectedShip = null;
      this.setClickState(ClickState.None);
      return;
    }

    this.setClickState(ClickState.Acting);
    const type = ship.getType();
    const { api } = this.manager;
    this.selectedShip = ship;

    if (ship.isZk()) {
      // for submarines, can only either move or attack
      if (api.hasMoved(ship)) {
        this.moveIdxs = [];
        this.attackIdxs = api.findAttacks(type, ship.getCoords());
      } else {
        this.moveIdxs = api.findMoves(type, ship.getCoords());
        this.attackIdxs = [];
      }
      this.moveAttackIdxs = [];
    } else {
      this.attackIdxs = api.findAttacks(type, ship.getCoords());
      if (!api.hasMoved(ship)) {
        console.log('setting moves');
        this.moveIdxs = api.findMoves(type, ship.getCoords());
        this.moveAttackIdxs = api.findMoveAttacks(type, ship.getCoords());
      } else {
        this.moveIdxs = [];
        this.moveAttackIdxs = [];
      }
    }
  }

  private shouldSkip(): boolean {
    return this.manager.api.getInitState() !== InitState.GameStarted;
  }

  cellClicked(idx: BoardCoords) {
    if (this.shouldSkip()) return;
    console.log('got a click from this cell: ' + JSON.stringify(idx));
    // this.clearStaged();
    const { api } = this.manager;
    const { selectedShip } = this;

    if (this.clickState === ClickState.Deploying) {
      if (idxsIncludes(this.deployIdxs, idx)) {
        this.deployStaged = idx;
      }
    } else if (this.clickState === ClickState.Acting) {
      // see if i clicked the currently selected cell
      if (selectedShip && compareBoardCoords(idx, selectedShip.getCoords())) {
        this.moveStaged = null;
        this.attackStaged = null;
        return;
      }

      if (!selectedShip?.isZk()) {
        // is not zk

        // check if there is an enemy boat
        const ship = api.shipAt(idx);
        if (ship && !api.ownedByMe(ship)) {
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
      } else {
        // is zk
        if (idxsIncludes(this.moveIdxs, idx)) {
          this.attackStaged = null;
          this.moveStaged = idx;
        }
      }
    }
  }

  shipClicked(ship: Ship) {
    if (this.shouldSkip()) return;
    console.log('got a click from this ship: ' + ship.objectId);

    const {
      manager: { api },
      clickState,
      selectedShip,
      deployType,
    } = this;

    if (this.showZk) return;
    // if (ship.id === selectedShip?.id) {
    //   this.setSelected(null);
    //   return;
    // }

    const deployingSub =
      clickState === ClickState.Deploying &&
      deployType === PieceType.Submarine_04;

    const subSelected =
      selectedShip && selectedShip.getType() === PieceType.Submarine_04;

    const type = ship.getType();
    if (api.ownedByMe(ship) && !subSelected && !deployingSub) {
      // clicked your own ship, time to move it
      if (type === PieceType.Mothership_00) return;
      if (api.hasAttacked(ship)) return;

      // initiate ship actions
      this.setSelected(ship);
      return;
    }

    // bubble the event
    this.cellClicked(ship.coords);
  }

  subClicked(sub: Submarine) {
    if (this.shouldSkip()) return;

    console.log('got a click from this sub: ' + sub.objectId, sub.pieceData);
    const {
      manager: { api },
      clickState,
    } = this;

    if (!this.showZk) return;

    // if (sub.id === this.selectedShip?.id) {
    //   this.setSelected(null);
    //   return;
    // }

    if (api.ownedByMe(sub)) {
      if (api.hasAttacked(sub)) return;
      // initiate ship actions
      this.setSelected(sub);
      return;
    }

    const coords = sub.getCoords();
    if (coords) this.cellClicked(coords);
  }
}

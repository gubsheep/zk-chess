import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../api/PixiManager';
import { Player } from '../../_types/global/GlobalTypes';
import { GameObject } from './GameObject';
import { BoardCoords, PlayerColor, ShipType } from './PixiTypes';
import { playerShader } from './Shaders';
import { getShipSprite, SHIPS } from './TextureLoader';

const waterline = (type: ShipType): number => {
  if (type === ShipType.Mothership_00) return 28;
  else if (type === ShipType.Submarine_04) return 32;
  else return 25;
};

export type ShipData = {
  type: ShipType;
  cost: number;
  attack: number;
  health: number;
  minRange: number;
  maxRange: number;
  movement: number;
  name: string;
  isZk?: boolean;
};

const mothership: ShipData = {
  type: ShipType.Mothership_00,
  cost: NaN,
  attack: NaN,
  health: 20,
  minRange: NaN,
  maxRange: NaN,
  movement: 2,
  name: 'Mothership',
};
const cruiser: ShipData = {
  type: ShipType.Cruiser_01,
  cost: 1,
  attack: 2,
  health: 3,
  minRange: 1,
  maxRange: 1,
  movement: 2,
  name: 'Cruiser',
};
const frigate: ShipData = {
  type: ShipType.Frigate_02,
  cost: 2,
  attack: 2,
  health: 3,
  minRange: 2,
  maxRange: 2,
  movement: 2,
  name: 'Frigate',
};
const corvette: ShipData = {
  type: ShipType.Corvette_03,
  cost: 3,
  attack: 2,
  health: 3,
  minRange: 2,
  maxRange: 2,
  movement: 4,
  name: 'Corvette',
};
const submarine: ShipData = {
  type: ShipType.Submarine_04,
  cost: 4,
  attack: 4,
  health: 1,
  minRange: 0,
  maxRange: 0,
  movement: 2,
  name: 'Submarine',
  isZk: true,
};
const warship: ShipData = {
  type: ShipType.Warship_05,
  cost: 5,
  attack: 3,
  health: 3,
  minRange: 2,
  maxRange: 3,
  movement: 1,
  name: 'Warship',
};

export const shipData: ShipData[] = [
  mothership, // Mothership_00,
  cruiser, // Cruiser_01,
  frigate, // Frigate_02,
  corvette, // Corvette_03,
  submarine, // Submarine_04,
  warship, // Warship_05,
];

export class Ship extends GameObject {
  constructor(
    manager: PixiManager,
    shipType: ShipType,
    coords: BoardCoords,
    color: PlayerColor
  ) {
    const { col, row } = coords;

    let container = new PIXI.Container();
    const sprite = getShipSprite(shipType, color);

    sprite.anchor.set(0.5, 0.0);
    sprite.scale.x = color === PlayerColor.Red ? 1 : -1;
    sprite.x = 16;
    sprite.y = 16; // doesn't work? investigate

    const { x, y } = manager.gameBoard.getTopLeft({ row, col });
    container.position.set(x + 2, y + 2);
    container.addChild(sprite);

    let mask = new PIXI.Graphics();
    mask.beginFill(0xffffff, 1.0);
    mask.drawRect(container.x, container.y, 32, waterline(shipType));
    mask.endFill();
    container.mask = mask;

    super(manager, container, GameZIndex.Ships);
  }

  loop() {
    super.loop();
    const { frameCount } = this.manager;

    const frames = 30;
    if (frameCount % frames === 0) {
      const container = this.object as PIXI.Container;
      const boat = container.children[0];
      if (frameCount % (2 * frames) === 0) {
        // TODO need a better way to specify that it's the ship
        boat.y = 2;
      } else {
        // mask.drawRect(container.x, container.y, 32, 24);
        boat.y = 0;
      }
    }
  }
}

export const RED_MOTHERSHIP_COORDS: BoardCoords = { row: 2, col: 0 };
export const BLUE_MOTHERSHIP_COORDS: BoardCoords = { row: 2, col: 6 };

export class Mothership extends Ship {
  constructor(manager: PixiManager, color: PlayerColor) {
    const coords =
      color === PlayerColor.Red
        ? RED_MOTHERSHIP_COORDS
        : BLUE_MOTHERSHIP_COORDS;

    super(manager, ShipType.Mothership_00, coords, color);
  }
}

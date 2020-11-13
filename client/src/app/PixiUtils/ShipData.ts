import { PieceType } from "../../_types/global/GlobalTypes";

export type ShipData = {
  type: PieceType;
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
  type: PieceType.Mothership_00,
  cost: NaN,
  attack: NaN,
  health: 20,
  minRange: 0,
  maxRange: 0,
  movement: 0,
  name: 'Mothership',
};
const cruiser: ShipData = {
  type: PieceType.Cruiser_01,
  cost: 1,
  attack: 2,
  health: 3,
  minRange: 1,
  maxRange: 1,
  movement: 2,
  name: 'Cruiser',
};
const frigate: ShipData = {
  type: PieceType.Frigate_02,
  cost: 2,
  attack: 2,
  health: 3,
  minRange: 2,
  maxRange: 2,
  movement: 2,
  name: 'Frigate',
};
const corvette: ShipData = {
  type: PieceType.Corvette_03,
  cost: 3,
  attack: 2,
  health: 3,
  minRange: 1,
  maxRange: 1,
  movement: 4,
  name: 'Corvette',
};
const submarine: ShipData = {
  type: PieceType.Submarine_04,
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
  type: PieceType.Warship_05,
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

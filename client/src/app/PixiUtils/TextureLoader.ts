import * as PIXI from 'pixi.js';
import { ShipType, PlayerColor } from './PixiTypes';
import { playerShader } from './Shaders';

const PATH = 'public/assets/';
const imgUri = (file: string) => PATH + file;

export const BASELINE_TEXT = 0;
export const BASELINE_ICONS = -1;

export const SPRITE_W = 32;

export const BG_IMAGE = imgUri('backgroundsmall.png');
export const FONT = imgUri('font.png');
export const SHIPS = [
  imgUri('00_mothership.png'),
  imgUri('01_cruiser.png'),
  imgUri('02_frigate.png'),
  imgUri('03_corvette.png'),
  imgUri('04_submarine.png'),
  imgUri('05_warship.png'),
];

export const ICONS = {
  HEART: imgUri('icons/heart.png'),
  COIN: imgUri('icons/coin.png'),
  COIN_USED: imgUri('icons/coin_used.png'),
};

const textures = [FONT, BG_IMAGE, ...SHIPS, ...Object.values(ICONS)];

export const loadTextures = (callbackFn: () => void): void => {
  const loader = PIXI.Loader.shared;
  for (const str of textures) {
    loader.add(str);
  }
  loader.load(callbackFn);
};

const cache = PIXI.utils.TextureCache;
export const getShipSprite = (
  type: ShipType,
  color?: PlayerColor
): PIXI.Sprite => {
  const sprite = new PIXI.Sprite(cache[SHIPS[type]]);
  if (color) {
    sprite.filters = [playerShader(color)];
  }
  return sprite;
};

export const getCoinSprite = () => new PIXI.Sprite(cache[ICONS.COIN]);
export const getCoinUsedSprite = () => new PIXI.Sprite(cache[ICONS.COIN_USED]);
export const getHeartSprite = () => new PIXI.Sprite(cache[ICONS.HEART]);
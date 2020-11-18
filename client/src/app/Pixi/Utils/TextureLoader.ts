import * as PIXI from 'pixi.js';

// TODO make this battleship/public
const PATH = 'public/assets/';
const imgUri = (file: string) => PATH + file;

export const BASELINE_TEXT = 0;
export const BASELINE_ICONS = -1;

export const SPRITE_W = 32;

export const BG_IMAGE = imgUri('backgroundsmall.png');
export const FONT = imgUri('font.png');
export const OBJECTIVE = imgUri('oilrig.png');
export const WATERLINE = imgUri('waterline.png');
export const SHIPS = [
  imgUri('00_mothership.png'),
  imgUri('01_cruiser.png'),
  imgUri('02_frigate.png'),
  imgUri('03_corvette.png'),
  imgUri('04_submarine.png'),
  imgUri('05_warship.png'),
];

export const BUBBLE_CLOSED = imgUri('bubble_closed.png');
export const BUBBLE_OPEN = imgUri('bubble_open.png');

export const ICONS = {
  HEART: imgUri('icons/heart.png'),
  COIN: imgUri('icons/coin.png'),
  COIN_USED: imgUri('icons/coin_used.png'),
  BOMB: imgUri('icons/bomb.png'),
};

const textures = [
  FONT,
  BG_IMAGE,
  OBJECTIVE,
  WATERLINE,
  ...SHIPS,
  ...Object.values(ICONS),
  BUBBLE_CLOSED,
  BUBBLE_OPEN,
];

export const loadTextures = (callbackFn: () => void): void => {
  const loader = PIXI.Loader.shared;
  for (const str of textures) {
    loader.add(str);
  }
  loader.load(callbackFn);
};

const cache = PIXI.utils.TextureCache;
export const getCoinSprite = () => new PIXI.Sprite(cache[ICONS.COIN]);
export const getCoinUsedSprite = () => new PIXI.Sprite(cache[ICONS.COIN_USED]);
export const getHeartSprite = () => new PIXI.Sprite(cache[ICONS.HEART]);
export const getBombSprite = () => new PIXI.Sprite(cache[ICONS.BOMB]);

import * as PIXI from 'pixi.js';

// TODO make this bote/public
const PATH = 'public/assets/';
const imgUri = (file: string) => PATH + file;

export const BASELINE_TEXT = 0;
export const BASELINE_ICONS = -1;

export const SPRITE_W = 32;

export const FONT = imgUri('font.png');
export const OBJECTIVE = imgUri('oilrig.png');
export const WATERLINE = imgUri('waterline.png');
export const SHIPS = [
  imgUri('boats/00_mothership.png'),
  imgUri('boats/01_cruiser.png'),
  imgUri('boats/02_frigate.png'),
  imgUri('boats/03_corvette.png'),
  imgUri('boats/04_submarine.png'),
  imgUri('boats/05_warship.png'),
];

export const CARDS = [
  imgUri('cards/c00_empty.png'),
  imgUri('cards/c01_atk_s.png'),
  imgUri('cards/c02_atk_l.png'),
  imgUri('cards/c03_dmg_s.png'),
  imgUri('cards/c04_dmg_l.png'),
  imgUri('cards/c05_hp_s.png'),
  imgUri('cards/c06_hp_l.png'),
];

export const BUBBLE_CLOSED = imgUri('bubble_closed.png');
export const BUBBLE_OPEN = imgUri('bubble_open.png');

export const ICONS = {
  HEART: imgUri('icons/heart.png'),
  COIN: imgUri('icons/coin.png'),
  COIN_USED: imgUri('icons/coin_used.png'),
  BOMB: imgUri('icons/bomb.png'),
};

export const UI = {
  BOAT: imgUri('ui/boat.png'),
  P1: imgUri('ui/p1text.png'),
  P2: imgUri('ui/p2text.png'),
  SETSAIL: imgUri('ui/setsail.png'),
  SPECTATE: imgUri('ui/spectate.png'),
  TITLE: imgUri('ui/title.png'),
  CREATE: imgUri('ui/create.png'),
  JOIN: imgUri('ui/join.png'),
};

const textures = [
  FONT,
  OBJECTIVE,
  WATERLINE,
  ...SHIPS,
  ...Object.values(ICONS),
  BUBBLE_CLOSED,
  BUBBLE_OPEN,
  ...Object.values(UI),
  ...CARDS,
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

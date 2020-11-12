import * as PIXI from 'pixi.js';

const PATH = 'public/assets/';
const imgUri = (file: string) => PATH + file;

export const BG_IMAGE = imgUri('backgroundsmall.png');
export const FONT = imgUri('font.png');
export const PIECES = [
  imgUri('00_mothership.png'),
  imgUri('01_cruiser.png'),
  imgUri('02_frigate.png'),
  imgUri('03_corvette.png'),
  imgUri('04_submarine.png'),
  imgUri('05_warship.png'),
];

const textures = [FONT, BG_IMAGE, ...PIECES];

export const loadTextures = (callbackFn: () => void): void => {
  const loader = PIXI.Loader.shared;
  for (const str of textures) {
    loader.add(str);
  }
  loader.load(callbackFn);
};

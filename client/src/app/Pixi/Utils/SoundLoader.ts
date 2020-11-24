import * as PIXI from 'pixi.js';

import pixiSound from 'pixi-sound';

const PATH = 'public/assets/audio/';

const audUri = (file: string) => PATH + file;

const bgm = audUri('botefite.mp3');

const soundUris = [bgm];

const sounds: pixiSound.Sound[] = [];

export const setAllVolume = (volume: number) => {
  for (const sound of sounds) {
    sound.volume = volume;
  }
};

// @ts-ignore
window['sounds'] = sounds;

export const loadSound = (callbackFn: () => void): void => {
  console.log('loading sounds');

  const bgmSound = pixiSound.Sound.from({ url: bgm, volume: 1 });
  sounds.push(bgmSound);
  bgmSound.play();

  // const loader = PIXI.Loader.shared;
  // for (const str of sounds) {
  //   loader.add(str);
  // }
  // loader.load(callbackFn);

  callbackFn();
};

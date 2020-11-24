import * as PIXI from 'pixi.js';

import pixiSound from 'pixi-sound';

const PATH = 'public/assets/audio/';

const audUri = (file: string) => PATH + file;


const bgm = audUri('botefite.mp3');

const sounds = [bgm];

export const loadSound = (callbackFn: () => void): void => {
  console.log('loading sounds');

  pixiSound.add('foo', bgm);
  pixiSound.play('foo');

  // const loader = PIXI.Loader.shared;
  // for (const str of sounds) {
  //   loader.add(str);
  // }
  // loader.load(callbackFn);

  callbackFn();
};

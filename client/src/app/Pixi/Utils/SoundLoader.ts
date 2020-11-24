import * as PIXI from 'pixi.js';

import pixiSound from 'pixi-sound';

const PATH = 'public/assets/audio/';

const audUri = (file: string) => PATH + file;

const bgm = audUri('botefite.m4a');

export enum SFX {
  MenuHover = 'MenuHover',
  MenuInit = 'MenuInit',

  BtnClick = 'BtnClick',
}

const sfxURLs: Record<SFX, string> = {
  MenuHover: audUri('menuhover.wav'),
  MenuInit: audUri('menuinit.wav'),
  BtnClick: audUri('btnclick.wav'),
};

let sfxObjs: Record<SFX, pixiSound.Sound> = {} as Record<SFX, pixiSound.Sound>;

const musics: pixiSound.Sound[] = [];

export const setMusicVolume = (volume: number) => {
  for (const music of musics) {
    music.volume = volume;
  }
};

export const setSoundVolume = (volume: number) => {
  for (const key in sfxObjs) {
    if (sfxObjs.hasOwnProperty(key)) {
      sfxObjs[key as SFX].volume = volume;
    }
  }
};

export const playSFX = (sound: SFX): void => {
  sfxObjs[sound].play();
};

export const DEFAULT_SOUND_VOLUME = 0.5;
export const DEFAULT_MUSIC_VOLUME = 0.7;
export const loadSound = (callbackFn: () => void): void => {
  console.log('loading sounds');

  let mVol = DEFAULT_MUSIC_VOLUME;
  if (localStorage.getItem('storedstate-item-Music') === 'false') mVol = 0;

  const bgmSound = pixiSound.Sound.from({
    url: bgm,
    volume: mVol,
    loop: true,
    preload: true,
    loaded: (err, sound) => {
      if (!sound) {
        console.error('error loading sound');
        return;
      }
      sound.play();
      musics.push(sound);
    },
  });
  // load sounds
  let sVol = DEFAULT_SOUND_VOLUME;
  if (localStorage.getItem('storedstate-item-Sound') === 'false') sVol = 0;

  for (const key in sfxURLs) {
    if (sfxURLs.hasOwnProperty(key)) {
      const sfx = pixiSound.Sound.from({
        url: sfxURLs[key as SFX],
        volume: sVol,
        preload: true,
        loaded: (err, sound) => {
          if (sound) sfxObjs[key as SFX] = sound;

          // @ts-ignore
          window['map'] = sfxObjs;
        },
      });
    }
  }

  callbackFn();
};

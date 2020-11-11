import * as PIXI from 'pixi.js';
import { ColorOverlayFilter } from '@pixi/filter-color-overlay';

const CAPIT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const OTHER = '0123456789.!?';
const CHARS = `${CAPIT}${LOWER}${OTHER}`;

const HAS_DESC = ['g', 'p', 'q', 'y'];

const ROW_LEN = 13;
const CHAR_H = 7;
const CHAR_W = 5;

type MessageData = {
  message: string;
  object: PIXI.Container;
  color: number;
  width: number;
};

type FontLoader = (msg: string, color?: number) => MessageData;

export const getFontLoader = (texture: PIXI.Texture): FontLoader => {
  const charMap = new Map<string, PIXI.Texture>();
  for (let i = 0; i < CHARS.length; i++) {
    const char = CHARS.charAt(i);
    if (!charMap.has(char)) {
      const newTexture = texture.clone();
      const row = Math.floor(i / ROW_LEN);
      const col = i % ROW_LEN;
      const x = 1 + col * (1 + CHAR_W);
      const y = row * (1 + CHAR_H);
      const frame = new PIXI.Rectangle(x, y, CHAR_W, CHAR_H);
      newTexture.frame = frame;

      charMap.set(char, newTexture);
    } else {
      console.error('error building font texture map');
    }
  }

  return (message: string, color: number = 0xffffff) => {
    const chars = message.split('');
    console.log(chars);
    const container = new PIXI.Container();
    for (let i = 0; i < chars.length; i++) {
      const obj = charMap.get(chars[i]);
      if (obj) {
        const sprite = new PIXI.Sprite(obj);
        sprite.x = i * (1 + CHAR_W);
        if (HAS_DESC.includes(chars[i])) sprite.y = 2;
        container.addChild(sprite);
      } // else just add a space
    }
    const shader = new ColorOverlayFilter(color);
    container.filters = [shader];

    let width = chars.length * (1 + CHAR_W) - 1;
    if (['.', '!'].includes(chars[chars.length - 1])) width -= 3;

    return {
      object: container,
      color,
      message,
      width,
    };
  };
};

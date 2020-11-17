import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { PixiObject } from '../PixiObject';
import { TextAlign, TextObject } from './Text';
import { getBombSprite, getHeartSprite } from './TextureLoader';

export enum StatType {
  Atk,
  Hp,
  Mov,
  Rng,
}

export const getStatSprite = (stat: StatType): PIXI.Sprite => {
  if (stat === StatType.Atk) return getBombSprite();
  else return getHeartSprite();
};

export class StatIcon extends PixiObject {
  type: StatType;
  text: TextObject;
  value: number;

  constructor(manager: PixiManager, type: StatType) {
    super(manager);
    this.type = type;
    const sprite = getStatSprite(type)
    this.object.addChild(sprite);

    const valObj = new TextObject(manager, '', TextAlign.Center);
    this.addChild(valObj);
    this.text = valObj;
    this.text.setPosition({ x: 5, y: 0 });


    this.setValue(0);
  }

  setValue(value: number) {
    this.value = value;
    this.text.setText(`${value}`);
  }
}

export const STATICON_W = 9;

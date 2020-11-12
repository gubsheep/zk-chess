import { PixiManager } from '../../api/PixiManager';
import { GameObject } from './GameObject';
import * as PIXI from 'pixi.js';
import { ICONS } from './TextureLoader';
import { ThemeProvider } from 'styled-components';

const LABEL_WIDTH = 36; // width of 'Gold:'
const LABEL_M_RIGHT = 2; // right margin
const NUMBER_WIDTH = 30; // width of 'n/10'
const NUMBER_M_RIGHT = 0; // right margin

const NUMBER_OFFSET = LABEL_WIDTH + LABEL_M_RIGHT;
const ICON_OFFSET = NUMBER_OFFSET + NUMBER_WIDTH + NUMBER_M_RIGHT;

const ICON_WIDTH = 9;
const BASELINE_TEXT = 0;
const BASELINE_ICONS = -1;
const MARGIN = 2;

const MASK_HEIGHT = 2 * ICON_WIDTH;

function makeRow(icon: string, length: number): PIXI.DisplayObject {
  const cache = PIXI.utils.TextureCache;
  const row = new PIXI.Container();

  for (let i = 0; i < length; i++) {
    const element = new PIXI.Sprite(cache[icon]);
    element.position.set(i * (ICON_WIDTH + MARGIN), 0);
    row.addChild(element);
  }

  return row;
}

class ResourceBar extends GameObject {
  label: PIXI.DisplayObject;
  numbersContainer: PIXI.Container;

  mask: PIXI.Graphics;
  maskable: PIXI.DisplayObject;

  max: number;
  value: number;

  constructor(
    manager: PixiManager,
    label: string,
    iconContainer: PIXI.Container,
    maskable: PIXI.DisplayObject
  ) {
    const { fontLoader } = manager;

    const container = new PIXI.Container();

    const { object: labelObj } = fontLoader(label);
    labelObj.position.set(0, BASELINE_TEXT);
    container.addChild(labelObj);

    const numbersContainer = new PIXI.Container();
    numbersContainer.position.set(NUMBER_OFFSET, BASELINE_TEXT);
    container.addChild(numbersContainer);

    iconContainer.position.set(ICON_OFFSET, BASELINE_ICONS);

    let mask = new PIXI.Graphics();
    maskable.mask = mask;

    container.addChild(iconContainer);

    super(manager, container);

    this.label = labelObj;
    this.numbersContainer = numbersContainer;
    this.mask = mask;
    this.maskable = maskable;
    this.value = 0;
    this.max = 10;
    this.setValue(this.value);

    // @ts-ignore
    window['row'] = this;
  }

  updateMask(value: number): void {
    // update mask
    const mask = this.mask;
    const maskContainer = this.maskable;
    const maskStart = maskContainer.toGlobal({ x: 0, y: 0 });

    mask.clear();
    mask.beginFill(0xffffff, 1.0);
    const width = this.getMaskWidth(value);
    mask.drawRect(maskStart.x, maskStart.y, width, MASK_HEIGHT);
    mask.endFill();
  }

  updateText(value: number) {
    const nc = this.numbersContainer;
    if (nc.children.length > 0) {
      nc.removeChild(nc.children[0]);
    }

    const { object: numbers } = this.manager.fontLoader(this.getText(value));
    nc.addChild(numbers);
  }

  setMax(max: number) {
    this.max = max;
    this.update();
  }

  setValue(value: number): void {
    this.value = value;
    this.update();
  }

  update(): void {
    this.updateMask(this.value);
    this.updateText(this.value);
  }

  //implemented by children
  getMaskWidth(value: number): number {
    return value * (ICON_WIDTH + MARGIN);
  }
  getText(value: number): string {
    return `${value}/${this.max}`;
  }
}

export class GoldBar extends ResourceBar {
  constructor(manager: PixiManager) {
    const iconContainer = new PIXI.Container();
    const coinUsedRow = makeRow(ICONS.COIN_USED, 10);
    const coinRow = makeRow(ICONS.COIN, 10);

    iconContainer.addChild(coinUsedRow);
    iconContainer.addChild(coinRow);

    super(manager, 'Gold:', iconContainer, coinRow);
  }
}

export class HPBar extends ResourceBar {
  constructor(manager: PixiManager) {
    const iconContainer = new PIXI.Container();
    const hpRow = makeRow(ICONS.HEART, 10);

    iconContainer.addChild(hpRow);

    super(manager, 'HP:', iconContainer, hpRow);
    this.setMax(20);
  }

  // overrides
  getMaskWidth(value: number): number {
    return Math.floor((value / 2) * (ICON_WIDTH + MARGIN));
  }
}

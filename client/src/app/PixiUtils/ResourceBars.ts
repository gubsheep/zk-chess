import { GameZIndex, PixiManager } from '../../api/PixiManager';
import { GameObject } from './GameObject';
import * as PIXI from 'pixi.js';
import { BASELINE_ICONS, BASELINE_TEXT, ICONS } from './TextureLoader';
import { ThemeProvider } from 'styled-components';
import { CanvasCoords } from './PixiTypes';
import { getFontLoader } from './FontLoader';

const LABEL_WIDTH = 32; // width of 'Gold:'
const LABEL_M_RIGHT = 2; // right margin
const NUMBER_WIDTH = 34; // width of 'n/10'
const NUMBER_M_RIGHT = 2; // right margin

const NUMBER_OFFSET = LABEL_WIDTH + LABEL_M_RIGHT;
const ICON_OFFSET = NUMBER_OFFSET + NUMBER_WIDTH + NUMBER_M_RIGHT;

const ICON_WIDTH = 9;
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
    max: number,
    iconContainer: PIXI.Container,
    maskable: PIXI.DisplayObject
  ) {
    super(manager, GameZIndex.UI);
    const { fontLoader } = manager;

    const container = this.object;

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

    this.label = labelObj;
    this.numbersContainer = numbersContainer;
    this.mask = mask;
    this.maskable = maskable;
    this.value = max;
    this.max = max;
    this.update();
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

  setPosition({ x, y }: CanvasCoords): void {
    super.setPosition({ x, y });
    this.update();
  }

  //implemented by children
  getMaskWidth(value: number): number {
    return value * (ICON_WIDTH + MARGIN);
  }
  getText(value: number): string {
    return `${value}/${this.max}`;
  }
}

const GOLD_START_MAX = 3;
export class GoldBar extends ResourceBar {
  coinUsedRow: PIXI.DisplayObject;
  iconContainer: PIXI.Container;
  constructor(manager: PixiManager) {
    const iconContainer = new PIXI.Container();

    const coinUsedRow = makeRow(ICONS.COIN_USED, 10);
    coinUsedRow.zIndex = 0;

    const coinRow = makeRow(ICONS.COIN, 10);
    coinRow.zIndex = 1;

    iconContainer.addChild(coinUsedRow);
    iconContainer.addChild(coinRow);

    super(manager, 'Gold:', GOLD_START_MAX, iconContainer, coinRow);

    iconContainer.sortableChildren = true;

    this.iconContainer = iconContainer;
    this.coinUsedRow = coinUsedRow;

    this.setMax(GOLD_START_MAX);
  }

  // overrides
  getText(value: number): string {
    const valueStr = value < 10 ? '0' + value : value;
    const maxStr = this.value < 10 ? '0' + this.value : this.value;
    return `${valueStr}/${maxStr}`;
  }
  setMax(max: number): void {
    this.iconContainer.removeChild(this.coinUsedRow);
    const coinUsedRow = makeRow(ICONS.COIN_USED, max);
    coinUsedRow.zIndex = 0;
    this.coinUsedRow = coinUsedRow;
    this.iconContainer.addChild(coinUsedRow);
    this.iconContainer.sortChildren();
    super.setMax(max);
  }
}

export class HPBar extends ResourceBar {
  constructor(manager: PixiManager) {
    const iconContainer = new PIXI.Container();
    const hpRow = makeRow(ICONS.HEART, 10);

    iconContainer.addChild(hpRow);

    super(manager, 'HP:', 20, iconContainer, hpRow);
  }

  // overrides
  getMaskWidth(value: number): number {
    return Math.floor((value / 2) * (ICON_WIDTH + MARGIN));
  }
  getText(value: number): string {
    const valueStr = value < 10 ? '0' + value : value;
    return `${valueStr}/${this.max}`;
  }
}

export class ResourceBars extends GameObject {
  hpBar: HPBar;
  goldBar: GoldBar;
  constructor(manager: PixiManager) {
    super(manager, GameZIndex.UI);

    const goldBar = new GoldBar(manager);
    const hpBar = new HPBar(manager);

    goldBar.setPosition({ x: 0, y: 12 });

    this.hpBar = hpBar;
    this.goldBar = goldBar;

    this.addChild(goldBar);
    this.addChild(hpBar);

    this.positionSelf();
  }

  setPosition(coords: CanvasCoords) {
    super.setPosition(coords);
    this.hpBar.update();
    this.goldBar.update();
  }

  positionSelf() {
    this.setPosition({ x: 10, y: 10 });
  }
}

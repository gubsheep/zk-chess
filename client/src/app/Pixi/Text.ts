import { PixiManager } from '../../api/PixiManager';
import { PixiObject } from './PixiObject';
import { ColorOverlayFilter } from '@pixi/filter-color-overlay';
import { CanvasCoords } from './@PixiTypes';

export enum TextAlign {
  Left,
  Center,
  Right,
}

export class TextObject extends PixiObject {
  width: number;
  text: string;
  color: number;
  align: TextAlign;

  constructor(
    manager: PixiManager,
    text: string,
    align: TextAlign = TextAlign.Left,
    color: number = 0xffffff
  ) {
    super(manager);

    this.text = text;
    this.color = color;
    this.align = align;

    this.update();
  }

  setText(text: string) {
    this.text = text;
    this.update();
  }

  setColor(color: number) {
    this.color = color;
    this.update();
  }

  setAlign(align: TextAlign) {
    this.align = align;
    this.update();
  }

  private update() {
    const { align, text, color, manager, object } = this;
    const { width, object: textObj } = manager.fontLoader(text);

    for (const child of object.children) object.removeChild(child);

    object.addChild(textObj);

    if (align === TextAlign.Center) {
      textObj.x = Math.floor(-width / 2);
    } else if (align === TextAlign.Right) {
      textObj.x = -width;
    }

    const shader = new ColorOverlayFilter(color);
    textObj.filters = [shader];
  }
}

export class LinkObject extends TextObject {
  onClick: Function;
  mousedown: boolean;
  mouseover: boolean;

  realPos: CanvasCoords;

  constructor(
    manager: PixiManager,
    text: string,
    onClick: Function,
    align: TextAlign = TextAlign.Left,
    color: number = 0xffffff
  ) {
    super(manager, text, align, color);

    this.onClick = onClick;
    this.mousedown = false;
    this.mouseover = false;
    this.realPos = { x: 0, y: 0 };

    this.setInteractive({
      mouseover: this.onMouseOver,
      mousedown: this.onMouseDown,
      mouseout: this.onMouseOut,
      mouseup: this.onMouseUp,
      mouseupoutside: this.onMouseUp,
      click: this.onClick,
    });
  }

  private onMouseOver() {
    this.mouseover = true;
  }

  private onMouseOut() {
    this.mouseover = false;
  }

  private onMouseDown() {
    this.mousedown = true;
  }

  private onMouseUp() {
    this.mousedown = false;
  }

  setPosition(coords: CanvasCoords) {
    this.realPos = coords;
  }

  loop() {
    const { x, y } = this.realPos;
    const delY = this.mousedown ? 1 : this.mouseover ? -1 : 0;
    super.setPosition({ x, y: y + delY });
  }
}

import { ColorOverlayFilter } from '@pixi/filter-color-overlay';
import { PixiManager } from '../../../api/PixiManager';
import { CanvasCoords } from '../@PixiTypes';
import { PixiObject } from '../PixiObject';

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



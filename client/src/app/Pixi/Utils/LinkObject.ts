import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { CanvasCoords } from '../@PixiTypes';
import { PixiObject } from '../PixiObject';
import { CHAR_H } from './FontLoader';
import { TextObject, TextAlign } from './TextObject';

export class LinkObject extends PixiObject {
  mousedown: boolean;
  mouseover: boolean;

  realPos: CanvasCoords;

  enabled: boolean;

  text: TextObject;

  constructor(
    manager: PixiManager,
    text: string,
    align: TextAlign = TextAlign.Left,
    color: number = 0xffffff
  ) {
    super(manager);
    this.text = new TextObject(manager, text, align, color);
    this.addChild(this.text);

    this.mousedown = false;
    this.mouseover = false;
    this.enabled = true;
    this.realPos = { x: 0, y: 0 };

    this.setInteractive({
      hitArea: this.getHitArea(),
      mouseover: this.onMouseOver,
      mousedown: this.onMouseDown,
      mouseout: this.onMouseOut,
      mouseup: this.onMouseUp,
      mouseupoutside: this.onMouseUp,
      click: this.doClick,
    });
  }

  setText(text: string) {
    this.text.setText(text);
    this.setInteractive({ hitArea: this.getHitArea() });
  }

  private getHitArea(): PIXI.Rectangle {
    return new PIXI.Rectangle(
      this.text.align * this.text.width - 1,
      -1,
      this.text.width + 2,
      CHAR_H + 2
    );
  }

  onClick(): void {
    return;
  }

  private doClick() {
    if (this.enabled) this.onClick();
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
    this.enabled = this.isEnabled();
    this.setAlpha(this.enabled ? 1 : 0.5);

    const { x, y } = this.realPos;
    const delY = this.mousedown ? 1 : this.mouseover ? -1 : 0;
    this.text.setPosition(this.enabled ? { x, y: y + delY } : { x, y });
  }

  isEnabled(): boolean {
    return true;
  }
}

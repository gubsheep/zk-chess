import { PixiManager } from '../../../api/PixiManager';
import { CanvasCoords } from '../@PixiTypes';
import { TextObject, TextAlign } from './Text';

export class LinkObject extends TextObject {
  mousedown: boolean;
  mouseover: boolean;

  realPos: CanvasCoords;

  enabled: boolean;

  constructor(
    manager: PixiManager,
    text: string,
    align: TextAlign = TextAlign.Left,
    color: number = 0xffffff
  ) {
    super(manager, text, align, color);

    this.mousedown = false;
    this.mouseover = false;
    this.enabled = true;
    this.realPos = { x: 0, y: 0 };

    this.setInteractive({
      mouseover: this.onMouseOver,
      mousedown: this.onMouseDown,
      mouseout: this.onMouseOut,
      mouseup: this.onMouseUp,
      mouseupoutside: this.onMouseUp,
      click: this.doClick,
    });
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
    super.setPosition(this.enabled ? { x, y: y + delY } : { x, y });
  }

  isEnabled(): boolean {
    return true;
  }
}

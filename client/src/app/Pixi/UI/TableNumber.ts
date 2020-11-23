import { GameZIndex, PixiManager } from '../../../api/PixiManager';
import { PixiObject } from '../PixiObject';
import { TextAlign, TextObject } from '../Utils/TextObject';

export class TableNumber extends PixiObject {
  constructor(manager: PixiManager) {
    super(manager, GameZIndex.UI);
    const table = window.location.href.split('/').splice(-1)[0];
    const tableNum = parseInt(table.substring(4, table.length));
    let str = '';
    if (
      table.length <= 6 &&
      table.substring(0, 4) === 'game' &&
      tableNum !== NaN
    ) {
      str = 'Table ' + tableNum;
    }
    const title = new TextObject(manager, str, TextAlign.Right);

    this.addChild(title);

    this.positionSelf();
  }

  positionSelf() {
    const { width } = this.manager.renderer;
    this.setPosition({
      x: width - 4,
      y: 4,
    });
  }
}

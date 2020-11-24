import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../../api/PixiManager';
import { ClickState } from '../../MouseManager';
import { PixiObject } from '../../PixiObject';
import { CARD_W, CARD_H } from '../Shop/ShopCard';
import { SpellItem } from './SpellItem';

export class DrawCard extends PixiObject {
  item: SpellItem;

  constructor(manager: PixiManager) {
    super(manager);

    this.item = new SpellItem(manager, -1, 0, true);

    this.addChild(this.item);

    const hitArea = new PIXI.Rectangle(0, 0, CARD_W, CARD_H);
    this.setInteractive({ hitArea, click: this.onClick });
  }

  loop() {
    super.loop();

    const { drawnCard } = this.manager.api.gameState;
    this.item.setType(drawnCard || 0);

    const { clickState } = this.manager.mouseManager;
    this.item.setOverride(clickState === ClickState.Drawing);
  }

  onClick() {
    const { drawnCard } = this.manager.api.gameState;
    if (drawnCard === null) return;

    this.manager.mouseManager.drawCard();
  }
}

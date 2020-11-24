import { PixiManager, GameZIndex } from '../../../../api/PixiManager';
import { PixiObject } from '../../PixiObject';
import { TextObject, TextAlign } from '../../Utils/TextObject';
import { CARD_MARGIN } from '../Shop/Shop';
import { CARD_W, CARD_H } from '../Shop/ShopCard';
import { DrawCard } from './DrawCard';
import { Hand } from './Hand';
import { SpellItem } from './SpellItem';

export class Cards extends PixiObject {
  constructor(manager: PixiManager) {
    super(manager, GameZIndex.Shop);

    if (manager.spectator) {
      this.setActive(false);
      return;
    }

    const draw = new DrawCard(manager);
    draw.setPosition({
      x: -(CARD_W + CARD_MARGIN),
      y: -2 * (CARD_H + CARD_MARGIN),
    });
    this.addChild(draw);

    const drawText = new TextObject(manager, 'Draw:', TextAlign.Right);

    drawText.setPosition({
      x: -(CARD_W + 3 * CARD_MARGIN + 2),
      y: -4 * CARD_MARGIN - 1.5 * CARD_H,
    });

    this.addChild(drawText);

    this.addChild(new Hand(manager));

    this.positionSelf();
  }

  positionSelf() {
    const { width, height } = this.manager.renderer;

    this.setPosition({
      x: width,
      y: height,
    });
  }
}

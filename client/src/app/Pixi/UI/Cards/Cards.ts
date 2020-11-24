import { PixiManager, GameZIndex } from '../../../../api/PixiManager';
import { ClickState } from '../../MouseManager';
import { PixiObject } from '../../PixiObject';
import { CHAR_H } from '../../Utils/FontLoader';
import { TextObject, TextAlign } from '../../Utils/TextObject';
import { CARD_MARGIN } from '../Shop/Shop';
import { CARD_W, CARD_H } from '../Shop/ShopCard';
import { CancelDraw } from './CancelDraw';
import { DrawCard } from './DrawCard';
import { Hand } from './Hand';
import { SpellItem } from './SpellItem';

export class Cards extends PixiObject {
  cancel: PixiObject;
  msg: PixiObject;

  drawText: PixiObject;
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

    this.drawText = new TextObject(manager, 'Draw:', TextAlign.Right);
    this.drawText.setPosition({
      x: -(CARD_W + 3 * CARD_MARGIN + 2),
      y: -4 * CARD_MARGIN - 1.5 * CARD_H,
    });
    this.addChild(this.drawText);

    this.msg = new TextObject(
      manager,
      'Click a slot below to replace',
      TextAlign.Right
    );
    this.msg.setPosition({
      x: -(CARD_W + 3 * CARD_MARGIN + 2),
      y: -4 * CARD_MARGIN - 1.5 * CARD_H - CHAR_H,
    });
    this.addChild(this.msg);

    this.cancel = new CancelDraw(manager);
    this.cancel.setPosition({
      x: -(CARD_W + 3 * CARD_MARGIN + 2),
      y: -4 * CARD_MARGIN - 1.5 * CARD_H + CHAR_H,
    });
    this.addChild(this.cancel);

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

  loop() {
    super.loop();

    const { clickState } = this.manager.mouseManager;

    if (clickState === ClickState.Drawing) {
      this.drawText.setActive(false);
      this.cancel.setActive(true);
      this.msg.setActive(true);
    } else {
      this.drawText.setActive(true);
      this.cancel.setActive(false);
      this.msg.setActive(false);
    }
  }
}

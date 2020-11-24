import { PixiManager } from '../../../../api/PixiManager';
import { PixiObject } from '../../PixiObject';
import { CARD_MARGIN } from '../Shop/Shop';
import { CARD_W } from '../Shop/ShopCard';
import { SpellItem } from './SpellItem';

export class Hand extends PixiObject {
  e0: SpellItem;
  e1: SpellItem;
  e2: SpellItem;

  constructor(manager: PixiManager) {
    super(manager);

    this.e0 = new SpellItem(manager, 0, 1);
    this.e1 = new SpellItem(manager, 1, 3);
    this.e2 = new SpellItem(manager, 2, 5);

    const w = CARD_W + CARD_MARGIN;

    this.e2.setPosition({ x: -w, y: -w });
    this.e1.setPosition({ x: -2 * w, y: -w });
    this.e0.setPosition({ x: -3 * w, y: -w });

    this.addChild(this.e0, this.e1, this.e2);
  }

  loop() {
    super.loop();

    const { myHand } = this.manager.api.gameState;

    this.e0.setType(myHand.cards[0]);
    this.e1.setType(myHand.cards[1]);
    this.e2.setType(myHand.cards[2]);
  }
}

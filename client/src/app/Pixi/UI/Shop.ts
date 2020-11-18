import { PixiManager, GameZIndex } from '../../../api/PixiManager';
import { PieceType } from '../../../_types/global/GlobalTypes';
import { PixiObject } from '../PixiObject';
import { CARD_H, CARD_W } from './ShopCard';
import { ShopItem } from './ShopItem';

const NUM_SHIPS = 5;

const CARD_MARGIN = 4;

export class Shop extends PixiObject {
  constructor(manager: PixiManager) {
    super(manager, GameZIndex.Shop);

    let idx = 0;
    for (
      let type = PieceType.Cruiser_01;
      type <= PieceType.Warship_05;
      type++
    ) {
      const shopEntry = new ShopItem(manager, type);
      shopEntry.setPosition({ x: idx * (CARD_W + CARD_MARGIN), y: 0 });
      this.addChild(shopEntry);
      idx++;
    }

    this.positionSelf();
  }

  positionSelf() {
    const { width, height } = this.manager.renderer;
    const shopX = 0.5 * (width - this.getWidth());
    this.setPosition({ x: shopX, y: height - CARD_H - 4 });
  }

  getWidth() {
    return NUM_SHIPS * CARD_W + (NUM_SHIPS - 1) * CARD_MARGIN;
  }
}

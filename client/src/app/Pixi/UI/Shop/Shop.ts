import { InitState } from '../../../../api/GameAPI';
import { PixiManager, GameZIndex } from '../../../../api/PixiManager';
import { PieceType } from '../../../../_types/global/GlobalTypes';
import { PixiObject } from '../../PixiObject';
import { CARD_H, CARD_W } from './ShopCard';
import { ShopItem } from './ShopItem';

const NUM_SHIPS = 5;

export const CARD_MARGIN = 2;

export class Shop extends PixiObject {
  constructor(manager: PixiManager) {
    super(manager, GameZIndex.Shop);

    if (manager.spectator) {
      this.setActive(false);
      return;
    }

    let idx = 0;
    for (
      let type = PieceType.Cruiser_01;
      type <= PieceType.Warship_05;
      type++
    ) {
      const shopEntry = new ShopItem(manager, type);
      if (idx <= 1) {
        shopEntry.setPosition({ x: idx * (CARD_W + CARD_MARGIN), y: 0 });
      } else {
        shopEntry.setPosition({
          x: (idx - 2) * (CARD_W + CARD_MARGIN),
          y: CARD_MARGIN + CARD_H,
        });
      }
      this.addChild(shopEntry);
      idx++;
    }

    this.positionSelf();
  }

  positionSelf() {
    const { width, height } = this.manager.renderer;
    const shopX = 4;
    this.setPosition({ x: shopX, y: height - 2 * (CARD_H + CARD_MARGIN) });
  }

  getWidth() {
    return NUM_SHIPS * CARD_W + (NUM_SHIPS - 1) * CARD_MARGIN;
  }

  loop() {
    super.loop();
    const { api } = this.manager;
    this.object.visible = api.getInitState() === InitState.GameStarted;
  }
}

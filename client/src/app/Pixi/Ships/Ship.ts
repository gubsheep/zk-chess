import * as PIXI from 'pixi.js';
import { PixiManager } from '../../../api/PixiManager';
import { VisiblePiece, PieceType } from '../../../_types/global/GlobalTypes';
import { Wrapper } from '../PixiObject';
import { PieceObject } from './PieceObject';
import { BoardCoords, CanvasCoords } from '../@PixiTypes';
import { boardCoordsFromLoc, idxsIncludes } from '../Utils/PixiUtils';
import { StatIcon, StatType, STATICON_W } from '../Utils/StatIcon';
import { SPRITE_W } from '../Utils/TextureLoader';
import { ShipSprite } from './ShipSprite';
import { ClickState } from '../MouseManager';

const waterline = (type: PieceType): number => {
  if (type === PieceType.Submarine_04) return 32;
  else return 28;
};

export class Ship extends PieceObject {
  coords: BoardCoords;

  mask: PIXI.Graphics;
  pieceData: VisiblePiece;

  atkObj: StatIcon;
  hpObj: StatIcon;

  waterline: PIXI.Graphics;

  constructor(manager: PixiManager, data: VisiblePiece) {
    super(manager, data);

    const atkObj = new StatIcon(manager, StatType.Atk);
    const hpObj = new StatIcon(manager, StatType.Hp);
    this.atkObj = atkObj;
    this.hpObj = hpObj;

    this.addChild(atkObj, hpObj);

    const iconY = 1;
    atkObj.setPosition({ x: SPRITE_W - 2 * STATICON_W - 3, y: iconY });
    hpObj.setPosition({ x: SPRITE_W - STATICON_W, y: iconY });
    this.shipContainer.addChild(atkObj, hpObj);

    this.waterline = new PIXI.Graphics();
    this.object.addChild(this.waterline);

    const hitArea = new PIXI.Rectangle(0, 0, SPRITE_W, SPRITE_W);
    this.setInteractive({
      hitArea,
      mouseover: this.onMouseOver,
      mouseout: this.onMouseOut,
      click: this.onClick,
    });

    const mask = new PIXI.Graphics();
    this.sprite.object.mask = mask;
    this.mask = mask;
    this.updateMask();

    const coords = boardCoordsFromLoc(data.location);
    this.coords = coords;
    this.setLocation(coords);
  }

  calcLoc({ x, y }: CanvasCoords): CanvasCoords {
    return { x: x + 2, y: y + 2 };
  }

  setPosition({ x, y }: CanvasCoords) {
    super.setPosition({ x, y });
    this.updateMask();
  }

  setMaskEnabled(enabled: boolean) {
    if (enabled) {
      this.sprite.object.mask = this.mask;
      this.waterline.visible = true;
    } else {
      this.sprite.object.mask = null;
      this.waterline.visible = false;
    }
  }

  private updateMask() {
    const { x, y } = this.object.position;
    const mask = this.mask;
    mask.clear();
    mask.beginFill(0xffffff, 1.0);
    mask.drawRect(x, y, SPRITE_W, waterline(this.getType()));
    mask.endFill();
  }

  onMouseOver() {
    super.onMouseOver();
    this.manager.mouseManager.setHoveringShip(this);
  }

  onMouseOut() {
    super.onMouseOut();
    this.manager.mouseManager.setHoveringShip(null);
  }

  onClick() {
    const { api, mouseManager } = this.manager;
    if (api.isMyTurn()) {
      if (this.pieceData.id === api.getMyMothership().pieceData.id) {
        const gold = api.getGold();
        if (gold == 0) return;
        mouseManager.buyShip(Math.min(gold, 5));
      } else {
        mouseManager.shipClicked(this);
      }
    }
  }

  loop() {
    super.loop();

    const { hp, atk } = this.pieceData;
    this.atkObj.setValue(atk);
    this.hpObj.setValue(hp);

    // check if is hoverable
    const {
      api,
      mouseManager: { clickState, attackIdxs, moveAttackIdxs, selectedShip },
    } = this.manager;
    if (clickState === ClickState.None) {
      this.setHoverable(!api.hasAttacked(this));
    } else if (
      clickState === ClickState.Acting &&
      selectedShip?.isZk() === false
    ) {
      if (api.ownedByMe(this)) this.setHoverable(!api.hasAttacked(this));
      else {
        // in attack range
        const idx = boardCoordsFromLoc(this.pieceData.location);
        const attack = idxsIncludes(attackIdxs, idx);
        const movAtk = idxsIncludes(
          moveAttackIdxs.map((el) => el.attack),
          idx
        );
        if (attack || movAtk) this.setHoverable(true);
      }
    }

    if (this.isSelected()) {
      this.setMaskEnabled(false);
    } else {
      this.setMaskEnabled(!this.hoverable || !this.hover);
    }

    // bob
    this.bob();
  }

  private bob() {
    const { api } = this.manager;
    const frames = api.hasAttacked(this) ? 60 : 30;

    const boat = this.shipContainer;
    this.waterline.clear();
    if (this.manager.frameCount % (2 * frames) < frames) {
      boat.setPosition({ y: 2 });
      this.waterline.beginFill(0x000000, 0.8);
      this.waterline.drawRect(3, 27, 26, 1);
    } else {
      boat.setPosition({ y: 1 });
      this.waterline.beginFill(0x000000, 0.6);
      this.waterline.drawRect(5, 27, 22, 1);
    }
    this.waterline.endFill();
    this.updateMask();
  }
}

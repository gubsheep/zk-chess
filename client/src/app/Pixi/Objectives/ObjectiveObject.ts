import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../../api/PixiManager';
import { Objective } from '../../../_types/global/GlobalTypes';
import { BoardCoords } from '../@PixiTypes';
import { PixiObject, Wrapper } from '../PixiObject';
import { boardCoordsFromLoc, compareBoardCoords } from '../Utils/PixiUtils';
import { WATERLINE, SPRITE_W } from '../Utils/TextureLoader';
import { ObjectiveSprite } from './ObjectiveSprite';

// TODO write gridobject abstraction for this and ships?
export class ObjectiveObject extends PixiObject {
  objectiveData: Objective;
  sprite: ObjectiveSprite;
  mask: PIXI.Graphics;
  waterline: PixiObject;

  constructor(manager: PixiManager, objective: Objective) {
    super(manager, GameZIndex.Board);

    this.objectiveData = objective;

    this.sprite = new ObjectiveSprite(manager, null);
    this.addChild(this.sprite);
    this.setLocation(boardCoordsFromLoc(objective.location));

    const waterSprite = new PIXI.Sprite(PIXI.utils.TextureCache[WATERLINE]);
    this.waterline = new Wrapper(manager, waterSprite);
    this.addChild(this.waterline);

    const mask = new PIXI.Graphics();
    this.sprite.object.mask = mask;
    this.mask = mask;
  }

  setLocation(coords: BoardCoords) {
    const topLeft = this.manager.gameBoard.getTopLeft(coords);
    if (topLeft) {
      this.setPosition({ x: topLeft.x + 2, y: topLeft.y + 2 });
    } else {
      console.error('tried to move objective out of bounds');
    }
  }

  loop() {
    super.loop();
    const { api } = this.manager;
    const coords = boardCoordsFromLoc(this.objectiveData.location);
    const shipAt = api.shipAt(coords);
    if (shipAt) {
      this.sprite.setColor(api.getColor(shipAt.pieceData.owner));
      this.setAlpha(0.5);
    } else {
      this.sprite.setColor(null);
      this.setAlpha(1);
    }

    const { moveStaged, selectedShip } = this.manager.mouseManager;
    if (
      !selectedShip?.isZk() &&
      compareBoardCoords(
        moveStaged,
        boardCoordsFromLoc(this.objectiveData.location)
      )
    ) {
      this.sprite.setColor(api.getMyColor());
    }

    this.bob();
  }

  private bob() {
    const { x, y } = this.object.position;
    const mask = this.mask;
    mask.clear();
    mask.beginFill(0xffffff, 1.0);
    mask.drawRect(x, y, SPRITE_W, SPRITE_W);
    mask.endFill();

    const frames = 30;
    if (this.manager.frameCount % (2 * frames) < frames) {
      this.waterline.setPosition({ y: 0 });
    } else {
      this.waterline.setPosition({ y: -1 });
    }
  }
}

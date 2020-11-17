import { PixiManager } from '../../api/PixiManager';
import { Objective } from '../../_types/global/GlobalTypes';
import { GameObject, Wrapper } from './GameObject';
import { ObjectiveSprite } from './ObjectiveSprite';
import { BoardCoords } from './PixiTypes';
import { boardCoordsFromLoc, makeRect } from './PixiUtils';

// TODO write gridobject abstraction for this and ships?
export class ObjectiveObject extends GameObject {
  objectiveData: Objective;
  sprite: ObjectiveSprite;

  constructor(manager: PixiManager, objective: Objective) {
    super(manager);

    this.objectiveData = objective;

    this.sprite = new ObjectiveSprite(manager, null);
    this.addChild(this.sprite);
    this.setLocation(boardCoordsFromLoc(objective.location));
  }

  setLocation(coords: BoardCoords) {
    const topLeft = this.manager.gameBoard.getTopLeft(coords);
    this.setPosition({ x: topLeft.x + 2, y: topLeft.y + 2 });
  }

  loop() {
    super.loop();
    const { api } = this.manager;
    const coords = boardCoordsFromLoc(this.objectiveData.location);
    const shipAt = api.shipAt(coords);
    if (shipAt) {
      this.sprite.setColor(api.getColor(shipAt.pieceData.owner));
    } else {
      this.sprite.setColor(null);
    }
  }
}

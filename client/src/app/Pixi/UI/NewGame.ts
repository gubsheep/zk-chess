import { PixiManager } from "../../../api/PixiManager";
import { LinkObject } from "../Utils/LinkObject";

export class NewGame extends LinkObject {
  constructor(manager: PixiManager) {
    super(manager, 'Click to create new game');
  }

  onClick() {
    this.manager.api.newGame();
  }
}

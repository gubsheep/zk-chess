import autoBind from 'auto-bind';
import * as PIXI from 'pixi.js';
import { PixiManager } from '../../api/PixiManager';
import { CanvasCoords } from './PixiTypes';

const autoIncrement = (() => {
  let count = 0;
  return () => count++;
})();
// top-level game object abstraction. all of our game things should be wrapped in these guys
export class GameObject {
  id: number;
  object: PIXI.Container;
  children: GameObject[];

  manager: PixiManager;

  lifetime: number;

  // skip inactive ones; we don't have enough objects to care about killing
  active: boolean = true;

  // TODO refactor this so that it doesn't need to be given a container
  constructor(
    manager: PixiManager,
    zIndex: number = 0
  ) {
    this.id = autoIncrement();
    this.manager = manager;

    this.object = new PIXI.Container();
    this.lifetime = 0;
    this.children = [];
    this.object.zIndex = zIndex;

    autoBind(this);
  }

  addChild(...children: GameObject[]) {
    children.forEach((child) => {
      this.object.addChild(child.object);
      this.children.push(child);
    });
  }

  setActive(active: boolean) {
    this.active = active;
    this.object.visible = active;
  }

  loop() {
    for (const obj of this.children) {
      if (obj.active) obj.loop();
    }
    this.lifetime++;
  }

  destroy() {
    this.active = false;
    this.manager.app.stage.removeChild(this.object);
    // technically we should deallocate the object but whatever
    // this.object = null;
  }

  setPosition({ x, y }: CanvasCoords) {
    this.object.position.set(x, y);
  }
}

import autoBind from 'auto-bind';
import * as PIXI from 'pixi.js';
import { PixiManager } from '../../api/PixiManager';
import { CanvasCoords } from './PixiTypes';

// top-level game object abstraction. all of our game things should be wrapped in these guys
export class GameObject {
  object: PIXI.Container;
  children: GameObject[]; // do we actually need this?

  manager: PixiManager;

  lifetime: number;

  // skip inactive ones; we don't have enough objects to care about killing
  active: boolean = true;

  constructor(
    manager: PixiManager,
    object: PIXI.Container,
    zIndex: number = 0
  ) {
    this.manager = manager;

    this.object = object;
    this.lifetime = 0;
    this.children = [];
    this.object.zIndex = zIndex;
    autoBind(this);
  }

  addChild(child: GameObject) {
    this.object.addChild(child.object);
    this.children.push(child);
  }

  loop() {
    for (const obj of this.children) {
      obj.loop();
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

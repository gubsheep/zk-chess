import autoBind from 'auto-bind';
import * as PIXI from 'pixi.js';
import { PixiManager } from '../../api/PixiManager';
import { CanvasCoords } from './PixiTypes';

// top-level game object abstraction. all of our game things should be wrapped in these guys
export class GameObject {
  object: PIXI.DisplayObject;
  children: GameObject[]; // do we actually need this?

  manager: PixiManager;

  lifetime: number;

  // skip inactive ones; we don't have enough objects to care about killing
  active: boolean = true;

  constructor(manager: PixiManager, object: PIXI.DisplayObject) {
    this.manager = manager;
    manager.app.stage.addChild(object);

    this.object = object;
    this.lifetime = 0;
    this.children = [];
    autoBind(this);
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

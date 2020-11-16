import autoBind from 'auto-bind';
import * as PIXI from 'pixi.js';
import { PixiManager } from '../../api/PixiManager';
import { CanvasCoords } from './PixiTypes';

const autoIncrement = (() => {
  let count = 0;
  return () => count++;
})();

export enum PixiEvents {
  mouseover = 'mouseover',
  mouseout = 'mouseout',
  mousemove = 'mousemove',
  mousedown = 'mousedown',
  mouseup = 'mouseup',
  mouseupoutside = 'mouseupoutside',
  click = 'click',
}

type HandlerProps = Record<PixiEvents, Function>;

// TODO do this smartly using typescript
export type GameObjectInteractiveProps = {
  hitArea?: PIXI.Rectangle;
} & Partial<HandlerProps>;
// top-level game object abstraction. all of our game things should be wrapped in these guys
export class GameObject {
  id: number;
  object: PIXI.Container;
  children: GameObject[];

  manager: PixiManager;

  lifetime: number;

  // skip inactive ones; we don't have enough objects to care about killing
  active: boolean;

  filters: PIXI.Filter[];
  alphaFilter: PIXI.filters.AlphaFilter;

  // TODO refactor this so that it doesn't need to be given a container
  constructor(manager: PixiManager, zIndex: number = 0) {
    this.id = autoIncrement();
    this.manager = manager;

    this.object = new PIXI.Container();
    this.lifetime = 0;
    this.children = [];
    this.object.zIndex = zIndex;
    this.active = true;

    this.filters = [];
    this.alphaFilter = new PIXI.filters.AlphaFilter(1);
    this.updateFilters();

    autoBind(this);
  }

  addChild(...children: GameObject[]): void {
    children.forEach((child) => {
      this.object.addChild(child.object);
      this.children.push(child);
    });
  }

  setActive(active: boolean): void {
    this.active = active;
    this.object.visible = active;
  }

  loop(): void {
    for (const obj of this.children) {
      if (obj.active) obj.loop();
    }
    this.lifetime++;
  }

  destroy(): void {
    this.active = false;
    this.manager.app.stage.removeChild(this.object);
    // technically we should deallocate the object but whatever
    // this.object = null;
  }

  setPosition({ x, y }: CanvasCoords): void {
    this.object.position.set(x, y);
  }

  setInteractive(props: GameObjectInteractiveProps | null): void {
    if (props === null) {
      this.object.interactive = false;
      this.object.removeAllListeners();
      return;
    } else {
      this.object.interactive = true;
      const { hitArea } = props;
      if (hitArea) this.object.hitArea = hitArea;
      const handlerKeys = Object.keys(PixiEvents) as PixiEvents[];
      for (const key of handlerKeys) {
        if (props[key]) this.object.on(key, props[key] as Function);
      }
    }
  }

  setFilters(filters: PIXI.Filter[]) {
    this.filters = filters;
    this.updateFilters();
  }

  setAlpha(alpha: number) {
    this.alphaFilter.alpha = alpha;
  }

  private updateFilters() {
    let colorFilter: PIXI.Filter[] = [];
    this.object.filters = [...colorFilter, ...this.filters, this.alphaFilter];
  }
}

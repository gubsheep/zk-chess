import autoBind from 'auto-bind';
import * as PIXI from 'pixi.js';
import { GameZIndex, PixiManager } from '../../api/PixiManager';
import { ZKPiece } from '../../_types/global/GlobalTypes';
import Game from '../Game';
import { CanvasCoords } from './@PixiTypes';
import { objFromHitArea } from './PixiUtils';

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
export type InteractiveProps = {
  hitArea?: PIXI.Rectangle;
  debug?: boolean;
} & Partial<HandlerProps>;
// top-level game object abstraction. all of our game things should be wrapped in these guys
export class PixiObject {
  objectId: number;
  object: PIXI.Container;
  children: PixiObject[];

  manager: PixiManager;

  lifetime: number;

  // skip inactive ones; we don't have enough objects to care about killing
  active: boolean;

  filters: PIXI.Filter[];
  alphaFilter: PIXI.filters.AlphaFilter;

  layer: number;

  // TODO refactor this so that it doesn't need to be given a container
  constructor(manager: PixiManager, layer: GameZIndex = GameZIndex.Default) {
    this.objectId = autoIncrement();
    this.layer = layer;
    this.manager = manager;

    this.object = new PIXI.Container();
    this.lifetime = 0;
    this.children = [];
    this.active = true;

    this.filters = [];
    this.alphaFilter = new PIXI.filters.AlphaFilter(1);
    this.updateFilters();

    this.object.sortableChildren = true;

    autoBind(this);
  }

  addChild(...children: PixiObject[]): void {
    children.forEach((child) => {
      this.object.addChild(child.object);
      this.children.push(child);
    });
  }

  removeChild(...children: PixiObject[]): void {
    children.forEach((child) => {
      this.object.removeChild(child.object);
      for (let i = 0; i < this.children.length; i++) {
        if (this.children[i].objectId === child.objectId)
          this.children.splice(i--, 1);
      }
    });
  }

  setActive(active: boolean): void {
    this.active = active;
    this.object.visible = active;
  }

  setZIndex(zIndex: number): void {
    this.object.zIndex = zIndex;
  }

  loop(): void {
    for (const obj of this.children) {
      if (obj.active) obj.loop();
    }
    this.lifetime++;
  }

  destroy(): void {
    this.active = false;
    this.manager.stage.removeChild(this.object);
    // technically we should deallocate the object but whatever
    // this.object = null;
  }

  setPosition({ x, y }: Partial<CanvasCoords>): void {
    if (x !== undefined) this.object.x = x;
    if (y !== undefined) this.object.y = y;
  }

  setInteractive(props: InteractiveProps | null): void {
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

    if (props.debug && props.hitArea) {
      const debugRect = objFromHitArea(props.hitArea);
      debugRect.zIndex = -999;
      this.object.addChild(debugRect);
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

export class Wrapper extends PixiObject {
  constructor(manager: PixiManager, object: PIXI.Container) {
    super(manager);
    this.object.addChild(object);
  }
}

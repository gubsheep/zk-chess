import { GameZIndex, PixiManager } from '../../../api/PixiManager';
import { Objective } from '../../../_types/global/GlobalTypes';
import { PixiObject, Wrapper } from '../PixiObject';
import { ObjectiveObject } from './ObjectiveObject';
import * as PIXI from 'pixi.js';

export class ObjectiveManager extends PixiObject {
  objectives: ObjectiveObject[];
  objLayer: Wrapper;

  constructor(manager: PixiManager) {
    super(manager, GameZIndex.Objectives);
    this.objLayer = new Wrapper(manager, new PIXI.Container());
    this.addChild(this.objLayer);

    this.objectives = [];
  }

  addObjective(objective: Objective): void {
    const obj = new ObjectiveObject(this.manager, objective);
    this.objectives.push(obj);
    this.objLayer.addChild(obj);
  }

  clear() {
    for (const obj of this.objectives) {
      this.objLayer.removeChild(obj);
    }
    this.objectives = [];
  }
}

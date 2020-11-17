import autoBind from 'auto-bind';
import * as PIXI from 'pixi.js';
import { FontLoader, getFontLoader } from '../app/PixiUtils/FontLoader';
import { GameObject } from '../app/PixiUtils/GameObject';
import { FONT, loadTextures } from '../app/PixiUtils/TextureLoader';
import { ResourceBars } from '../app/PixiUtils/ResourceBars';
import { Shop } from '../app/PixiUtils/Shop';
import { GameBoard } from '../app/PixiUtils/GameBoard';
import { Background } from '../app/PixiUtils/Background';
import { MouseManager } from '../app/PixiUtils/MouseManager';
import AbstractGameManager from './AbstractGameManager';
import { GameAPI } from './GameAPI';
import { ShipManager } from '../app/PixiUtils/ShipManager';
import { ObjectiveManager } from '../app/PixiUtils/ObjectiveManager';

type InitProps = {
  canvas: HTMLCanvasElement;
  gameManager: AbstractGameManager;
};

export enum GameZIndex {
  Default,
  Background,
  Board,
  Objectives,
  Ships,
  UI,
  Shop,
  MAX = Shop,
}

// this guy should only have to think about game objects and how they interact
// game logic, api stuff should be offloaded

export class PixiManager {
  static instance: PixiManager | null;
  canvas: HTMLCanvasElement;

  stage: PIXI.Container;
  renderer: PIXI.Renderer;

  frameRequestId: number;
  frameCount: number;

  fontLoader: FontLoader;
  mouseManager: MouseManager;
  api: GameAPI;

  layers: PIXI.Container[];
  gameObjects: GameObject[];

  gameBoard: GameBoard;
  shipManager: ShipManager;
  objectiveManager: ObjectiveManager;

  private constructor(props: InitProps) {
    const { canvas, gameManager } = props;
    this.canvas = canvas;
    const { width, height } = canvas;

    // set up app
    let renderer = new PIXI.Renderer({
      width,
      height,
      view: canvas,
      resolution: 1,
    });
    this.renderer = renderer;

    const container = new PIXI.Container();
    this.stage = container;
    this.stage.sortableChildren = true;

    // initialize defaults
    this.frameCount = 0;
    this.gameObjects = [];

    this.layers = Array(Object.keys(GameZIndex).length)
      .fill(null)
      .map((_e) => new PIXI.Container());
    for (let i = GameZIndex.Default; i <= GameZIndex.MAX; i++) {
      this.layers[i].zIndex = i;
      this.stage.addChild(this.layers[i]);
    }

    // set up managers
    this.shipManager = new ShipManager(this);
    this.addObject(this.shipManager);

    this.objectiveManager = new ObjectiveManager(this);
    this.addObject(this.objectiveManager);

    this.mouseManager = new MouseManager(this);
    this.api = new GameAPI(this, gameManager);

    autoBind(this);

    // can't put `this.setup` directly or it won't bind `this`
    loadTextures(() => this.setup());
  }

  removeObject(obj: GameObject) {
    for (let i = 0; i < this.gameObjects.length; i++) {
      if (this.gameObjects[i].objectId === obj.objectId) {
        this.gameObjects.splice(i, 1);
        this.layers[obj.layer].removeChild(obj.object);
        return;
      }
    }
  }

  addObject(obj: GameObject) {
    // TODO manage systems, components, etc.
    this.gameObjects.push(obj);
    this.layers[obj.layer].addChild(obj.object);
  }

  private setup() {
    const cache = PIXI.utils.TextureCache;
    this.fontLoader = getFontLoader(cache[FONT]);

    this.renderer.backgroundColor = 0x061639; // TODO set fallback color

    // set up background
    this.addObject(new Background(this));

    // set up grid
    // this is definitely a bad way of doing it, but whatever TODO fix
    this.gameBoard = new GameBoard(this);
    this.addObject(this.gameBoard);

    this.api.syncShips();
    this.api.syncObjectives();

    // set up resource bars
    this.addObject(new ResourceBars(this));

    // set up shop
    this.addObject(new Shop(this));

    // initialize loop
    this.loop();
  }

  private loop() {
    for (const obj of this.gameObjects) {
      if (obj.active) obj.loop();
    }

    this.renderer.render(this.stage);

    this.frameCount++;
    this.frameRequestId = window.requestAnimationFrame(this.loop);
  }

  static destroy() {
    if (PixiManager.instance) {
      window.cancelAnimationFrame(PixiManager.instance.frameRequestId);
      PixiManager.instance = null;
    }
    return null;
  }

  static initialize(props: InitProps) {
    const pixiManager = new PixiManager(props);
    PixiManager.instance = pixiManager;
    return pixiManager;
  }
}

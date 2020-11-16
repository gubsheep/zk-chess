import autoBind from 'auto-bind';
import * as PIXI from 'pixi.js';
import { FontLoader, getFontLoader } from '../app/PixiUtils/FontLoader';
import { GameObject } from '../app/PixiUtils/GameObject';
import { Ship } from '../app/PixiUtils/Ships';
import { FONT, loadTextures } from '../app/PixiUtils/TextureLoader';
import { ResourceBars } from '../app/PixiUtils/ResourceBars';
import { Shop } from './Shop';
import { GameBoard } from '../app/PixiUtils/GameBoard';
import { Background } from '../app/PixiUtils/Background';
import { MouseManager } from '../app/PixiUtils/MouseManager';
import AbstractGameManager from './AbstractGameManager';
import { GameAPI } from './GameAPI';
import { render } from 'react-dom';

type InitProps = {
  canvas: HTMLCanvasElement;
  gameManager: AbstractGameManager;
};

export enum GameZIndex {
  Background,
  Board,
  Ships,
  UI,
  Shop,
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

  gameObjects: GameObject[];

  gameBoard: GameBoard;

  ships: Ship[];

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
    this.ships = [];
    this.gameObjects = [];
    this.frameCount = 0;

    // set up managers
    this.mouseManager = new MouseManager(this);
    this.api = new GameAPI(this, gameManager);

    autoBind(this);

    // can't put `this.setup` directly or it won't bind `this`
    loadTextures(() => this.setup());
  }

  removeObject(obj: GameObject) {
    for (let i = 0; i < this.gameObjects.length; i++) {
      if (this.gameObjects[i].id === obj.id) {
        this.gameObjects.splice(i, 1);
        this.stage.removeChild(obj.object);
        return;
      }
    }
  }

  removeLazy(obj: GameObject) {
    obj.setActive(false);
  }

  flush() {
    const objs = this.gameObjects;
    for (let i = 0; i < objs.length; i++) {
      if (!objs[i].active) {
        this.stage.removeChild(objs[i].object);
        objs.splice(i--, 1);
      }
    }
  }

  clearShips() {
    for (const ship of this.ships) this.removeLazy(ship);
    this.flush(); // TODO debug this, seems broken
    this.ships = [];
  }

  addObject(obj: GameObject) {
    // TODO manage systems, components, etc.
    this.gameObjects.push(obj);
    this.stage.addChild(obj.object);
  }

  addShip(obj: Ship) {
    this.addObject(obj);
    this.ships.push(obj);
  }

  private setup() {
    const cache = PIXI.utils.TextureCache;
    this.fontLoader = getFontLoader(cache[FONT]);

    this.renderer.backgroundColor = 0x061639; // TODO set fallback color

    // set up background
    this.addObject(new Background(this));

    // set up grid
    // this is definitely a bad way of doing it, but whatever TODO fix
    const gameBoard = new GameBoard(this);
    this.gameBoard = gameBoard;
    this.addObject(gameBoard);

    this.api.syncShips();

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

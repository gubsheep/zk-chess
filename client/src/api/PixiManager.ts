import autoBind from 'auto-bind';
import * as PIXI from 'pixi.js';
import { FontLoader, getFontLoader } from '../app/PixiUtils/FontLoader';
import { GameObject } from '../app/PixiUtils/GameObject';
import { Mothership, Ship } from '../app/PixiUtils/Ships';
import {
  CanvasCoords,
  PlayerColor,
  ShipType,
} from '../app/PixiUtils/PixiTypes';
import { FONT, loadTextures } from '../app/PixiUtils/TextureLoader';
import { GoldBar, HPBar } from '../app/PixiUtils/ResourceBars';
import { ToggleButton } from '../app/PixiUtils/ToggleButton';
import { Shop } from './Shop';
import { makeGrid } from '../app/PixiUtils/GameBoard';
import { Background } from '../app/PixiUtils/Background';

type InitProps = {
  canvas: HTMLCanvasElement;
};

export enum GameZIndex {
  Background,
  Board,
  Ships,
  UI,
  Shop,
}

export class PixiManager {
  static instance: PixiManager | null;
  canvas: HTMLCanvasElement;
  app: PIXI.Application;

  frameRequestId: number;
  frameCount: number;

  fontLoader: FontLoader;

  gameObjects: GameObject[];

  boardCoords: CanvasCoords[][];
  hpBar: HPBar;
  goldBar: GoldBar;

  // pieces: PIXI.Container[];

  private constructor(props: InitProps) {
    const { canvas } = props;
    this.canvas = canvas;

    const width = canvas.width;
    const height = canvas.height;

    let app = new PIXI.Application({
      width,
      height,
      view: canvas,
      resolution: 1,
    });
    this.app = app;
    this.app.stage.sortableChildren = true;
    // this.pieces = [];
    this.gameObjects = [];
    this.frameCount = 0;

    autoBind(this);

    // can't put `this.setup` directly or it won't bind `this`
    loadTextures(() => this.setup());
  }

  addObject(obj: GameObject) {
    // TODO manage systems, components, etc.
    this.gameObjects.push(obj);
    this.app.stage.addChild(obj.object);
  }

  setup() {
    const cache = PIXI.utils.TextureCache;
    this.fontLoader = getFontLoader(cache[FONT]);

    const app = this.app;
    const { width, height } = this.app.renderer;

    app.renderer.backgroundColor = 0x061639; // TODO set fallback color

    // set up background
    this.addObject(new Background(this));

    // set up grid
    // this is definitely a bad way of doing it, but whatever TODO fix
    this.boardCoords = makeGrid({ width, height, app });

    // make button to toggle b/t ships and submarines
    const toggleButton = new ToggleButton(this);
    this.addObject(toggleButton);
    const botLeft = this.boardCoords[0][4];
    toggleButton.setPosition({ x: botLeft.x, y: botLeft.y + 3 + 36 });

    // set up ships
    this.addObject(new Mothership(this, PlayerColor.Red));
    this.addObject(new Mothership(this, PlayerColor.Blue));

    // set up resource bars
    const hpBar = new HPBar(this);
    this.addObject(hpBar);
    hpBar.setPosition({ x: 10, y: 10 });

    const goldBar = new GoldBar(this);
    this.addObject(goldBar);
    goldBar.setPosition({ x: 10, y: 22 });

    this.hpBar = hpBar;
    this.goldBar = goldBar;

    this.addObject(new Shop(this, true));

    // initialize loop
    this.loop();
  }

  loop() {
    for (const obj of this.gameObjects) {
      if (obj.active) obj.loop();
    }

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

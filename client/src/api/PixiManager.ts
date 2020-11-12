import autoBind from 'auto-bind';
import * as PIXI from 'pixi.js';
import { FontLoader, getFontLoader } from '../app/PixiUtils/FontLoader';
import { GameObject } from '../app/PixiUtils/GameObject';
import { Ship } from '../app/PixiUtils/Ships';
import {
  CanvasCoords,
  PlayerColor,
  ShipType,
} from '../app/PixiUtils/PixiTypes';
import {
  BG_IMAGE,
  FONT,
  ICONS,
  loadTextures,
  SHIPS,
} from '../app/PixiUtils/TextureLoader';
import { makeGrid } from '../app/PixiUtils/Utils';
import { GoldBar, HPBar } from '../app/PixiUtils/ResourceBars';

type InitProps = {
  canvas: HTMLCanvasElement;
};

export class PixiManager {
  static instance: PixiManager | null;
  canvas: HTMLCanvasElement;
  app: PIXI.Application;

  frameRequestId: number;
  frameCount: number;

  fontLoader: FontLoader;

  boardCoords: CanvasCoords[][];
  // pieces: PIXI.Container[];

  gameObjects: GameObject[];

  private constructor(props: InitProps) {
    const { canvas } = props;
    this.canvas = canvas;

    const width = canvas.width;
    const height = canvas.height;

    let app = new PIXI.Application({
      width: width,
      height: height,
      view: canvas,
      resolution: 1,
    });
    this.app = app;
    // this.pieces = [];
    this.gameObjects = [];
    this.frameCount = 0;

    autoBind(this);

    // can't put this.setup directly or it won't bind this
    loadTextures(() => this.setup());
  }

  addObject(obj: GameObject) {
    this.gameObjects.push(obj);
  }

  setup() {
    const cache = PIXI.utils.TextureCache;
    this.fontLoader = getFontLoader(cache[FONT]);

    const app = this.app;
    const { width, height } = this.app.renderer;

    app.renderer.backgroundColor = 0x061639; // TODO set fallback color

    // set up background
    let texture = cache[BG_IMAGE];
    let bgsprite = new PIXI.TilingSprite(texture, width, height);
    app.stage.addChild(bgsprite);

    // set up grid
    // this is definitely a bad way of doing it, but whatever
    this.boardCoords = makeGrid({ width, height, app });

    // set up ships
    this.addObject(
      new Ship(
        this,
        ShipType.Mothership_00,
        { row: 0, col: 0 },
        PlayerColor.Red
      )
    );

    const goldBar = new GoldBar(this);
    this.addObject(goldBar);
    goldBar.object.position.set(25, 25);
    goldBar.setValue(2);

    const hpBar = new HPBar(this);
    this.addObject(hpBar);
    hpBar.object.position.set(25, 40);
    hpBar.setValue(3);

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

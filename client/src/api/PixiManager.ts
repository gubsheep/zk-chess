import autoBind from 'auto-bind';
import * as PIXI from 'pixi.js';
import { FontLoader, getFontLoader } from '../app/PixiUtils/FontLoader';
import { GameObject } from '../app/PixiUtils/GameObject';
import { Mothership, Ship } from '../app/PixiUtils/Ships';
import { PlayerColor, ShipType } from '../app/PixiUtils/PixiTypes';
import { FONT, loadTextures } from '../app/PixiUtils/TextureLoader';
import { ResourceBars } from '../app/PixiUtils/ResourceBars';
import { Shop } from './Shop';
import { GameBoard } from '../app/PixiUtils/GameBoard';
import { Background } from '../app/PixiUtils/Background';
import { Player } from '../_types/global/GlobalTypes';
import { MouseManager } from '../app/PixiUtils/MouseManager';
import { ConfirmCancelButtons } from '../app/PixiUtils/Buttons';
import AbstractGameManager from './AbstractGameManager';
import { GameAPI } from './GameAPI';

type InitProps = {
  canvas: HTMLCanvasElement;
  // gameManager: AbstractGameManager;
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
  mouseManager: MouseManager;
  gameApi: GameAPI;

  gameObjects: GameObject[];

  gameBoard: GameBoard;
  myMothership: Mothership;

  myColor: PlayerColor;

  ships: Ship[];

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
    this.ships = [];
    this.gameObjects = [];
    this.frameCount = 0;
    this.myColor = PlayerColor.Red;
    this.mouseManager = new MouseManager(this);
    this.gameApi = new GameAPI(this);

    autoBind(this);

    // can't put `this.setup` directly or it won't bind `this`
    loadTextures(() => this.setup());
  }

  addObject(obj: GameObject) {
    // TODO manage systems, components, etc.
    this.gameObjects.push(obj);
    this.app.stage.addChild(obj.object);
  }

  addShip(obj: Ship) {
    this.addObject(obj);
    this.ships.push(obj);
  }

  setup() {
    const cache = PIXI.utils.TextureCache;
    this.fontLoader = getFontLoader(cache[FONT]);

    const app = this.app;

    app.renderer.backgroundColor = 0x061639; // TODO set fallback color

    // set up background
    this.addObject(new Background(this));

    // set up grid
    // this is definitely a bad way of doing it, but whatever TODO fix
    const gameBoard = new GameBoard(this);
    this.gameBoard = gameBoard;
    this.addObject(gameBoard);

    // make button to toggle b/t ships and submarines
    // const toggleButton = new ToggleButton(this);
    // this.addObject(toggleButton);
    // const botLeft = this.boardCoords[0][4];
    // toggleButton.setPosition({ x: botLeft.x, y: botLeft.y + 3 + 36 });

    this.addObject(new ConfirmCancelButtons(this));

    // set up ships
    const myMothership = new Mothership(this, PlayerColor.Red);
    this.myMothership = myMothership;
    this.addShip(myMothership);
    this.addShip(new Mothership(this, PlayerColor.Blue));

    this.addShip(
      new Ship(this, ShipType.Cruiser_01, { row: 2, col: 5 }, PlayerColor.Blue)
    );

    // set up resource bars
    this.addObject(new ResourceBars(this));

    // set up shop
    this.addObject(new Shop(this));

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

import autoBind from 'auto-bind';
import * as PIXI from 'pixi.js';
import { PixiObject } from '../app/Pixi/PixiObject';
import { ResourceBars } from '../app/Pixi/UI/ResourceBars';
import { Shop } from '../app/Pixi/UI/Shop';
import { GameBoard } from '../app/Pixi/GameBoard/GameBoard';
import { MouseManager } from '../app/Pixi/MouseManager';
import { GameAPI } from './GameAPI';
import { ObjectiveManager } from '../app/Pixi/Objectives/ObjectiveManager';
import { Background } from '../app/Pixi/Utils/Background';
import { FontLoader, getFontLoader } from '../app/Pixi/Utils/FontLoader';
import { ShipManager } from '../app/Pixi/Ships/ShipManager';
import { loadTextures, FONT } from '../app/Pixi/Utils/TextureLoader';
import { GameOver } from '../app/Pixi/UI/GameOver';
import { GameInitUI } from '../app/Pixi/GameInitUI/GameInitUI';
import { TableNumber } from '../app/Pixi/UI/TableNumber';
import { LandingPageManager } from '../app/Pixi/LandingPageManager';
import { PlayerName } from '../app/Pixi/@PixiTypes';
import GameManager from './GameManager';
import { getGameIdForTable, setGameIdForTable } from './UtilityServerAPI';
import { InitOverlay } from '../app/Pixi/UI/InitOverlay';
import { StagedShip } from '../app/Pixi/GameBoard/StagedShip';
import { Abandoned } from '../app/Pixi/UI/Abandoned';

type InitProps = {
  canvas: HTMLCanvasElement;
  tableId: string;
};

export enum GameZIndex {
  Default,
  Background,
  Board,
  Objectives,
  Ships,
  Staged,
  UI,
  Shop,
  GameOver,
  GameInit,
  MAX = GameInit,
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
  gameObjects: PixiObject[];

  gameBoard: GameBoard;
  shipManager: ShipManager;
  objectiveManager: ObjectiveManager;

  landingManager: LandingPageManager;

  tableId: string;

  spectator: boolean = false;
  playerName: PlayerName;

  private constructor(props: InitProps) {
    const { canvas, tableId } = props;
    this.canvas = canvas;
    this.tableId = tableId;
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
    this.landingManager = new LandingPageManager(this, tableId);

    autoBind(this);

    // can't put `this.setup` directly or it won't bind `this`
    loadTextures(() => this.setup());
  }

  removeObject(obj: PixiObject) {
    for (let i = 0; i < this.gameObjects.length; i++) {
      if (this.gameObjects[i].objectId === obj.objectId) {
        this.gameObjects.splice(i, 1);
        this.layers[obj.layer].removeChild(obj.object);
        return;
      }
    }
  }

  addObject(obj: PixiObject) {
    // TODO manage systems, components, etc.
    this.gameObjects.push(obj);
    this.layers[obj.layer].addChild(obj.object);
  }

  async initGame(player: PlayerName) {
    if (player === PlayerName.Spectator) this.spectator = true;

    this.playerName = player;

    const gameManager = await GameManager.create();
    const gameId = await getGameIdForTable(this.tableId);

    if (!gameId) {
      console.log('creating table');
      await this.api.newGame();
    }

    const trueId = await getGameIdForTable(this.tableId);

    if (trueId) {
      await gameManager.setGame(trueId);
      this.api = new GameAPI(this, gameManager);

      this.gameBoard = new GameBoard(this);
      this.addObject(this.gameBoard);

      this.addObject(new InitOverlay(this));

      this.api.syncShips();
      this.api.syncObjectives();

      this.addObject(new ResourceBars(this));
      this.addObject(new StagedShip(this));
      this.addObject(new Shop(this));
      this.addObject(new GameOver(this));
      this.addObject(new Abandoned(this));
    } else {
      console.error('could not get game id');
    }
  }

  private initUI() {
    this.addObject(new GameInitUI(this));
  }

  private setup() {
    const cache = PIXI.utils.TextureCache;
    this.fontLoader = getFontLoader(cache[FONT]);
    this.renderer.backgroundColor = 0x061639; // TODO set fallback color

    // set up background
    this.addObject(new Background(this));
    this.addObject(new TableNumber(this));

    this.initUI();

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

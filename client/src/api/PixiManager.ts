import autoBind from 'auto-bind';
import * as PIXI from 'pixi.js';
import {PixiObject} from '../app/Pixi/PixiObject';
import {ResourceBars} from '../app/Pixi/UI/ResourceBars';
import {Shop} from '../app/Pixi/UI/Shop/Shop';
import {GameBoard} from '../app/Pixi/GameBoard/GameBoard';
import {MouseManager} from '../app/Pixi/MouseManager';
import {GameAPI} from './GameAPI';
import {ObjectiveManager} from '../app/Pixi/Objectives/ObjectiveManager';
import {Background} from '../app/Pixi/Utils/Background';
import {FontLoader, getFontLoader} from '../app/Pixi/Utils/FontLoader';
import {ShipManager} from '../app/Pixi/Ships/ShipManager';
import {loadTextures, FONT} from '../app/Pixi/Utils/TextureLoader';
import {GameOver} from '../app/Pixi/UI/GameOver';
import {PlayerName} from '../app/Pixi/@PixiTypes';
import GameManager from './GameManager';
import {getGameIdForTable, setGameIdForTable} from './UtilityServerAPI';
import {StagedShip} from '../app/Pixi/GameBoard/StagedShip';
import {GameInitUI} from '../app/Pixi/GameInitUI/GameInitUI';
import {LandingPageManager} from '../app/Pixi/LandingPageManager';
import {Abandoned} from '../app/Pixi/UI/Abandoned';
import {InitOverlay} from '../app/Pixi/UI/InitOverlay';
import {InitOverlaySpec} from '../app/Pixi/UI/InitOverlaySpec';
import {TableNumber} from '../app/Pixi/UI/TableNumber';
import {Cards} from '../app/Pixi/UI/Cards/Cards';
import {loadSound, setAllVolume} from '../app/Pixi/Utils/SoundLoader';
import {GameManagerEvent} from './AbstractGameManager';

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
    const {canvas, tableId} = props;
    this.canvas = canvas;
    this.tableId = tableId;
    const {width, height} = canvas;

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
    // loadTextures(() => this.setup());
    loadTextures(() => loadSound(() => this.setup()));
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

  async initGame(player: PlayerName, force = false) {
    if (player === PlayerName.Spectator) this.spectator = true;

    console.log('initing game as player ', player);
    console.log('init force is ', force);

    this.playerName = player;

    const gameManager = await GameManager.create();

    const gameId = await getGameIdForTable(this.tableId);
    console.log('got the game id', gameId);

    // if (!gameId && this.spectator) {
    //   alert('no players at this table!');

    //   return;
    // }

    try {
      if ((!gameId || force) && !this.spectator) {
        console.log('creating table');
        const newGameId = Math.floor(Math.random() * 1000000).toString();
        console.log('made this game id');

        await new Promise(async (resolve) => {
          gameManager.createGame(newGameId);
          gameManager.on(GameManagerEvent.CreatedGame, (gameId) => {
            console.log('heard back from the contract with a new game');
            console.log(gameId, newGameId);
            if (gameId === newGameId) {
              resolve();
            }
          });
        });

        console.log('setting game id for table');
        await setGameIdForTable(this.tableId, newGameId);

        console.log('setting game id in gm');
        await gameManager.setGame(newGameId);
      }
    } catch (e) {
      console.error(e);
      await this.initGame(player, true);
      return;
    }

    console.log('ok, the table should exist now');
    const trueId = await getGameIdForTable(this.tableId);

    console.log('got this id from the server', trueId);

    if (trueId) {
      try {
        await gameManager.setGame(trueId);
      } catch (e) {
        if (this.spectator) {
          alert("can't spectate game that doesn't exist yet!");
          window.location.reload();
        } else {
          await this.initGame(player, true);
        }
        return;
      }
      console.log('setting true id in gameManager');

      this.api = new GameAPI(this, gameManager);

      this.gameBoard = new GameBoard(this);
      this.addObject(this.gameBoard);

      this.addObject(new InitOverlay(this));
      this.addObject(new InitOverlaySpec(this));

      this.api.syncShips();
      this.api.syncObjectives();

      this.addObject(new ResourceBars(this));
      this.addObject(new StagedShip(this));
      this.addObject(new Shop(this));
      this.addObject(new Cards(this));
      this.addObject(new GameOver(this));
      this.addObject(new Abandoned(this));

      this.pollGameId();
    } else {
      console.error('could not get game id');
    }
  }

  // this probably sucks but whatever
  private pollGameId() {
    const check = async () => {
      const oldId = await getGameIdForTable(this.tableId);

      setTimeout(async () => {
        const newId = await getGameIdForTable(this.tableId);

        if (newId !== oldId && oldId !== null && this.api.gameAbandoned())
          window.location.reload();
        else check();
      }, 5000);
    };

    check();
  }

  private initUI() {
    this.addObject(new GameInitUI(this));
  }

  private handleAudio({key, value}: {key: string; value: boolean}) {
    console.log('audio being handled');

    if (key === 'Music') {
      if (value) {
        setAllVolume(1);
      } else {
        setAllVolume(0);
      }
    } else if (key === 'Sound') {
    }
  }

  private setup() {
    new BroadcastChannel('ls-channel').onmessage = (ev) => {
      console.log(ev);
      this.handleAudio(ev.data);
    };

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

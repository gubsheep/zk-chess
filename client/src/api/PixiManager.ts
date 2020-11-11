import autoBind from 'auto-bind';
import * as PIXI from 'pixi.js';
import { getFontLoader } from '../app/PixiHelpers';
import { blueShader, redShader } from '../app/Shaders';

type InitProps = {
  canvas: HTMLCanvasElement;
};

type Coords = { x: number; y: number };

export class PixiManager {
  static instance: PixiManager | null;
  app: PIXI.Application;
  canvas: HTMLCanvasElement;
  boardCoords: Coords[][];
  pieces: PIXI.Container[];
  frameRequestId: number;
  frameCount: number;

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
    this.pieces = [];
    this.frameCount = 0;

    autoBind(this);

    PIXI.Loader.shared
      .add('public/assets/background.png')
      .add('public/assets/backgroundsmall.png')
      .add('public/assets/font.png')
      .add('public/assets/sprite-00.png')
      .add('public/assets/sprite-01.png')
      .add('public/assets/sprite-02.png')
      .load(() => this.setup()); // can't put this.setup directly or it won't bind this
  }

  setup() {
    const app = this.app;
    const { width, height } = this.app.renderer;

    app.renderer.backgroundColor = 0x061639; // TODO set fallback color
    const cache = PIXI.utils.TextureCache;

    // set up background
    let texture = cache['public/assets/backgroundsmall.png'];
    let bgsprite = new PIXI.TilingSprite(texture, width, height);
    app.stage.addChild(bgsprite);

    // set up grid
    const numX = 7;
    const numY = 5;
    const DIM = 36;
    const BORDER = 1;
    const sumW = (BORDER + DIM) * numX - BORDER;
    const sumH = (BORDER + DIM) * numY - BORDER;

    const startX = Math.floor((width - sumW) / 2);
    const startY = Math.floor((height - sumH) / 2);

    const myCoords: Coords[][] = [...Array(7)].map((_e) => Array(5));

    for (let i = 0; i < numX; i++) {
      for (let j = 0; j < numY; j++) {
        const x = startX + i * DIM + (i - 1) * BORDER;
        const y = startY + j * DIM + (j - 1) * BORDER;
        let rectangle = new PIXI.Graphics();
        rectangle.beginFill(0x222266, 0.4);
        rectangle.drawRect(0, 0, DIM, DIM);
        rectangle.endFill();
        rectangle.x = x;
        rectangle.y = y;
        app.stage.addChild(rectangle);

        myCoords[i][j] = { x, y };
      }
    }
    this.boardCoords = myCoords;

    // set up font
    const fontLoader = getFontLoader(cache['public/assets/font.png']);
    app.stage.addChild(fontLoader('The quick brown fox jumps over the lazy dog?'));
    const msg2 = fontLoader('THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG. 1234567890', 0x000000);
    msg2.y = 100;
    app.stage.addChild(msg2);

    // set up ships
    let container = new PIXI.Container();
    let sprite = new PIXI.Sprite(cache['public/assets/sprite-00.png']);
    // should be unnecessary
    sprite.x = 0;
    sprite.y = 0;
    sprite.filters = [blueShader];
    container.x = this.boardCoords[0][0].x + 2;
    container.y = this.boardCoords[0][0].y + 2;

    // let debugRect = new PIXI.Graphics();
    // debugRect.beginFill(0xff0000);
    // debugRect.drawRect(0, 0, 100, 100);
    // debugRect.endFill();
    // debugRect.x = -50;
    // debugRect.y = -50;
    // container.addChild(debugRect);

    container.addChild(sprite);

    let mask = new PIXI.Graphics();
    mask.beginFill(0x555555, 0.4);
    mask.drawRect(container.x, container.y, 32, 24);
    mask.endFill();
    container.mask = mask;

    app.stage.addChild(container);
    this.pieces.push(container);

    this.loop();
  }

  loop() {
    const frames = 30;
    if (this.frameCount % frames === 0) {
      const container = this.pieces[0];
      const mask = container.mask as PIXI.Graphics | null;
      if (mask) {
        // mask.clear();
        // mask.beginFill(0x555555, 0.4);
        if (this.frameCount % (2 * frames) === 0) {
          container.children[0].y = 2;
          mask.drawRect(container.x, container.y, 32, 24);
        } else {
          container.children[0].y = 0;
          mask.drawRect(container.x, container.y, 32, 22);
        }
        // mask.endFill();
      }
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

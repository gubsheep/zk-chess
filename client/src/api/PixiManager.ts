import * as PIXI from 'pixi.js';
import { ShaderColor, shaderStr } from '../app/Shaders';

type InitProps = {
  canvas: HTMLCanvasElement;
};

export class PixiManager {
  static instance: PixiManager | null;
  canvas: HTMLCanvasElement;

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

    PIXI.Loader.shared
      .add('public/assets/background.png')
      .add('public/assets/backgroundsmall.png')
      .add('public/assets/sprite-00.png')
      .add('public/assets/sprite-01.png')
      .add('public/assets/sprite-02.png')
      .load(setup);

    function setup() {
      app.renderer.backgroundColor = 0x061639;
      let circle = new PIXI.Graphics();
      circle.beginFill(0x9966ff);
      circle.drawCircle(0, 0, 32);
      circle.endFill();
      circle.x = 64;
      circle.y = 130;
      app.stage.addChild(circle);

      const cache = PIXI.utils.TextureCache;

      let texture = cache['public/assets/backgroundsmall.png'];
      let sprite1 = new PIXI.TilingSprite(texture, width, height);
      app.stage.addChild(sprite1);

      let sprite = new PIXI.Sprite(cache['public/assets/sprite-00.png']);
      const shader = new PIXI.Filter('', shaderStr(ShaderColor.Red));
      app.stage.addChild(sprite);
      sprite.filters = [shader];
    }
  }

  static destroy() {
    // cancel animation frame
    PixiManager.instance = null;
    return null;
  }

  static initialize(props: InitProps) {
    const pixiManager = new PixiManager(props);
    PixiManager.instance = pixiManager;
    return pixiManager;
  }
}

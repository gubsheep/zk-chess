import { PixiManager, GameZIndex } from '../../../api/PixiManager';
import { PixiObject } from '../../PixiUtils/PixiObject';
import { makeRect } from '../../PixiUtils/PixiUtils';
import { BGShaderUniforms, perlinFrag } from '../../PixiUtils/Shaders';
import { BG_IMAGE } from '../../PixiUtils/TextureLoader';

export class Background extends PixiObject {
  shader: PIXI.Filter;

  constructor(manager: PixiManager) {
    super(manager, GameZIndex.Background);
    const cache = PIXI.utils.TextureCache;
    let texture = cache[BG_IMAGE];
    const { width, height } = manager.renderer;
    // let bgsprite = new PIXI.TilingSprite(texture, width, height);
    // this.object.addChild(bgsprite);
    let rect = makeRect(width, height);
    const uniforms: BGShaderUniforms = {
      time: 0.0,
    };

    this.shader = new PIXI.Filter('', perlinFrag, uniforms);
    rect.filters = [this.shader];
    this.object.addChild(rect);
  }

  loop() {
    super.loop();
    if (this.lifetime % 2 === 0) this.shader.uniforms.time += 0.005;
  }
}

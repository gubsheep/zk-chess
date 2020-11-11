import * as PIXI from 'pixi.js';

const glsl = (x: TemplateStringsArray): string => x[0];

export enum ShaderColor {
  Red,
  Blue,
}

/*
interface Uniform<T> {
  type: 'f' | undefined;
  value: T;
}

interface ColorUniform extends Uniform<ShaderColor> {
  type: 'f';
  value: ShaderColor;
}

type ShaderProps = {
  color: ColorUniform;
};
*/

const getOverlayFrag = (color: ShaderColor): string => `
  precision mediump float;

  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;

  vec4 overlay(vec4 bg, vec4 fg) { 
    float r = bg.r < 0.5 ? (2.0 * bg.r * fg.r) : (1.0 - 2.0 * (1.0 - bg.r) * (1.0 - fg.r));
    float g = bg.g < 0.5 ? (2.0 * bg.g * fg.g) : (1.0 - 2.0 * (1.0 - bg.g) * (1.0 - fg.g));
    float b = bg.b < 0.5 ? (2.0 * bg.b * fg.b) : (1.0 - 2.0 * (1.0 - bg.b) * (1.0 - fg.b));
    return vec4(r, g, b, bg.a);
  }

  void main() {
    vec4 baseColor = texture2D(uSampler, vTextureCoord);
    vec4 overlayColor = ${
      color === ShaderColor.Red
        ? 'vec4(1.0, 0.0, 0.0, 1.0)'
        : 'vec4(0.0, 0.0, 1.0, 1.0)'
    };
    gl_FragColor = overlay(baseColor, overlayColor);
  }
`;

export const redShader = new PIXI.Filter('', getOverlayFrag(ShaderColor.Red));
export const blueShader = new PIXI.Filter('', getOverlayFrag(ShaderColor.Blue));

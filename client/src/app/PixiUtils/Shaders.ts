import * as PIXI from 'pixi.js';
import { PlayerColor } from './PixiTypes';

const toStrSafe = (x: any) => (x ? x.toString() : '');
const glsl = (arr: TemplateStringsArray, ...args: any[]): string =>
  arr.reduce((acc, curr, idx) => {
    return toStrSafe(acc) + toStrSafe(args[idx - 1]) + toStrSafe(curr);
  });

const vecStr = (r: number, g: number, b: number): string =>
  `vec4(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)}, 1.0)`;

const getOverlayFrag = (r: number, g: number, b: number): string => glsl`
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
    vec4 overlayColor = ${vecStr(r, g, b)};
    gl_FragColor = overlay(baseColor, overlayColor);
  }
`;

export const redShader = new PIXI.Filter('', getOverlayFrag(1, 0, 0));
export const blueShader = new PIXI.Filter('', getOverlayFrag(0, 0, 1));

export const orangeShader = new PIXI.Filter('', getOverlayFrag(1, 0.5, 0));

export const playerShader = (color: PlayerColor) =>
  color === PlayerColor.Red ? redShader : blueShader;

export const objectiveShader = (color: PlayerColor | null) =>
  color === null ? orangeShader : playerShader(color);

export type BGShaderUniforms = {
  time: number;
};

// https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
export const perlinFrag: string = glsl`
  precision mediump float;
  uniform float time;

  float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
  vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
  vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}

  float scale = 80.0;

  float noise(vec3 p){
      vec3 a = floor(p);
      vec3 d = p - a;
      d = d * d * (3.0 - 2.0 * d);

      vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
      vec4 k1 = perm(b.xyxy);
      vec4 k2 = perm(k1.xyxy + b.zzww);

      vec4 c = k2 + a.zzzz;
      vec4 k3 = perm(c);
      vec4 k4 = perm(c + 1.0);

      vec4 o1 = fract(k3 * (1.0 / 41.0));
      vec4 o2 = fract(k4 * (1.0 / 41.0));

      vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
      vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

      return o4.y * d.y + o4.x * (1.0 - d.y);
  }

  void main() {
    vec2 uv = vec2(gl_FragCoord.x / scale, gl_FragCoord.y / scale);
    vec3 pos = vec3(0.7 * uv.x + time, uv.y - time * 0.2, 0.5 * uv.x + 1.5 * time);
    float n0 = noise(pos);
    float n1 = 0.50 * noise(vec3(pos * 2.0));
    float n2 = 0.25 * noise(vec3(pos * 4.0));

    float n = n0 + n1 + n2;

    vec3 color1 = vec3(0.400, 0.749, 0.949);
    vec3 color2 = vec3(0.329, 0.721, 0.918);
    vec3 color3 = vec3(0.200, 0.698, 0.921);

    vec3 color = n > 0.75 ? color1 : n > 0.4 ? color2 : color3;

    gl_FragColor = vec4(color, 1.0);
  }
`;

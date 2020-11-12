import * as PIXI from 'pixi.js';

// general-purpose, smaller utils
export function makeDebugRect(
  width: number,
  height: number
): PIXI.DisplayObject {
  const debugRect = new PIXI.Graphics();
  debugRect.position.set(0, 0);
  debugRect.beginFill(0xff0000, 1.0);
  debugRect.drawRect(0, 0, width, height);
  debugRect.endFill();

  return debugRect;
}

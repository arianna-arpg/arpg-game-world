// ---------------------------------------------------------------------------
// THE BAKE SCALE's switch (capture rigs only — src/director/): supersampled
// sprite bakes for close cameras. setBakeScale(s > 1) re-bakes every sprite at
// s device pixels per world unit (sprites.ts BAKE_SCALE) and installs a
// drawImage shim that draws such canvases at their LOGICAL size: the 3-argument
// form gains the logical width/height, the 9-argument form's source rectangle
// is scaled into the bitmap, and the 5-argument form already names its
// destination. setBakeScale(1) uninstalls it and re-bakes plain. The live
// game never calls this. Contract: docs/engine/director.md.
// ---------------------------------------------------------------------------

import { BAKE_SCALE, clearBakes } from './sprites';

type Img = CanvasImageSource & { __bake?: number; width: number; height: number };
type DrawImage = CanvasRenderingContext2D['drawImage'];
let original: DrawImage | null = null;

function shim(this: CanvasRenderingContext2D, ...a: unknown[]): void {
  const img = a[0] as Img;
  const s = img?.__bake;
  const draw = original as unknown as (...x: unknown[]) => void;
  if (!s || s <= 1) { draw.apply(this, a); return; }
  if (a.length === 3) { draw.call(this, img, a[1], a[2], img.width, img.height); return; }
  if (a.length === 9) {
    draw.call(this, img, (a[1] as number) * s, (a[2] as number) * s, (a[3] as number) * s, (a[4] as number) * s, a[5], a[6], a[7], a[8]);
    return;
  }
  draw.apply(this, a);
}

/** Set the bake scale (1 = off). Clears the sprite cache either way. */
export function setBakeScale(s: number): void {
  const v = Math.max(1, Math.min(6, s || 1));
  if (v === BAKE_SCALE.value) return;
  BAKE_SCALE.value = v;
  const proto = CanvasRenderingContext2D.prototype;
  if (v > 1 && !original) { original = proto.drawImage; proto.drawImage = shim as unknown as DrawImage; }
  if (v === 1 && original) { proto.drawImage = original; original = null; }
  clearBakes();
}

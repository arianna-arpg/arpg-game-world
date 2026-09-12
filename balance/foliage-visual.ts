import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { wholeKindSprite } from '../src/render/vis/painters';
import { ZONES } from '../src/data/zones';

/** Real painter pixel comparison: tight textures retain the trunk, roots and
 * shadow. Chromium may round edge antialiasing differently on small surfaces. */
export function checkTrunks(): { cases: number; oldPixels: number; newPixels: number; image: string; maxAlphaError: number; maxPremultipliedError: number } {
  const theme = Object.values(ZONES)[0].theme;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1200;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const read = (sprite: HTMLCanvasElement): Uint8ClampedArray => {
    ctx.clearRect(0, 0, 1200, 1200);
    ctx.drawImage(sprite, 600 - sprite.width / 2, 600 - sprite.height / 2);
    return ctx.getImageData(0, 0, 1200, 1200).data;
  };
  let cases = 0, oldPixels = 0, newPixels = 0, maxAlphaError = 0, maxPremultipliedError = 0;
  const defs = Object.entries(DOODAD_VISUALS).filter(([, def]) => def.painter === 'trunk' && def.bakeWhole);
  for (const [kind, def] of defs) for (const radius of [6, 13, 32, 97, 104, 180]) {
    const old = wholeKindSprite({ ...def, bakeScope: def.bakeScope ?? 1.7 }, theme, radius, cases % 8);
    const fresh = wholeKindSprite(def, theme, radius, cases % 8);
    const a = read(old), b = read(fresh);
    for (let i = 0; i < a.length; i += 4) {
      maxAlphaError = Math.max(maxAlphaError, Math.abs(a[i + 3] - b[i + 3]));
      for (let j = 0; j < 3; j++) maxPremultipliedError = Math.max(maxPremultipliedError,
        Math.abs(a[i + j] * a[i + 3] - b[i + j] * b[i + 3]) / 255);
    }
    if (maxAlphaError > 16 || maxPremultipliedError > 12) throw new Error(kind + ' pixels changed beyond edge antialiasing tolerance');
    oldPixels += old.width * old.height; newPixels += fresh.width * fresh.height; cases++;
  }
  if (newPixels >= oldPixels) throw new Error('No trunk texture reduction');
  canvas.width = 900; canvas.height = 480;
  ctx.fillStyle = '#363d2a'; ctx.fillRect(0, 0, 900, 480);
  ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif';
  ctx.fillText('Original texture', 50, 35); ctx.fillText('Tight texture', 495, 35);
  let row = 0;
  for (const kind of ['tree', 'forest_oak', 'palm']) {
    const def = DOODAD_VISUALS[kind], radius = 90;
    const old = wholeKindSprite({ ...def, bakeScope: 1.7 }, theme, radius, 3);
    const fresh = wholeKindSprite(def, theme, radius, 3);
    const y = 105 + row++ * 145;
    ctx.drawImage(old, 225 - old.width / 2, y - old.height / 2);
    ctx.drawImage(fresh, 675 - fresh.width / 2, y - fresh.height / 2);
    ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif'; ctx.fillText(kind, 10, y);
  }
  return { cases, oldPixels, newPixels, image: canvas.toDataURL(), maxAlphaError, maxPremultipliedError };
}

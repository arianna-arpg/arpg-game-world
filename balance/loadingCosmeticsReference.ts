// The reference deliberately bootstraps the roster exactly as gameplay does.
// Never inject this bundle into the loading frame: that would hide missing
// dependencies in the production asset we are testing.
import '../src/data/glyphParts';
import { COSMETICS, type CosmeticLoadout } from '../src/engine/cosmetics';
import { MU_CFG } from '../src/data/mu';
import { cosmeticBody } from '../src/render/vis/cosmetics';
import { bodySprite, lookOf } from '../src/render/vis/body';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { SpiritRun, spiritLayout, type SpiritDirection } from '../src/loading/spiritRun';
import { drawSpiritRun } from '../src/loading/spiritView';

export const catalogue = [{ id: '', name: 'Original appearance' },
  ...Object.values(COSMETICS).filter(d => d.slot === 'wispSkin').map(d => ({ id: d.id, name: d.name }))];
export const outfit = (id: string): CosmeticLoadout => ({ slots: id ? { wispSkin: id } : {}, skills: {} });

export function body(id: string, radius: number): string {
  const look = cosmeticBody({ shape: 'circle', ...MU_CFG.wisp, radius }, outfit(id), false, true);
  const def = lookOf(look.look);
  if (!def) throw Error(`${id || 'original'}: missing look ${look.look}`);
  for (const spec of [...def.parts, ...def.live ?? [], ...def.walk?.parts ?? []]) {
    if (!PART_PAINTERS[spec.kind]) throw Error(`${id || 'original'}: missing painter ${spec.kind}`);
  }
  const sprite = bodySprite(look), pixels = sprite.getContext('2d')!.getImageData(0, 0, sprite.width, sprite.height).data;
  if (!pixels.some((v, i) => i % 4 === 3 && v > 40)) throw Error(`${id || 'original'}: blank baked body`);
  return sprite.toDataURL();
}

export interface Sample {
  id: string; direction: SpiritDirection; time: number; reduced: boolean;
  width: number; height: number; dpr: number;
}
export function crossing(sample: Sample): { png: string; x: number; y: number; scale: number } {
  const { width, height, dpr, direction, time, reduced, id } = sample;
  const run = new SpiritRun(direction, () => 0);
  run.time = time; run.distance = 123; run.lane = 0;
  run.gates = []; run.pickups = []; run.currents = []; run.bursts = [];
  const canvas = document.createElement('canvas'); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d')!; ctx.scale(dpr, dpr);
  drawSpiritRun(ctx, width, height, run, outfit(id), reduced);
  const layout = spiritLayout(width, height, direction), p = layout.point(run.playerU, run.lane);
  return { png: canvas.toDataURL(), x: p.x * dpr, y: p.y * dpr, scale: layout.scale * dpr };
}

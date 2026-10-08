import type { MassAdventure } from './preset';
import type { MassPatchBox } from './terrainPatches';
import { TOWN_TIERS } from '../data/townBuild';
import { MassGenerator, makeMassRun } from './generator';
import { chooseMassOrigin } from './origin';
import { canonical } from './random';

const SOURCE = 'worldmass/opening-foundations-v1';
/** Resolve the finite opening program before terrain publication. This is a
 * conservative foundation reservation, not a road carve or patch mutation.
 * Saved runs consume the resulting rectangle verbatim, including after native
 * town sizes/tuning change. All future workers receive it in the terrain spec. */
export function reserveMassOpening(seed: number, runId: string, input: MassAdventure): MassAdventure {
  if ((!input.terrain.patches && !input.terrain.landforms) || !input.settlement) return input;
  const config = JSON.parse(canonical(input)) as MassAdventure, town = config.settlement!;
  const w = Math.max(...TOWN_TIERS.map(t => t.w)), h = Math.max(...TOWN_TIERS.map(t => t.h));
  const padding = town.apron + town.blend + 120;
  const bounds: MassPatchBox = { minX: -padding, minY: -padding, maxX: w + padding, maxY: h + padding };
  const centers = new Map<string, MassPatchBox>();
  const add = (box: MassPatchBox, radius: number) => {
    bounds.minX = Math.min(bounds.minX, box.minX - radius); bounds.minY = Math.min(bounds.minY, box.minY - radius);
    bounds.maxX = Math.max(bounds.maxX, box.maxX + radius); bounds.maxY = Math.max(bounds.maxY, box.maxY + radius);
  };
  const journey = config.journey;
  for (const d of journey?.destinations ?? []) {
    const horizontal = d.edge === 'east' || d.edge === 'west', tangent = d.jitter * (horizontal ? h : w);
    // Any selected native edge cell, at every permitted town tier. Include
    // the half-cell inward edge seat and the complete lateral jitter.
    const box = horizontal
      ? { minX: d.edge === 'west' ? -d.distance : d.distance - 64, maxX: d.edge === 'west' ? -d.distance + 64 : w + d.distance,
        minY: -tangent, maxY: h + tangent }
      : { minX: -tangent, maxX: w + tangent, minY: d.edge === 'north' ? -d.distance : d.distance - 64,
        maxY: d.edge === 'north' ? -d.distance + 64 : h + d.distance };
    centers.set(d.id, box); add(box, d.radius + 120);
  }
  for (const e of journey?.extensions ?? []) {
    const parent = centers.get(e.from);
    if (!parent) throw Error('Opening patch reservation has an unresolved extension');
    const length = Math.hypot(e.offset.x, e.offset.y), jitter = e.jitter * length;
    const box = { minX: parent.minX + e.offset.x - jitter, maxX: parent.maxX + e.offset.x + jitter,
      minY: parent.minY + e.offset.y - jitter, maxY: parent.maxY + e.offset.y + jitter };
    centers.set(e.id, box); add(box, e.radius + 120);
  }
  // Road stop centers lie on the native polylines. Their vertices stay in the
  // convex opening hull above, plus the declared 100/80-unit route bends.
  // A uniform expansion includes stops, their lateral placement and scenery.
  const stopPad = Math.max(0, ...(journey?.stops ?? []).map(s => Math.abs(s.offset) + s.radius)) + 240;
  bounds.minX -= stopPad; bounds.minY -= stopPad; bounds.maxX += stopPad; bounds.maxY += stopPad;
  const gen = new MassGenerator(makeMassRun(seed, runId, config.terrain), config.terrain);
  const cell = chooseMassOrigin(gen, town.location).origin;
  const openingPatches = config.terrain.patches;
  if (openingPatches) config.terrain.patches = { ...openingPatches, exclusions: [
    ...(openingPatches.exclusions ?? []).filter(e => e.source !== SOURCE),
    { source: SOURCE, origin: { ...cell, x: 0, y: 0 }, bounds },
  ] };
  const landformOpening = config.terrain.landforms;
  if (landformOpening) config.terrain.landforms = { ...landformOpening, exclusions: [
    ...(landformOpening.exclusions ?? []).filter(e=>e.source!==SOURCE),
    { source:SOURCE, origin:{...cell,x:0,y:0}, bounds },
  ] };
  return config;
}

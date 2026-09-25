import type { World } from './world';
import { TRAINING_YARD } from '../data/trainingYard';
import { START_ZONE } from '../data/zones';
import type { Doodad } from './levelgen';

// References expire naturally when loadZone replaces the town's scenery.
const backstops = new WeakMap<World, Doodad[]>();

/** Raise only missing range bodies. Never reload town or disturb the live run. */
export function syncTrainingYard(w: World): number {
  const def = TRAINING_YARD;
  if (w.clientActionHook || w.zone.id !== START_ZONE || !w.account.features.has(def.feature)) return 0;
  let spawned = 0;
  for (const row of def.targets) {
    const tag = `${def.site}:${row.id}`;
    if (w.actors.some(a => !a.dead && a.tag === tag)) continue;
    const actor = w.createMonster(row.monster, Math.max(1, w.player.level), 'enemy');
    actor.tag = tag;
    actor.pos = w.clampPos(w.townSeat(def.site, row.x, row.y), actor.radius);
    w.actors.push(actor); spawned++;
  }
  const previous = backstops.get(w) ?? [], added: Doodad[] = [];
  // Seat the pair before publishing either rock, just like normal town minting.
  const current = def.backstops.map((row, i) => {
    if (previous[i] && w.doodads.includes(previous[i])) return previous[i];
    const rock: Doodad = { pos: w.clampPos(w.townSeat(def.site, row.x, row.y), row.radius), radius: row.radius, kind: 'rock' };
    added.push(rock); return rock;
  });
  backstops.set(w, current);
  for (const rock of added) { w.doodads.push(rock); w.markDoodadsChanged(rock); }
  return spawned;
}

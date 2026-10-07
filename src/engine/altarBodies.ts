import { registerDoodadRule, type Doodad } from './levelgen';
import type { World, Altar } from './world';

/** The low stone slab drawn by Renderer.drawAltars. Its field and quarter
 * sparks are traversable; only the foot course occupies physical ground. */
export const ALTAR_BODY = { kind: 'altar_plinth', halfWidth: 14, halfHeight: 6.5, offsetY: 4.5 } as const;
registerDoodadRule(ALTAR_BODY.kind, {
  overlap: 'solid', blocksMove: true, surface: { hw: 1, hh: ALTAR_BODY.halfHeight / ALTAR_BODY.halfWidth, orient: 'fixed' },
});
export interface NativeAltarBodyHost extends Pick<World,'doodads'|'altars'|'markDoodadsChanged'> {}
const bodies = new WeakMap<NativeAltarBodyHost, Map<Altar, Doodad>>();

/** Native scenery owns physics/path queries. The altar owner owns residency;
 * these derived bodies are rebuilt once on admission, never checkpointed twice. */
export function syncAltarBodies(world: NativeAltarBodyHost): void {
  const live = bodies.get(world) ?? new Map<Altar, Doodad>();
  bodies.set(world, live);
  const present = new Set(world.doodads), wanted = new Set(world.altars);
  const removed = new Set<Doodad>();
  let changed = false;
  for (const [altar, body] of live) {
    if (!wanted.has(altar) || !present.has(body)) { removed.add(body); live.delete(altar); }
  }
  if (removed.size) { world.doodads = world.doodads.filter(d => !removed.has(d)); changed = true; }
  for (const altar of world.altars) {
    if (live.has(altar)) continue;
    const body: Doodad = { kind: ALTAR_BODY.kind, radius: ALTAR_BODY.halfWidth,
      boundR: Math.hypot(ALTAR_BODY.halfWidth, ALTAR_BODY.halfHeight),
      pos: { x: altar.pos.x, y: altar.pos.y + ALTAR_BODY.offsetY }, tier: altar.tier ?? 0 };
    live.set(altar, body); world.doodads.push(body); changed = true;
  }
  if (changed) world.markDoodadsChanged();
}

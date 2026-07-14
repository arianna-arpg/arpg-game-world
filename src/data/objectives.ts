// ---------------------------------------------------------------------------
// OBJECTIVE UI TUNABLES — the cross-kind knobs objectives share, as data.
//
// STRAGGLER CHEVRONS: the bounty pass taught us the shape — a hunt stays a
// hunt, but the last stragglers must never become pixel-hunting. The same
// mercy now covers the core kinds: the last few counted enemies of a 'clear'
// and the last spawner of a 'spawners' get edge chevrons, named. Thresholds
// per kind, one row each.
//
// THE OFFERING (kind 'offering'): the altar system (data/shrines.ts) as an
// objective — an altar from the registry stands at a POI and must be FED:
// kills within its field power it, `need` deep. ANY death inside counts —
// credited or not, ambient or not — so a migration herd stampeding through
// the field, or the storm altar's own bolts, do your work for you (the
// interlock is the point). If nothing lives in the zone before the altar is
// sated, the objective STALLS — not lost, just hungry — and any world event
// that spawns new bodies (a migration, a warband, a demon storm) revives it:
// the stall is derived from the living population each frame, never latched.
// ---------------------------------------------------------------------------

import type { World } from '../engine/world';
import { registerAttentionSource, type AttentionPoint } from '../world/attention';

export const STRAGGLER_CFG = {
  /** Per-kind chevron thresholds: the pointer wakes when this few remain. */
  clear: { remaining: 3, glyph: '⚔' },
  spawners: { remaining: 1, glyph: '☗' },
  /** Shared straggler tint (the writ accent's quieter cousin). */
  color: '#c8b47a',
} as const;

export const OFFERING_CFG = {
  /** How many offerings sate the altar (rolled off the layout rng — the same
   *  band every re-entry of a remembered seed). ObjectiveSpec.need overrides. */
  need: [8, 12] as [number, number],
  /** Palette + chevron for the hungering altar. */
  accent: '#d8a8ff',
  glyph: '✛',
} as const;

// The core kinds' straggler chevrons (clear / spawners), named — parity with
// the bounty's stragglers-by-name treatment.
registerAttentionSource((world: World): AttentionPoint[] => {
  const v = world.objectiveStragglersView();
  if (!v) return [];
  const cfg = STRAGGLER_CFG[v.kind];
  return v.points.map((p, i) => ({
    id: `straggler_${v.kind}_${i}`, pos: p.pos, color: STRAGGLER_CFG.color,
    glyph: cfg.glyph, label: p.name, z: 1,
  }));
});

// The offering altar's pointer: the objective's anchor, visible the whole
// hunt (a hungering altar is the destination, not a spoiler).
registerAttentionSource((world: World): AttentionPoint[] => {
  const v = world.offeringView();
  if (!v || v.done) return [];
  return [{
    id: 'offering_altar', pos: v.pos, color: OFFERING_CFG.accent, glyph: OFFERING_CFG.glyph,
    label: v.stalled ? 'the altar hungers' : `feed the altar — ${v.offered}/${v.need}`, z: 2,
  }];
});

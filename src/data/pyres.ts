// ---------------------------------------------------------------------------
// KINDLE THE PYRES — the 'pyres' zone objective, every number as data.
//
// Cold iron fire-bowls stand dark at POIs (doodad kinds night_pyre /
// night_pyre_lit — the campfire painter's bowl face, the regent-brazier
// precedent). PRESENCE beside one KINDLES it under THE CONTEST LAW — a
// crowded bowl won't take the flame, and a crowd smothers banked kindling
// back down. Light every bowl and the ground is held.
//
// The payoff is REAL LIGHT, not scenery: the lit kind wears a registered
// LIGHTWELL row (engine/lightwells.ts), so on gloaming ground a lit pyre
// FEEDS the LIGHT survival meter exactly like a campfire — the objective
// literally pushes the dark back — and its light row rides the standard
// dynamic light layer everywhere else. Kindling progress rides Zone Memory
// (the spire's charge-array shape); a finished zone keeps its burning ring.
// ---------------------------------------------------------------------------

import { registerDoodadRule } from '../engine/levelgen';
import { registerLightwell } from '../engine/lightwells';
import type { World } from '../engine/world';
import { registerAttentionSource, type AttentionPoint } from '../world/attention';
import { CONTEST_CFG, type ContestSpec } from './objectives';
import { registerTransit } from './transit';

export const PYRE_CFG = {
  /** How many pyres the zone rolls (ObjectiveSpec.count overrides). */
  count: [3, 4] as [number, number],
  /** Seconds of held ground to kindle one (ObjectiveSpec.kindleSec → the
   *  'pyre' transit row's dwell → this). */
  kindleSec: 5,
  /** Door clearance at placement. */
  portalClear: 120,
  /** Fixture kinds (cold / lit) + body radius. */
  kind: 'night_pyre',
  kindLit: 'night_pyre_lit',
  radius: 13,
  /** THE CONTEST LAW at the bowl (zone ObjectiveTuning.contest overrides). */
  contest: { ...CONTEST_CFG } as ContestSpec,
  /** The lit pyre's lightwell FEED (light-meter units/sec of residence —
   *  the campfire's neighborhood; no pool: a kindled pyre burns the night
   *  through). */
  feed: 5,
  accent: '#ffc878',
  glyph: '✶',
} as const;

// The kindle ring: one row to retune, one ring style.
registerTransit({
  kind: 'pyre', dwell: PYRE_CFG.kindleSec, radius: 110,
  ring: { radius: 34, width: 4, color: PYRE_CFG.accent },
});

// A pyre bowl is TRUE IRON underfoot (walk around it), slender overhead
// (shots pass) — the brazier's discipline.
registerDoodadRule(PYRE_CFG.kind, {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 260,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
registerDoodadRule(PYRE_CFG.kindLit, {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 260,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});

// THE POINT OF THE FLAME: the lit kind is a residence light — the Gloaming's
// meter drinks from it like any well (engine reads LIGHTWELLS by doodad
// kind; no engine edit, one row).
registerLightwell({ kind: PYRE_CFG.kindLit, feed: PYRE_CFG.feed });

// The chevron: the nearest cold bowl.
registerAttentionSource((world: World): AttentionPoint[] => {
  const v = world.pyresView();
  if (!v || v.done) return [];
  const label = v.draining ? 'the kindling smothers — the bowl is overrun!'
    : v.contested ? 'the pyre is contested — clear its ground'
      : v.recouping ? 'the flame quickens — lost time repaid'
        : v.frac > 0 ? 'the pyre catches' : 'a cold pyre';
  return [{
    id: 'night_pyre', pos: v.pos, color: PYRE_CFG.accent, glyph: PYRE_CFG.glyph,
    label, z: 2,
  }];
});

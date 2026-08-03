// ---------------------------------------------------------------------------
// UNEARTH THE CACHES — the 'unearth' zone objective, every number as data.
//
// Burial mounds hide their spoil at POIs (doodad kinds burial_mound /
// burial_mound_dug — the cairn painter standing, the rubble painter opened).
// PRESENCE beside a mound DIGS it open under THE CONTEST LAW (the dead
// dislike shovels: an enemy at the graveside stalls the spade). An opened
// mound SPILLS — a gem struck through the ordinary drop chokepoint, so the
// SPOILS LAW still governs sealed ground — and may SPRING an ambush of the
// zone's own kin out of the turned earth (the disturbed-ground thesis).
// Open every mound and the ground has given up its dead.
//
// Dig progress rides Zone Memory (the spire's charge-array shape): a
// half-dug mound resumes exactly, an opened one stays open.
// ---------------------------------------------------------------------------

import { registerDoodadRule } from '../engine/levelgen';
import type { World } from '../engine/world';
import { registerAttentionSource, type AttentionPoint } from '../world/attention';
import { CONTEST_CFG, type ContestSpec } from './objectives';
import { registerTransit } from './transit';

export const DIG_CFG = {
  /** How many mounds the zone rolls (ObjectiveSpec.count overrides). */
  count: [3, 5] as [number, number],
  /** Seconds of held ground to open one (ObjectiveSpec.digSec → the
   *  'digsite' transit row's dwell → this). */
  digSec: 3.5,
  /** Door clearance at placement. */
  portalClear: 110,
  /** Fixture kinds (buried / dug) + body radius. */
  kind: 'burial_mound',
  kindDug: 'burial_mound_dug',
  radius: 14,
  /** THE CONTEST LAW at the graveside (ObjectiveTuning.contest overrides). */
  contest: { ...CONTEST_CFG, radius: 130 } as ContestSpec,
  /** THE SPILL: chance an opened mound strikes a gem at the dig (routed
   *  through the ordinary drop chokepoint — spoils-sealed ground refuses
   *  by standing law, and the objective still completes). */
  spoilGemChance: 0.8,
  /** THE SPRING: chance the turned earth answers — a small ambush of the
   *  zone's own kin bursts from the mound. */
  ambush: {
    chance: 0.4,
    count: [2, 4] as [number, number],
    /** Burst band (world units) around the mound. */
    radius: [60, 120] as [number, number],
    /** Level bonus over the zone. */
    levelBonus: 0,
  },
  accent: '#c8b47a',
  glyph: '⛏',
} as const;

// The dig ring.
registerTransit({
  kind: 'digsite', dwell: DIG_CFG.digSec, radius: 100,
  ring: { radius: 30, width: 4, color: DIG_CFG.accent },
});

// A mound is LOW STONE (walk around, shoot over); the dug face is loose
// rubble — same footprint, nothing re-flows.
registerDoodadRule(DIG_CFG.kind, {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 240,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
registerDoodadRule(DIG_CFG.kindDug, {
  overlap: 'solid', blocksMove: false, blocksShot: false, spacing: 240,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});

// The chevron: the nearest unopened mound.
registerAttentionSource((world: World): AttentionPoint[] => {
  const v = world.digsView();
  if (!v || v.done) return [];
  const label = v.draining ? 'the dig collapses — the graveside is overrun!'
    : v.contested ? 'the graveside is contested — see off the mourners'
      : v.recouping ? 'the dig quickens — lost time repaid'
        : v.frac > 0 ? 'the spade bites' : 'an unopened mound';
  return [{
    id: 'burial_mound', pos: v.pos, color: DIG_CFG.accent, glyph: DIG_CFG.glyph,
    label, z: 2,
  }];
});

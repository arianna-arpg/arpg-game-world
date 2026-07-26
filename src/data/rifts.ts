// ---------------------------------------------------------------------------
// SEAL THE RIFTS — the 'rifts' zone objective, every number as data.
//
// Seeping TEARS in the ground stand at POIs (doodad kinds rift_tear /
// rift_tear_sealed — the chasmPit painter in the zone's own accent, so a
// jungle's tear glows jungle and a hellscape's glows hell), each POURING the
// zone's OWN underside: small bounded groups on a jittered clock, zone-capped
// (the transience doctrine — the pour borrows the standing population's
// table, it invents nothing). PRESENCE beside a tear builds its SEAL under
// THE CONTEST LAW (data/objectives.ts): the pour itself fights the work, so
// a rift is shut by standing INTO its output and cutting it down. Sealed
// tears stay sealed — the charge array rides Zone Memory like the spire's.
//
// Registered from here so a re-tune needs no engine edit: the seal dwell +
// ring on the 'rift' transit row, fixture ground rules, the chevron on the
// attention fabric.
// ---------------------------------------------------------------------------

import { registerDoodadRule } from '../engine/levelgen';
import type { World } from '../engine/world';
import { registerAttentionSource, type AttentionPoint } from '../world/attention';
import { CONTEST_CFG, type ContestSpec } from './objectives';
import { registerTransit } from './transit';

export const RIFT_CFG = {
  /** How many tears the zone rolls (ObjectiveSpec.count overrides). */
  count: [2, 3] as [number, number],
  /** Seconds of held ground to seal one tear (ObjectiveSpec.sealSec → the
   *  'rift' transit row's dwell → this). */
  sealSec: 9,
  /** Door clearance at placement (the beacon's discipline). */
  portalClear: 130,
  /** Fixture kinds (open / sealed) + body radius. A tear is GROUND — walked
   *  over, fought across — never a pillar. */
  kind: 'rift_tear',
  kindSealed: 'rift_tear_sealed',
  radius: 26,
  /** THE CONTEST LAW at the tear (zone ObjectiveTuning.contest overrides). */
  contest: { ...CONTEST_CFG, radius: 160 } as ContestSpec,
  /** THE POUR: each OPEN tear births small groups of the zone's own kin on
   *  this clock — bounded (zone-wide cap on live rift-born bodies), honest
   *  (they are counted population: they stall the seal, they pay xp, they
   *  ride Zone Memory), and self-silencing (a sealed tear pours nothing). */
  pour: {
    every: [7, 11] as [number, number],
    batch: [1, 2] as [number, number],
    /** Zone-wide cap on live rift-born bodies (tag 'rift_born'). */
    cap: 8,
    /** Birth band (world units) around the tear. */
    radius: [40, 110] as [number, number],
    /** Level bonus over the zone. */
    levelBonus: 0,
  },
  accent: '#c86aff',
  glyph: '⟁',
} as const;

// The seal ring: dwell seconds + stand-in radius + drawn ring, one row.
registerTransit({
  kind: 'rift', dwell: RIFT_CFG.sealSec, radius: 120,
  ring: { radius: 42, width: 4, color: RIFT_CFG.accent },
});

// A tear is GROUND (bodies and shots cross it freely); spacing keeps two
// tears from sharing one fight, and no tear opens over liquid or void.
registerDoodadRule(RIFT_CFG.kind, {
  overlap: 'ground', spacing: 340,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
registerDoodadRule(RIFT_CFG.kindSealed, {
  overlap: 'ground', spacing: 340,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});

// The chevron: the nearest OPEN tear, honest about the contest.
registerAttentionSource((world: World): AttentionPoint[] => {
  const v = world.riftsView();
  if (!v || v.done) return [];
  const label = v.draining ? 'the seal unravels — the tear is overrun!'
    : v.contested ? 'the tear is contested — cut down its pour'
      : v.frac > 0 ? 'the seal takes hold' : 'a seeping tear';
  return [{
    id: 'rift_tear', pos: v.pos, color: RIFT_CFG.accent, glyph: RIFT_CFG.glyph,
    label, z: 2,
  }];
});

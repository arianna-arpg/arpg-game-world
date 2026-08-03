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

/** THE CONTEST LAW — one contested-presence discipline for every hold-the-
 *  ground objective fixture (survey spires, rift seals, pyre kindlings, dig
 *  sites…): a fixture's progress only BUILDS on ground that is truly held.
 *  Any live counted enemy inside the contest ring STALLS the work (the same
 *  `objectiveCountable` predicate the cull's scoreboard runs, so "cleared"
 *  can never disagree with "counting"); a CROWD (`drainAt`+) actively DRAINS
 *  banked progress — walk away from a half-charged stone and the wilds
 *  smother it back down. Per-kind configs spread these defaults; a zone's
 *  ObjectiveTuning.contest overrides any dial (or `false` waives the law). */
export interface ContestSpec {
  /** Contest ring radius (world units) around the fixture. */
  radius: number;
  /** Live counted enemies at/above this STALL the work (progress freezes). */
  stallAt: number;
  /** …at/above this the crowd DRAINS banked progress (attended or not). */
  drainAt: number;
  /** Banked seconds lost per second while drained (floors at 0). */
  drainPerSec: number;
  /** THE RECOUP (ContestRecoupSpec below) — `false` waives it: contested
   *  time on this ground is simply lost. */
  recoup?: ContestRecoupSpec | false;
}

/** THE RECOUP — the contest law's answer to the perpetual siege: contested
 *  time is not LOST time. While the keeper STANDS the ground but the contest
 *  stalls the work (or an attended crowd drains it), a ghost clock banks the
 *  seconds the stand WOULD have built had the ground been clear — plus the
 *  attended drain's own losses; once the ground truly clears, the build runs
 *  at `boost`× until that debt is repaid. The bar visibly sprints back
 *  toward where the uncontested stand would have put it — never a snap from
 *  empty to full — so a stone besieged in perpetuity still gets somewhere,
 *  while walking away banks nothing (abandonment keeps its full cost). */
export interface ContestRecoupSpec {
  /** Build-rate multiplier while owed seconds remain (≤1 disables repayment). */
  boost: number;
  /** Owed-bank ceiling as a fraction of the fixture's full need — the ghost
   *  never leads the real bar by more than this share of the whole ask. */
  capFrac: number;
  /** Share of ATTENDED drain losses banked on top of the stall's own
   *  seconds (0..1). Unattended drain never banks. */
  drainRefund: number;
}

export const CONTEST_CFG: ContestSpec = {
  radius: 150,
  stallAt: 1,
  drainAt: 4,
  drainPerSec: 0.35,
  recoup: { boost: 2, capFrac: 1, drainRefund: 1 },
} as const;

/** THE CULL (kind 'clear'): the ask is a SHARE of the ground's counted
 *  population — "kill N here", never "find the last body" (that hunt is the
 *  bounty writ's identity). These dials shape the DERIVED ask on ground whose
 *  spec authored nothing; ObjectiveSpec `need` (flat or [min,max] band) and
 *  `frac` override per zone, and the derived ask never exceeds what actually
 *  stands (asking more than the floor holds is just the old full-clear
 *  wearing a broken scoreboard). The EMPTY FLOOR still completes regardless
 *  of the tally — the mercy rule, and the whole law on `all: true` ground. */
export const CLEAR_CFG = {
  /** Share of the FRESH counted population the cull asks for. */
  frac: 0.6,
  /** Clamp band on the derived ask: a hamlet still asks a real fight, a
   *  teeming megazone never asks a hundred heads. */
  min: 4,
  max: 40,
} as const;

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

/** THE PRESSURE RAMP — the growth curve of the objective family's spawn-
 *  pressure lanes (the spire operation's reinforcement bleed, the rifts'
 *  pours): a multiplier over BATCH sizes and live CAPS read off the zone's
 *  LIVE level (a Quickened surge rides free), with the arrival cadence
 *  tightening on its own gentler share. A trickle of two bodies is a fight
 *  at level 4 and a nuisance at 50 — the waves objective already scales per
 *  level (WAVE_CFG count.perLevel); this is that law for the trickle lanes.
 *  Piecewise-linear between knots, flat outside them; the ramp stands at
 *  exactly 1 through the opening levels, so low ground keeps today's
 *  numbers to the byte. Per-lane `levelScale: false` (on the config, or an
 *  ObjectiveSpec override) opts a lane out. */
export const PRESSURE_RAMP = {
  /** [zoneLevel, multiplier] knots, ascending. */
  knots: [[6, 1], [15, 1.4], [25, 1.9], [40, 2.6], [60, 3.4]] as ReadonlyArray<readonly [number, number]>,
  /** Share of (mul − 1) applied to arrival CADENCE (interval divisor):
   *  more bodies per beat first, faster beats second — never a spam faucet. */
  cadence: 0.5,
} as const;

/** The ramp's fold: spawn-pressure multiplier at a zone level. */
export function pressureRampAt(level: number): number {
  const k = PRESSURE_RAMP.knots;
  if (level <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (level <= k[i][0]) {
      const [l0, m0] = k[i - 1];
      const [l1, m1] = k[i];
      return m0 + (m1 - m0) * ((level - l0) / Math.max(1, l1 - l0));
    }
  }
  return k[k.length - 1][1];
}

/** The cadence divisor at a ramp multiplier (PRESSURE_RAMP.cadence's share
 *  of the climb): arrival intervals divide by this. */
export function pressureRampCadence(mul: number): number {
  return 1 + Math.max(0, mul - 1) * PRESSURE_RAMP.cadence;
}

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

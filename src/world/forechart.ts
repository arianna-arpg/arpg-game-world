// ---------------------------------------------------------------------------
// THE FORECHART — the world charted AHEAD of the walker.
//
// The engine keeps a VEILED HALO of fully-minted zones around the player's
// known web: a budgeted background sweep resolves '?' frontiers through the
// SAME chartFrontier machinery the player's own travel uses (heat-map biomes,
// ports at the ocean's edge, courses, enclaves, the road weave — nothing
// forked), stamping each mint `ZoneDef.veiled`. A veiled zone is a full
// citizen of the graph — world events seat on it, factions contest it,
// fronts march over it, roads weave through it — but NO player-facing
// surface shows it (World.visible(), the one fog seam) until it is FOUND:
// by walking in, by standing next door (the classic one-ring map preview),
// by a survey pulse, or by an omen/chart reveal.
//
// Why: events used to choose homes from a graph that only extended one ring
// past the player's boots — everything "far" was near, and most events fired
// on ground already cleared. With the forechart, the world pre-exists many
// steps out in every direction, so a Crusade ignites a country away and
// entrenches before anyone knows, a contagion starts at the rim and seeps
// inward, a migration crosses land no one has seen — and the player STUMBLES
// onto all of it, because it was already there, waiting.
//
// SOUNDINGS are the far arm: a world event may request a veiled cluster at a
// coordinate beyond the halo (WorldOverlay.requestSoundings — drained by the
// engine like every other mint request). The sweep grows a small web there,
// disconnected until approached (the floating law), so even a cross-ocean
// seat has real ground under it by the time anyone arrives.
//
// Every dial lives in FORECHART_CFG. Probe: npx tsx balance/probe_forechart.ts.
// Docs: docs/engine/forechart.md.
// ---------------------------------------------------------------------------

import type { ZoneDef } from '../data/zones';
import type { MapCoord } from './coords';
import { coordDist } from './coords';

export interface ForechartCfg {
  /** Master switch (the probe + sim arena can silence the sweep). */
  enabled: boolean;
  /** Node-units of veiled web maintained around the player's standing zone —
   *  the halo radius. THE PREGEN DOCTRINE: colossal — the world the player
   *  can see, walk toward, or hear events from is minted WELL in advance;
   *  new nodes are born far beyond attention, never underfoot. ~80/step. */
  ring: number;
  /** THE MINT HORIZON — the active-vicinity radius the doctrine GUARANTEES
   *  fully resolved: on every zone arrival (loadZone) all '?' frontiers
   *  within this of the player resolve SYNCHRONOUSLY (a bounded catch-up —
   *  a no-op on ground the sweep already filled, real work only after a
   *  long teleport/sail into thin chart). Inside this radius the only new
   *  nodes are DIRECTED (quest/event levers) by construction: ambient
   *  growth happened long before the player got here, and what they meet
   *  is FOUND, never freshly minted. */
  horizon: number;
  /** Frontier-bearing zones processed per sweep (each yields ≤ a few mints) —
   *  the per-tick COUNT budget. */
  perSweep: number;
  /** THE TIME GOVERNOR: wall-clock milliseconds one sweep beat may spend —
   *  checked before EACH charting unit, so when mints grow expensive (a big
   *  chart's O(N) scans, a foreordained sea/relief first-touch) the beat
   *  degrades to ONE unit instead of stacking several into a single frame
   *  (the 2026-07-23 perf gate caught count-only beats spending 200-1000ms
   *  while the halo filled). A single unit can still cost its own price —
   *  the governor bounds the STACK, unit cost is worldgen's own bill. */
  beatBudgetMs: number;
  /** Seconds between sweeps. */
  sweepSec: number;
  /** Hard budget of veiled zones alive at once — the halo stops growing here
   *  (found zones leave the count as they unveil, so exploring re-arms it). */
  maxVeiled: number;
  /** Stop minting when the whole graph is within this many zones of the
   *  worldstate save cap (WORLDSTATE_CFG.zoneCap) — the save stays healthy. */
  capHeadroom: number;
  /** THE YOUNG-WORLD HUSTLE: while fewer than this many veiled zones exist,
   *  the sweep works at perSweep × hustleMul — so a fresh run's halo fills in
   *  well before the first event wants a seat. */
  hustleBelow: number;
  hustleMul: number;
  /** SOUNDING shape: the veiled cluster grown at a far requested coordinate. */
  sounding: {
    /** Node-unit radius of web grown around the requested coordinate. */
    radius: number;
    /** Budget of zones a single sounding may mint (its cluster size cap). */
    maxNodes: number;
    /** Most sounding requests honored per sweep (they share the sweep budget). */
    perSweep: number;
  };
}

export const FORECHART_CFG: ForechartCfg = {
  enabled: true,
  // THE PREGEN DOCTRINE (2026-07-23): ring 720 → 1000, maxVeiled 650 → 900,
  // hustle window widened to match — the halo is a pre-explored COUNTRY
  // (~12 steps out; the occupancy law makes it converge at honest spacing
  // capacity, so maxVeiled is a ceiling, not a target), and the MINT HORIZON
  // (480) rides ~520u inside it — the player's vicinity is minted long
  // before arrival. Ring 1400 was measured and RETREATED: the young-world
  // fill then lives in foreordained first-touch territory (whole-sea/relief
  // units of 200-340ms) for many minutes — the governor bounds the stack,
  // but the single-unit bill is worldgen's own (the standing follow-up chip:
  // slice/index the first-touch costs, then the ring can grow again).
  // zoneCap 2000 minus capHeadroom still bounds the save; the zones save
  // memo keeps the autosave cheap at this scale.
  ring: 1000,
  perSweep: 4,
  beatBudgetMs: 6,
  sweepSec: 0.45,
  maxVeiled: 900,
  capHeadroom: 200,
  hustleBelow: 300,
  hustleMul: 3,
  horizon: 480,
  sounding: { radius: 180, maxNodes: 14, perSweep: 1 },
};

/** A far pre-chart request (WorldOverlay.requestSoundings → the engine's
 *  forechart drain): grow a veiled cluster of real zones around `at`, so an
 *  event seated out there stands on ground, not on a bare coordinate. */
export interface SoundingRequest {
  at: MapCoord;
  /** Cluster radius override (node units; default FORECHART_CFG.sounding.radius). */
  radius?: number;
  /** The dimension the cluster grows in. Overlays LEAVE THIS UNSET — the sim's
   *  drain stamps each request with its requesting instance's own dimension
   *  (an overlay never names a plane it doesn't run in). */
  dimension?: string;
}

/** May this zone act as a SWEEP SOURCE (its '?' frontiers resolved by the
 *  forechart)? One law shared by the engine sweep, the probe, and any dev
 *  lens — mirrors surveyAround's own source filters: never chart FROM
 *  sanctuaries, unwired floats, event ground, purchased pockets, or caves.
 *  `allowFloating` is the SOUNDING exception: a far cluster's floating
 *  anchor is exactly the bud its own growth starts from. */
export function forechartSource(z: ZoneDef, dimension: string, allowFloating = false): boolean {
  return (z.dimension ?? 'surface') === dimension
    && z.caveDepth == null && !z.pocket && (allowFloating || !z.floating) && !z.eventOwned
    && z.objective.kind !== 'safe'
    && z.exits.some(e => e.to === '?' && !e.lock);
}

/** BFS hop-distance over the zone graph from a set of origin ids — the
 *  shared "how many zones away" read (seat specs, omens, QA). Walks real
 *  exits only ('?' frontiers and cross-dimension edges don't count), capped
 *  at maxHops. Returns id → hops (origins at 0). Pure. */
export function webHops(
  byId: Record<string, ZoneDef>, fromIds: string[], maxHops: number,
): Map<string, number> {
  const hops = new Map<string, number>();
  let wave = fromIds.filter(id => byId[id]);
  for (const id of wave) hops.set(id, 0);
  for (let h = 1; h <= maxHops && wave.length; h++) {
    const next: string[] = [];
    for (const id of wave) {
      const z = byId[id];
      if (!z) continue;
      for (const e of z.exits) {
        if (e.to === '?' || e.crossDim || hops.has(e.to)) continue;
        const n = byId[e.to];
        if (!n || (n.dimension ?? 'surface') !== (z.dimension ?? 'surface')) continue;
        hops.set(e.to, h);
        next.push(e.to);
      }
    }
    wave = next;
  }
  return hops;
}

/** Every zone within `radius` node-units of a coordinate, same dimension,
 *  on-graph — the Euclidean sibling of webHops (the spire's inPulse shape,
 *  shared). Pure. */
export function zonesWithin(
  zones: Iterable<ZoneDef>, at: MapCoord, radius: number, dimension: string,
): ZoneDef[] {
  const out: ZoneDef[] = [];
  for (const z of zones) {
    if ((z.dimension ?? 'surface') !== dimension || z.caveDepth != null) continue;
    if (coordDist(z.map, at) <= radius) out.push(z);
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE SOULRIVER — the River of Souls: the underworld's one navigable artery.
//
// A single mint-once MEGAZONE (the field-hub law below ground): a serpentine
// channel of soul-water crossing the whole arena west → east, DOCK STATIONS at
// every meander apex, and THE PALE FERRY — a carrier rider on the track fabric
// (clock-pure, indestructible by construction) that puts out from the
// headwaters, pauses at every pier, frays as the terminus nears, and
// dissolves at the far strand — reborn at the head on the same synced clock.
// Every dock is an ordinary zone EXIT whose frontier PROMISES a different
// underworld country, so the river is the deep's own index: ride it and the
// whole realm opens from one shore.
//
// THE FOREORDAINED TENET (world/seas.ts): everything here is a pure function
// of the seed — the seat (where the river runs, hashed off the dimension's
// gate), the plan (channel, stations, ferry schedule — f(zone seed, size)),
// and the dock deal (which country each pier serves). Computed whole at first
// touch, entry-invariant, never persisted; the player discovers it one shore
// at a time while the system already knows the whole course.
//
// Pure leaf, the courses/fieldRegion discipline: no engine imports (the one
// TrackSpec import is type-only, erased at build), no globals, every number a
// SOULRIVER_CFG dial.
// ---------------------------------------------------------------------------

import { Rng } from '../core/rng';
import type { Vec2 } from '../core/math';
import type { MapCoord, Dir } from './coords';
import type { TrackSpec } from '../engine/tracks';
import { registerZoneInfoSource } from './zoneInfo';
import { registerMarkerSource, type MapMarker } from './mapMarkers';
import type { World } from '../engine/world';

export const SOULRIVER_CFG = {
  /** The one river's stable ids (the uw_gate idiom — a PLACE, not a roll). */
  zoneId: 'soul_river',
  tileset: 'river_of_souls',
  /** Which dimension carries the river + where its seat hangs off that
   *  dimension's gate: `dist` node-units away on a hashed heading (a node
   *  step is ~78-86 — call it two-to-three hops out), `catch` = the basin
   *  radius a chartFrontier target must land in to find the shore. */
  dimension: 'underworld',
  seat: { dist: [200, 275] as [number, number], catch: 64, salt: 0x50f7a },
  /** The in-zone plan (all f(zone seed, arena size)):
   *  pts — channel polyline vertex count (waves×pts must land apex stations
   *  on integer indices: 2.5 × 60 → apexes at 6/18/30/42/54);
   *  waves — full meanders across the run (each apex is a dock);
   *  width — channel breadth band, px;  margin — arena edge clearance;
   *  bankPad — walkable bank depth beyond the channel before the meander
   *  amplitude is sized;  apron — dock apron stand-off from the waterline;
   *  wobble — per-vertex organic jitter, px. */
  plan: {
    salt: 0x11f7c, pts: 60, waves: 2.5,
    width: [224, 292] as [number, number],
    margin: 250, bankPad: 170, apron: 96, wobble: 26,
  },
  /** The Pale Ferry (a carry rider on the track fabric): deck half-extents
   *  are its honest rect surface AND its painter's hull measure (drawn ==
   *  tested == carried); `count` ferries share the lane a phase apart;
   *  `restSec` is the cradle rest between journeys (the dissolved window);
   *  `fadeTail` is the arc fraction over which the hull frays to nothing. */
  ferry: {
    speed: 84, boardSec: 10, dockSec: 8, restSec: 55, count: 2,
    deck: { hw: 88, hh: 42 }, fadeTail: 0.14,
  },
  /** THE HUNGER (the ride assault): souls conjure from the water while any
   *  living passenger rides — capped live count, spawn cadence band, spawned
   *  `fromWater` px off the prow, intensity multiplied toward `escalate` as
   *  the terminus nears, and `lull` × cadence while paused at a pier (docks
   *  are breathers). */
  assault: {
    cap: 7, everySec: [4.5, 8] as [number, number],
    fromWater: 130, escalate: 1.9, lull: 0.35,
  },
} as const;

// --- the seat ---------------------------------------------------------------

/** Integer hash (the shared world-leaf family — biomes/courses duplicate it
 *  deliberately so leaves stay import-free). */
function hashCell(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}
function hash01(a: number, b: number, seed: number): number {
  return hashCell(a, b, seed) / 0x100000000;
}

/** Where the river runs: a pure offset off the dimension's gate coordinate.
 *  The heading and reach are hashed from the world seed alone, so every
 *  seat, resume and client agrees — and every run's underworld carries its
 *  river somewhere new. */
export function riverSeat(gate: MapCoord, seed: number): MapCoord {
  const s = (seed ^ SOULRIVER_CFG.seat.salt) >>> 0;
  const ang = hash01(1, 0, s) * Math.PI * 2;
  const [d0, d1] = SOULRIVER_CFG.seat.dist;
  const dist = d0 + hash01(2, 0, s) * (d1 - d0);
  return { x: gate.x + Math.cos(ang) * dist, y: gate.y + Math.sin(ang) * dist };
}

/** Does a frontier target land in the river's catch basin? (The mint-once
 *  funnel test — chartFrontier's field-region law, below ground.) */
export function nearRiverSeat(coord: MapCoord, gate: MapCoord, seed: number): boolean {
  const seat = riverSeat(gate, seed);
  return Math.hypot(coord.x - seat.x, coord.y - seat.y) <= SOULRIVER_CFG.seat.catch;
}

// --- the plan ---------------------------------------------------------------

export interface SoulriverDock {
  /** Station ordinal along the course (0 = headwater … last = terminus). */
  i: number;
  /** Apron center — the walkable stand beside the pier. */
  pos: Vec2;
  /** Pier tip — where the ferry pauses (ON the channel centerline). */
  pier: Vec2;
  /** Which arena edge this dock's exit portal stands on… */
  side: Dir;
  /** …and where along it (0..1 — the ZoneExitDef.at contract). */
  at: number;
  /** Channel polyline index the ferry pauses at (0 = head). */
  chIdx: number;
  /** The underworld country this pier serves (a biome id — the exit's
   *  frontier tileset resolves from it at mint). */
  biome: string;
}

export interface SoulriverPlan {
  /** Channel centerline, headwater (west) → terminus (east). */
  channel: Vec2[];
  /** Channel half-width, px. */
  halfW: number;
  /** Every station in course order — headwater, one per meander apex,
   *  terminus. Each is a dock: a pier, an apron, an exit, a country. */
  docks: SoulriverDock[];
}

/** THE PLAN — the river's whole in-zone truth as one pure function of
 *  (seed, arena size, country deal). The layout recipe carves from it, the
 *  mint hook writes dock exits from it, the probes pin it; nothing is ever
 *  stored, so it can never disagree with itself. `biomes` is the dimension's
 *  own palette (dealt over the stations by seeded shuffle — the river is the
 *  realm's index, so the realm's countries are the dock roster). */
export function soulriverPlan(seed: number, w: number, h: number, biomes: readonly string[]): SoulriverPlan {
  const cfg = SOULRIVER_CFG.plan;
  const rng = new Rng((seed ^ cfg.salt) >>> 0);
  const halfW = rng.range(cfg.width[0], cfg.width[1]) / 2;
  const x0 = cfg.margin + 40, x1 = w - cfg.margin - 40;
  const amp = Math.max(140, h / 2 - cfg.margin - halfW - cfg.bankPad);
  const channel: Vec2[] = [];
  for (let i = 0; i <= cfg.pts; i++) {
    const t = i / cfg.pts;
    // Endpoints stay on the midline (sin(0) = sin(2π·waves) = 0 for
    // half-integer waves), so head and terminus meet their edges square.
    const wob = i === 0 || i === cfg.pts ? 0 : rng.range(-cfg.wobble, cfg.wobble);
    channel.push({
      x: x0 + t * (x1 - x0),
      y: h / 2 + amp * Math.sin(Math.PI * 2 * cfg.waves * t) + wob,
    });
  }
  // The country deal: the realm's palette shuffled once on the plan stream.
  const deal = [...biomes];
  for (let i = deal.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [deal[i], deal[j]] = [deal[j], deal[i]];
  }
  const dealAt = (i: number): string => deal.length ? deal[i % deal.length] : 'grave';
  const docks: SoulriverDock[] = [];
  // Headwater: the boarding shore, west edge.
  docks.push({
    i: 0, pos: { x: x0 - halfW - cfg.apron, y: h / 2 }, pier: { ...channel[0] },
    side: 'w', at: 0.5, chIdx: 0, biome: dealAt(0),
  });
  // One dock per meander apex (|sin| = 1): t = (0.25 + 0.5k) / waves.
  const apexes = Math.floor(cfg.waves * 2);
  for (let k = 0; k < apexes; k++) {
    const t = (0.25 + 0.5 * k) / cfg.waves;
    if (t >= 1) break;
    const idx = Math.round(t * cfg.pts);
    const pt = channel[idx];
    const south = Math.sin(Math.PI * 2 * cfg.waves * t) > 0; // canvas y+ = south
    const sgn = south ? 1 : -1;
    docks.push({
      i: docks.length,
      pos: { x: pt.x, y: pt.y + sgn * (halfW + cfg.apron) },
      pier: { ...pt },
      side: south ? 's' : 'n',
      at: Math.min(0.94, Math.max(0.06, pt.x / w)),
      chIdx: idx,
      biome: dealAt(docks.length),
    });
  }
  // Terminus: the far strand, east edge.
  docks.push({
    i: docks.length, pos: { x: x1 + halfW + cfg.apron, y: h / 2 }, pier: { ...channel[cfg.pts] },
    side: 'e', at: 0.5, chIdx: cfg.pts, biome: dealAt(docks.length),
  });
  return { channel, halfW, docks };
}

/** The Pale Ferry's lane, straight off the plan: a once-lane down the whole
 *  channel with a boarding hold at the head, a pause at every pier, an
 *  alighting pause at the terminus, then the cradle rest (the dissolved
 *  window) — cycling forever on the pure clock. `count` ferries ride the
 *  same lane a phase apart, so a missed boat is never a full cycle's wait. */
export function ferryLaneFor(plan: SoulriverPlan): TrackSpec {
  const f = SOULRIVER_CFG.ferry;
  const pauses: { at: number; sec: number }[] = [];
  for (const d of plan.docks) {
    pauses.push({
      at: d.chIdx,
      sec: d.chIdx === 0 ? f.boardSec : d.chIdx === plan.channel.length - 1 ? Math.min(f.dockSec, 6) : f.dockSec,
    });
  }
  const riders = [] as { kind: string; phase?: number }[];
  for (let i = 0; i < f.count; i++) riders.push({ kind: 'pale_ferry', phase: i / f.count });
  return {
    path: plan.channel.map(p => ({ x: p.x, y: p.y })),
    mode: 'once',
    speed: f.speed,
    pauses,
    riders,
    // The river IS the way — no scored groove stroke over open water.
    groove: true,
    rearm: f.restSec,
    tag: 'pale_ferry',
  };
}

// --- the map's word ---------------------------------------------------------

// The zone pane names the artery (the courses attribution doctrine): wearing
// the soulway biome MEANS the seat law minted this ground — say what the
// ferry is for.
registerZoneInfoSource((world, zoneId) => {
  const z = world.zoneMap[zoneId];
  if (!z || z.id !== SOULRIVER_CFG.zoneId) return [];
  return [{
    kind: 'modifier' as const,
    icon: '⛴',
    color: '#7fc4e8',
    label: 'The River of Souls',
    detail: 'the Pale Ferry calls at every shore — ride it to the realm\'s far countries',
  }];
});

// The charted river wears its ferry glyph beside the node (the harborhold
// badge idiom — paint only, the pane carries the words).
registerMarkerSource((world: World): MapMarker[] => {
  const def = world.zoneMap[SOULRIVER_CFG.zoneId];
  if (!def) return [];
  return [{
    id: 'soulriver', coord: { x: def.map.x + 16, y: def.map.y + 10 }, glyph: '⛴', r: 7,
    fill: '#10202c', stroke: '#4a8ab0', text: '#9fd8ec',
    title: `${def.name} — the deep's own crossing`,
    detail: 'The Pale Ferry pauses at every pier; each dock opens another country of the realm.',
    fog: 'charted', z: 18, dimension: def.dimension,
  }];
});

// ---------------------------------------------------------------------------
// THE SOULRIVER — the River of Souls: the underworld's INLAND SEA.
//
// THE INVERSION (pass two): the zone's ground IS the water. A colossal
// mint-once megazone whose whole arena is SOUL-WATER (a grid region — the
// living deep, drawn by the renderer's 'souls' pass), and land exists only
// as small outcroppings: a pier islet at every ferry station, a thin stub
// from each entry portal to its nearest islet, and scattered strand-islets
// adrift in the expanse. THE SOUL-SHIP (the Pale Ferry grown to a
// traversible deck — a near-landmass on the track fabric's carrier law) is
// the one honest way across: the water itself DRAINS THE SOUL TETHER (the
// survival-meter fabric — the river's dead grasp at the living), so you
// ride, fight on the boards, and go ashore where the ferryman pauses.
//
// THE UNTETHERING (pass three): the souls are bound to no gate, so the
// river answers to none. The soulway is a STREWN course (world/courses.ts —
// anchor 'strewn'): instances dealt across the whole underworld chart, pure
// f(seed), each winding its own way. THERE CAN BE MANY RIVERS OF SOULS —
// chartFrontier funnels any frontier landing in an instance's corridor to
// THAT instance's mint-once megazone (the field-region law over an AREA,
// dealt plural), and one may happen to pass the Hellgate, or none may. The
// river is connective tissue the way the surface's Fields are — met, not
// granted — and every instance wears the same name: it is ONE river,
// encountered again.
//
// THE RIDE IS THE CONTENT: stations are many, but LANDINGS are few — only a
// dealt, well-spread subset of piers carries an exit portal and a minted
// port zone (SOULRIVER_CFG.plan.landings). The rest are wild strands: the
// ferry still calls, the islet still stands, but the shore leads nowhere —
// you ride deeper instead. Pier runs and dock aprons pour as BOARDWALK grid
// cells (a deck over the water — the static Boards Shield), so waiting for
// the ship never drinks the soul. And the ship itself deals its DIRECTION
// each journey (TrackSpec.reversal — the coin at the cradle): upstream
// crossings happen as often as down, so every shore is eventually served.
//
// THE SEA ON THE MAP: each instance's ribbon paints the hell tab's wash;
// dock DESTINATIONS mint as real zones at spread coordinates along the
// ribbon (the sea fabric's port idiom — veiled until found); the zone-kind
// row ('soulriver') gives the node its sea identity + lane-styled roads;
// and the live SOUL-SHIP markers ride the ribbon on the chart (the voyage
// boat idiom — World.soulriverShipCoords projects the pure ferry pose onto
// the course).
//
// THE FOREORDAINED TENET holds throughout: instances, seats, plans, ports —
// all pure functions of the seed, computed whole at first touch, revealed
// as found, never persisted. ONE seed expression (soulwaySeed — the same
// derivation the dimension's biome sampler uses) keeps the drawn ribbon,
// the funnel corridor, and the port math exactly equal.
//
// Pure leaf, the courses/fieldRegion discipline: no engine imports (the one
// TrackSpec import is type-only, erased at build), every number a
// SOULRIVER_CFG dial.
// ---------------------------------------------------------------------------

import { Rng } from '../core/rng';
import type { Vec2 } from '../core/math';
import type { MapCoord, Dir } from './coords';
import {
  coursePolyline, courseHit, strewnCellInstance, strewnInstancesNear,
  type CourseInstance,
} from './courses';
import { SOULWAY_COURSE } from './dimensions';
import type { TrackSpec } from '../engine/tracks';
import { registerZoneInfoSource } from './zoneInfo';

export { SOULWAY_COURSE };
export type { CourseInstance };

export const SOULRIVER_CFG = {
  /** Instance zone ids: `${zoneIdBase}_<cellKey>` (the uw_gate stable-id
   *  idiom, dealt plural — a PLACE per instance, never a roll). The bare
   *  base matches too (a legacy single-river save keeps its shore). */
  zoneIdBase: 'soul_river',
  /** Port zone ids: `${dockIdBase}_<cellKey>_<stationOrdinal>`. */
  dockIdBase: 'soul_dock',
  tileset: 'river_of_souls',
  dimension: 'underworld',
  /** The in-zone plan (all f(zone seed, arena size)):
   *  pts — route polyline vertex count (waves×pts lands apex stations on
   *  integer indices: 2.5 × 60 → apexes at 6/18/30/42/54);
   *  waves — full meanders of the soul-ship's route (each apex a station);
   *  margin — arena edge clearance for the route;
   *  laneClear — open-water clearance kept either side of the route (no
   *  islet may crowd the soul-ship's way);
   *  outcropR — pier islet radius band;  plankGap — deck rim → gangplank
   *  gap;  plankLen — gangplank length;  stubW — entry-causeway half-width
   *  (the ONLY land paths in the zone);  islets — strand-islet count band
   *  (the land 'doodads' of the inversion);  isletR — their radius band;
   *  landingEvery/landingBand — LANDINGS (stations carrying an EXIT + a
   *  minted port) scale with the river: one per `landingEvery` units of
   *  route length, clamped to the band — a longer sea earns more doors,
   *  never a wall of them (the rest are wild strands the ferry still
   *  calls at);  pierW — pier-run boardwalk half-width;  apronR — the
   *  waiting head's boardwalk disc at the water end of the pier. */
  plan: {
    salt: 0x11f7c, pts: 60, waves: 2.5,
    margin: 300, laneClear: 150,
    outcropR: [128, 168] as [number, number],
    plankGap: 12, plankLen: 56, stubW: 34,
    islets: [9, 14] as [number, number],
    isletR: [34, 86] as [number, number],
    landingEvery: 2600, landingBand: [2, 4] as [number, number],
    pierW: 24, apronR: 46,
  },
  /** The Soul-Ship (a carry rider on the track fabric): deck half-extents
   *  are its honest rect surface AND its painter's hull measure (drawn ==
   *  tested == carried) — a traversible near-landmass, the whole deck a
   *  fighting ground. `restSec` is the cradle rest between journeys (the
   *  dissolved window); `fadeTail` the arc fraction over which the hull
   *  frays to nothing; `reversal` the coin at the cradle — the chance a
   *  journey runs terminus → headwater (TrackSpec.reversal), so the one
   *  zone serves both ways within the same run. */
  ferry: {
    speed: 88, boardSec: 12, dockSec: 9, restSec: 55, count: 2,
    deck: { hw: 210, hh: 96 }, fadeTail: 0.12, reversal: 0.5,
  },
  /** THE HUNGER (the ride assault): souls conjure from the water while any
   *  living passenger rides — capped live (the cap breathes toward
   *  `escalate` × as the journey deepens, whichever way it runs), spawned
   *  `fromWater` px off the hull, `lull` × cadence at the piers. */
  assault: {
    cap: 9, everySec: [4, 7] as [number, number],
    fromWater: 200, escalate: 2.0, lull: 0.35,
  },
  /** THE PORTS: landing destinations mint at spread coordinates along the
   *  soulway ribbon (each landing's own course fraction), offset `portOff`
   *  node-units to alternating banks — the sea fabric's port idiom on a
   *  course. */
  ports: { portOff: 26 },
} as const;

// --- the instances + the corridor -------------------------------------------

/** THE ONE SEED EXPRESSION: every soulway derivation (instances, corridors,
 *  seats, ports) reads the SAME seed the dimension's biome sampler uses
 *  (fieldSeed ^ 0xd1a0 — see World.dimensionBiomeFor), so the drawn ribbon
 *  and the funnel corridor can never disagree. Callers pass the RAW field
 *  seed; the fold happens here, once. */
export function soulwaySeed(fieldSeed: number): number {
  return (fieldSeed ^ 0xd1a0) >>> 0;
}

/** Every dealt river instance whose course could touch `coord` (the strewn
 *  law on the soulway spec). Stable order — first-covering wins, on every
 *  seat. */
export function soulwayInstancesNear(coord: MapCoord, fieldSeed: number): CourseInstance[] {
  return strewnInstancesNear(SOULWAY_COURSE, coord, soulwaySeed(fieldSeed));
}

/** Does a frontier target land ON a soulway ribbon? Returns the CATCHING
 *  instance (the mint-once funnel key) or null. The field-region law over
 *  an AREA, dealt plural: anywhere the map paints a river, the walker finds
 *  that instance's one shore. */
export function soulwayCatchAt(coord: MapCoord, fieldSeed: number): CourseInstance | null {
  for (const inst of soulwayInstancesNear(coord, fieldSeed)) {
    const hit = courseHit(SOULWAY_COURSE, inst.anchor, coord, inst.iseed);
    if (hit && hit.dist <= SOULWAY_COURSE.halfWidth) return inst;
  }
  return null;
}

/** The stable zone id an instance mints under. */
export function riverZoneId(key: string): string {
  return `${SOULRIVER_CFG.zoneIdBase}_${key}`;
}

/** Is this zone id a River of Souls? (Any instance — or the legacy bare id
 *  a pre-untethering save carries.) */
export function isSoulriverId(id: string): boolean {
  return id === SOULRIVER_CFG.zoneIdBase || id.startsWith(SOULRIVER_CFG.zoneIdBase + '_');
}

/** The instance cell key inside a river zone id (null for the legacy bare
 *  id — those rivers keep the shape they saved with). */
export function soulriverKeyOf(id: string): string | null {
  const pre = SOULRIVER_CFG.zoneIdBase + '_';
  return id.startsWith(pre) ? id.slice(pre.length) : null;
}

/** Re-resolve a river zone's instance from its stable id (pure — the
 *  Foreordained Tenet's re-derivation, never a lookup). */
export function soulriverInstanceOf(zoneId: string, fieldSeed: number): CourseInstance | null {
  const key = soulriverKeyOf(zoneId);
  if (!key) return null;
  const [cx, cy] = key.split('_').map(Number);
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  return strewnCellInstance(SOULWAY_COURSE, cx, cy, soulwaySeed(fieldSeed));
}

/** Where an instance's zone NODE sits: its course midpoint (the sea's heart
 *  lies mid-ribbon). */
export function riverSeatOf(inst: CourseInstance): MapCoord {
  const pts = coursePolyline(SOULWAY_COURSE, inst.anchor, inst.iseed);
  const mid = pts[Math.floor(pts.length / 2)];
  return { x: mid.x, y: mid.y };
}

/** A point ALONG an instance's ribbon at course fraction t (0 spring → 1
 *  terminus), offset `off` node-units to the segment normal (sign picks the
 *  bank). off 0 = the centerline itself (the live ship markers ride here). */
export function ribbonCoordAt(inst: CourseInstance, t: number, off = 0, sgn = 1): MapCoord {
  const pts = coursePolyline(SOULWAY_COURSE, inst.anchor, inst.iseed);
  const tc = Math.min(1, Math.max(0, t));
  const fi = tc * (pts.length - 1);
  const i0 = Math.min(pts.length - 2, Math.floor(fi));
  const f = fi - i0;
  const a = pts[i0], b = pts[i0 + 1];
  const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
  if (!off) return { x, y };
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: x + (-(b.y - a.y) / len) * off * sgn, y: y + ((b.x - a.x) / len) * off * sgn };
}

/** The LANDING destination coordinates for an instance: one per landing, at
 *  the landing's own course fraction (the in-zone route unrolled onto the
 *  ribbon — port geography mirrors pier geography), offset to alternating
 *  banks. Pure of the seed — computed whole, minted veiled, revealed as
 *  found. */
export function dockDestCoordsFor(inst: CourseInstance, fracs: number[]): MapCoord[] {
  const off = SOULWAY_COURSE.halfWidth + SOULRIVER_CFG.ports.portOff;
  return fracs.map((t, i) =>
    ribbonCoordAt(inst, 0.06 + Math.min(1, Math.max(0, t)) * 0.88, off, i % 2 === 0 ? 1 : -1));
}

/** The BERTH coordinates for an instance: the river's own map mouths, one
 *  per landing ON the ribbon centerline at the same course fractions its
 *  ports use (ZoneDef.berths — one zone, several mouths: the chart draws a
 *  small river node beside each port, and roads snap to the nearest). */
export function berthCoordsFor(inst: CourseInstance, fracs: number[]): MapCoord[] {
  return fracs.map(t => ribbonCoordAt(inst, 0.06 + Math.min(1, Math.max(0, t)) * 0.88));
}

// --- the plan ---------------------------------------------------------------

export interface SoulriverDock {
  /** Station ordinal along the route (0 = headwater … last = terminus). */
  i: number;
  /** Pier ISLET center — the outcrop the pier grows from. */
  pos: Vec2;
  /** Outcrop radius (the islet's land disc). */
  outcropR: number;
  /** Where the soul-ship pauses (ON the route). */
  pier: Vec2;
  /** The waiting head: where the pier's boardwalk ENDS, a gangway short of
   *  the hull's flank (the apron you stand on while the ship comes in —
   *  boards over the water, never the water itself). */
  apron: Vec2;
  /** Does this station carry an EXIT portal + a minted port? Landings are
   *  the dealt few; the rest are wild strands the ferry still calls at. */
  landing: boolean;
  /** Which arena edge a landing's exit portal stands on… */
  side: Dir;
  /** …and where along it (0..1 — the ZoneExitDef.at contract). */
  at: number;
  /** Route polyline index the ship pauses at (0 = head). */
  chIdx: number;
  /** The underworld country this pier serves (meaningful on landings). */
  biome: string;
}

export interface SoulriverPlan {
  /** The soul-ship's route, headwater (west) → terminus (east). */
  channel: Vec2[];
  /** Half the deck's beam + lane clearance — the open-water band islets
   *  must keep clear of (the sailing lane law). */
  laneHalfW: number;
  /** Every station in route order — each a pier islet; the dealt LANDINGS
   *  among them carry exits + ports. */
  docks: SoulriverDock[];
  /** The landing subset, route order (docks.filter(landing) — convenience,
   *  same objects). */
  landings: SoulriverDock[];
  /** The strand-islets: the inversion's 'land doodads', adrift in the
   *  expanse, clear of the sailing lane and every dock. */
  islets: { x: number; y: number; r: number }[];
}

/** THE PLAN — the sea's whole in-zone truth as one pure function of
 *  (seed, arena size, country deal). The layout recipe pours from it, the
 *  mint hook mints ports from it, the probes pin it. */
export function soulriverPlan(seed: number, w: number, h: number, biomes: readonly string[]): SoulriverPlan {
  const cfg = SOULRIVER_CFG.plan;
  const deck = SOULRIVER_CFG.ferry.deck;
  const rng = new Rng((seed ^ cfg.salt) >>> 0);
  const laneHalfW = deck.hh + cfg.laneClear;
  const outcropOff = (r: number): number => deck.hh + cfg.plankGap + cfg.plankLen + r;
  const oR = (): number => rng.range(cfg.outcropR[0], cfg.outcropR[1]);
  // The route: a serpentine sweep of the whole expanse. Amplitude leaves
  // room for the pier islet + its stub outside each apex.
  const maxR = cfg.outcropR[1];
  const x0 = cfg.margin + 60, x1 = w - cfg.margin - 60;
  const amp = Math.max(200, h / 2 - cfg.margin - outcropOff(maxR) - maxR * 0.4);
  const channel: Vec2[] = [];
  for (let i = 0; i <= cfg.pts; i++) {
    const t = i / cfg.pts;
    const wob = i === 0 || i === cfg.pts ? 0 : rng.range(-30, 30);
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
  // The waiting head: boards end a gangway short of the hull's flank.
  const apronOf = (pos: Vec2, pier: Vec2): Vec2 => {
    const dx = pier.x - pos.x, dy = pier.y - pos.y;
    const dist = Math.hypot(dx, dy) || 1;
    const s = dist - deck.hh - cfg.plankGap;
    return { x: pos.x + (dx / dist) * s, y: pos.y + (dy / dist) * s };
  };
  const docks: SoulriverDock[] = [];
  const station = (pos: Vec2, pier: Vec2, side: Dir, at: number, chIdx: number, outcropR: number): void => {
    docks.push({
      i: docks.length, pos, outcropR, pier: { ...pier }, apron: apronOf(pos, pier),
      landing: false, side, at, chIdx, biome: dealAt(docks.length),
    });
  };
  // Headwater: the boarding islet, west of the route's spring.
  {
    const r = oR();
    station({ x: x0 - outcropOff(r), y: h / 2 }, channel[0], 'w', 0.5, 0, r);
  }
  // One pier islet per meander apex (|sin| = 1): t = (0.25 + 0.5k) / waves.
  const apexes = Math.floor(cfg.waves * 2);
  for (let k = 0; k < apexes; k++) {
    const t = (0.25 + 0.5 * k) / cfg.waves;
    if (t >= 1) break;
    const idx = Math.round(t * cfg.pts);
    const pt = channel[idx];
    const south = Math.sin(Math.PI * 2 * cfg.waves * t) > 0; // canvas y+ = south
    const sgn = south ? 1 : -1;
    const r = oR();
    station({ x: pt.x, y: pt.y + sgn * outcropOff(r) }, pt,
      south ? 's' : 'n', Math.min(0.94, Math.max(0.06, pt.x / w)), idx, r);
  }
  // Terminus: the far strand, east of the route's end.
  {
    const r = oR();
    station({ x: x1 + outcropOff(r), y: h / 2 }, channel[cfg.pts], 'e', 0.5, cfg.pts, r);
  }
  // THE LANDING DEAL: only a dealt, well-spread few stations carry an exit
  // + a port — the rest are wild strands (the ferry still calls; the shore
  // leads nowhere). The COUNT scales with the river itself (one landing
  // per landingEvery units of route, clamped to the band — the sea-port
  // idiom: doors proportional to coastline, never a wall of them); the
  // SPREAD is greedy max-min over route position.
  let routeLen = 0;
  for (let i = 1; i < channel.length; i++) {
    routeLen += Math.hypot(channel[i].x - channel[i - 1].x, channel[i].y - channel[i - 1].y);
  }
  const nLand = Math.min(docks.length, Math.max(cfg.landingBand[0],
    Math.min(cfg.landingBand[1], Math.round(routeLen / cfg.landingEvery))));
  const chosen: number[] = [rng.int(0, docks.length - 1)];
  while (chosen.length < nLand) {
    let best = -1, bestD = -1;
    for (let i = 0; i < docks.length; i++) {
      if (chosen.includes(i)) continue;
      const d = Math.min(...chosen.map(c => Math.abs(docks[c].chIdx - docks[i].chIdx)));
      if (d > bestD) { bestD = d; best = i; }
    }
    chosen.push(best);
  }
  for (const i of chosen) docks[i].landing = true;
  const landings = docks.filter(d => d.landing);
  // THE STRAND-ISLETS: the inversion's land 'doodads' — rolled clear of the
  // sailing lane (laneHalfW either side of every route segment), the pier
  // islets, and the arena rim. Refusal-sampled: a roll that crowds anything
  // is simply not land (the honest dice — count is a band, not a promise).
  const islets: { x: number; y: number; r: number }[] = [];
  const wantIslets = rng.int(cfg.islets[0], cfg.islets[1]);
  const clearOfLane = (x: number, y: number, r: number): boolean => {
    for (let i = 0; i < channel.length - 1; i++) {
      const a = channel[i], b = channel[i + 1];
      const vx = b.x - a.x, vy = b.y - a.y;
      const L2 = vx * vx + vy * vy || 1;
      const u = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / L2));
      const qx = a.x + vx * u, qy = a.y + vy * u;
      if (Math.hypot(x - qx, y - qy) < laneHalfW + r + 20) return false;
    }
    return true;
  };
  for (let tries = 0; tries < wantIslets * 8 && islets.length < wantIslets; tries++) {
    const r = rng.range(cfg.isletR[0], cfg.isletR[1]);
    const x = rng.range(cfg.margin * 0.6, w - cfg.margin * 0.6);
    const y = rng.range(cfg.margin * 0.6, h - cfg.margin * 0.6);
    if (!clearOfLane(x, y, r)) continue;
    if (docks.some(d => Math.hypot(x - d.pos.x, y - d.pos.y) < d.outcropR + r + 90)) continue;
    if (islets.some(s => Math.hypot(x - s.x, y - s.y) < s.r + r + 70)) continue;
    islets.push({ x, y, r });
  }
  return { channel, laneHalfW, docks, landings, islets };
}

/** Where along the route (0 headwater → 1 terminus) a zone-space point
 *  sits — the nearest-point projection onto the channel polyline. Direction-
 *  blind on purpose: the chart's ship markers ride it whichever way the
 *  coin sent the journey. */
export function channelFracOf(plan: SoulriverPlan, x: number, y: number): number {
  const ch = plan.channel;
  let best = 0, bestD2 = Infinity, arcAt = 0, arc = 0;
  for (let i = 0; i < ch.length - 1; i++) {
    const a = ch[i], b = ch[i + 1];
    const vx = b.x - a.x, vy = b.y - a.y;
    const L2 = vx * vx + vy * vy || 1;
    const segLen = Math.sqrt(L2);
    const u = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / L2));
    const d2 = (x - (a.x + vx * u)) ** 2 + (y - (a.y + vy * u)) ** 2;
    if (d2 < bestD2) { bestD2 = d2; best = arc + segLen * u; }
    arc += segLen;
    arcAt = arc;
  }
  return arcAt > 0 ? best / arcAt : 0;
}

/** The Soul-Ship's lane, straight off the plan: a once-lane down the whole
 *  route with a boarding hold at each END (symmetric, so the coin-dealt
 *  reversed journey boards exactly like the forward one), a pause at every
 *  pier, then the cradle rest (the dissolved window) — cycling forever on
 *  the pure clock. `count` ships ride the same lane a phase apart, so a
 *  missed boat is never a full cycle's wait; each release deals its OWN
 *  direction (TrackSpec.reversal). */
export function ferryLaneFor(plan: SoulriverPlan): TrackSpec {
  const f = SOULRIVER_CFG.ferry;
  const last = plan.channel.length - 1;
  const pauses: { at: number; sec: number }[] = [];
  for (const d of plan.docks) {
    pauses.push({ at: d.chIdx, sec: d.chIdx === 0 || d.chIdx === last ? f.boardSec : f.dockSec });
  }
  const riders = [] as { kind: string; phase?: number }[];
  for (let i = 0; i < f.count; i++) riders.push({ kind: 'pale_ferry', phase: i / f.count });
  return {
    path: plan.channel.map(p => ({ x: p.x, y: p.y })),
    mode: 'once',
    speed: f.speed,
    pauses,
    riders,
    // The sea IS the way — no scored groove stroke over open water.
    groove: true,
    rearm: f.restSec,
    reversal: f.reversal,
    tag: 'pale_ferry',
  };
}

// --- the map's word ---------------------------------------------------------

// The zone pane names the sea (the courses attribution doctrine): wearing
// the soulway biome MEANS a strewn instance minted this ground — say what
// the soul-ship is for. (The node's RING + glyph ride the 'soulriver' zone
// KIND — data/zoneKinds.ts; the live ship markers ride the voyage-boat
// idiom in world/mapMarkers.ts.)
registerZoneInfoSource((world, zoneId) => {
  const z = world.zoneMap[zoneId];
  if (!z || !isSoulriverId(z.id)) return [];
  return [{
    kind: 'modifier' as const,
    icon: '⛴',
    color: '#7fc4e8',
    label: 'The River of Souls',
    detail: 'an inland sea of the dead — ride the Soul-Ship; the water itself will drink your soul. The one river, met again wherever the dead pour.',
  }];
});

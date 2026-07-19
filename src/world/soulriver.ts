// ---------------------------------------------------------------------------
// THE SOULRIVER — the River of Souls: the underworld's INLAND SEA.
//
// THE INVERSION (pass two): the zone's ground IS the water. One colossal
// mint-once megazone whose whole arena is SOUL-WATER (a grid region — the
// living deep, drawn by the renderer's 'souls' pass), and land exists only
// as small outcroppings: a dock islet at every ferry station, a thin stub
// from each entry portal to its dock, and scattered strand-islets adrift in
// the expanse. THE SOUL-SHIP (the Pale Ferry grown to a traversible deck —
// a near-landmass on the track fabric's carrier law) is the one honest way
// across: the water itself DRAINS THE SOUL TETHER (the survival-meter
// fabric — the river's dead grasp at the living), so you ride, fight on the
// boards, and go ashore where the ferryman pauses.
//
// THE SEA ON THE MAP: the soulway is a REAL course on the underworld's own
// chart (DimensionDef.courses — the wash ribbon reads as a body of water on
// the hell tab), and chartFrontier funnels ANY frontier landing in its
// corridor to the same river (the field-region mint-once law over an AREA).
// The dock DESTINATIONS mint as real zones at spread coordinates along the
// ribbon (the sea fabric's port idiom — veiled until found), so the river
// leads to truly distinct locales on the world map, not ring-one neighbors.
//
// THE FOREORDAINED TENET holds throughout: seat, course, plan, ports — all
// pure functions of the seed, computed whole at first touch, revealed as
// found, never persisted.
//
// Pure leaf, the courses/fieldRegion discipline: no engine imports (the one
// TrackSpec import is type-only, erased at build), every number a
// SOULRIVER_CFG dial.
// ---------------------------------------------------------------------------

import { Rng } from '../core/rng';
import type { Vec2 } from '../core/math';
import type { MapCoord, Dir } from './coords';
import { coursePolyline, courseHit } from './courses';
import { SOULWAY_COURSE } from './dimensions';
import type { TrackSpec } from '../engine/tracks';
import { registerZoneInfoSource } from './zoneInfo';
import { registerMarkerSource, type MapMarker } from './mapMarkers';
import type { World } from '../engine/world';

export { SOULWAY_COURSE };

export const SOULRIVER_CFG = {
  /** The one river's stable ids (the uw_gate idiom — a PLACE, not a roll). */
  zoneId: 'soul_river',
  tileset: 'river_of_souls',
  dimension: 'underworld',
  /** The in-zone plan (all f(zone seed, arena size)):
   *  pts — route polyline vertex count (waves×pts lands apex stations on
   *  integer indices: 2.5 × 60 → apexes at 6/18/30/42/54);
   *  waves — full meanders of the soul-ship's route (each apex a dock);
   *  margin — arena edge clearance for the route;
   *  laneClear — open-water clearance kept either side of the route (no
   *  islet may crowd the soul-ship's way);
   *  outcropR — dock islet radius band;  plankGap — deck rim → gangplank
   *  gap;  plankLen — gangplank length;  stubW — entry-causeway half-width
   *  (the ONLY land paths in the zone);  islets — strand-islet count band
   *  (the land 'doodads' of the inversion);  isletR — their radius band. */
  plan: {
    salt: 0x11f7c, pts: 60, waves: 2.5,
    margin: 300, laneClear: 150,
    outcropR: [128, 168] as [number, number],
    plankGap: 12, plankLen: 56, stubW: 34,
    islets: [9, 14] as [number, number],
    isletR: [34, 86] as [number, number],
  },
  /** The Soul-Ship (a carry rider on the track fabric): deck half-extents
   *  are its honest rect surface AND its painter's hull measure (drawn ==
   *  tested == carried) — a traversible near-landmass, the whole deck a
   *  fighting ground. `restSec` is the cradle rest between journeys (the
   *  dissolved window); `fadeTail` the arc fraction over which the hull
   *  frays to nothing. */
  ferry: {
    speed: 88, boardSec: 12, dockSec: 9, restSec: 55, count: 2,
    deck: { hw: 210, hh: 96 }, fadeTail: 0.12,
  },
  /** THE HUNGER (the ride assault): souls conjure from the water while any
   *  living passenger rides — capped live (the cap breathes toward
   *  `escalate` × as the terminus nears), spawned `fromWater` px off the
   *  hull, `lull` × cadence at the piers. Scaled up with the deck: the
   *  boards are a battlefield now. */
  assault: {
    cap: 9, everySec: [4, 7] as [number, number],
    fromWater: 200, escalate: 2.0, lull: 0.35,
  },
  /** THE PORTS: dock destinations mint at spread coordinates along the
   *  soulway ribbon (t-fractions per station), offset `portOff` node-units
   *  to alternating banks — the sea fabric's port idiom on a course. */
  ports: { portOff: 26 },
} as const;

// --- the seat + the corridor ------------------------------------------------

/** Where the river zone's own NODE sits: the soulway's midpoint (the course
 *  springs at the gate; the sea's heart lies mid-ribbon). */
export function riverSeat(gate: MapCoord, seed: number): MapCoord {
  const pts = coursePolyline(SOULWAY_COURSE, gate, seed);
  const mid = pts[Math.floor(pts.length / 2)];
  return { x: mid.x, y: mid.y };
}

/** Does a frontier target land ON the soulway (inside the course corridor)?
 *  The mint-once funnel test — the field-region law over an AREA: anywhere
 *  the map paints the river, the walker finds the same shore. */
export function nearRiverSeat(coord: MapCoord, gate: MapCoord, seed: number): boolean {
  const hit = courseHit(SOULWAY_COURSE, gate, coord, seed);
  return !!hit && hit.dist <= SOULWAY_COURSE.halfWidth;
}

/** The dock DESTINATION coordinates: one per station, spread along the
 *  soulway ribbon at the station's own course fraction, offset to
 *  alternating banks (the ports of the inland sea). Pure of the seed —
 *  computed whole at first touch, minted veiled, revealed as found. */
export function dockDestCoords(gate: MapCoord, seed: number, count: number): MapCoord[] {
  const pts = coursePolyline(SOULWAY_COURSE, gate, seed);
  const out: MapCoord[] = [];
  for (let i = 0; i < count; i++) {
    const t = count <= 1 ? 0.5 : 0.06 + (i / (count - 1)) * 0.88;
    const fi = t * (pts.length - 1);
    const i0 = Math.min(pts.length - 2, Math.floor(fi));
    const f = fi - i0;
    const a = pts[i0], b = pts[i0 + 1];
    const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
    const off = SOULWAY_COURSE.halfWidth + SOULRIVER_CFG.ports.portOff;
    const sgn = i % 2 === 0 ? 1 : -1;
    out.push({ x: x + nx * off * sgn, y: y + ny * off * sgn });
  }
  return out;
}

// --- the plan ---------------------------------------------------------------

export interface SoulriverDock {
  /** Station ordinal along the route (0 = headwater … last = terminus). */
  i: number;
  /** Dock ISLET center — the outcrop the pier grows from. */
  pos: Vec2;
  /** Outcrop radius (the islet's land disc). */
  outcropR: number;
  /** Where the soul-ship pauses (ON the route). */
  pier: Vec2;
  /** Which arena edge this dock's exit portal stands on… */
  side: Dir;
  /** …and where along it (0..1 — the ZoneExitDef.at contract). */
  at: number;
  /** Route polyline index the ship pauses at (0 = head). */
  chIdx: number;
  /** The underworld country this pier serves. */
  biome: string;
}

export interface SoulriverPlan {
  /** The soul-ship's route, headwater (west) → terminus (east). */
  channel: Vec2[];
  /** Half the deck's beam + lane clearance — the open-water band islets
   *  must keep clear of (the sailing lane law). */
  laneHalfW: number;
  /** Every station in route order — each a dock islet with a pier, a
   *  spirit gate, and an exit to its promised country. */
  docks: SoulriverDock[];
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
  // room for the dock islet + its stub outside each apex.
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
  const docks: SoulriverDock[] = [];
  // Headwater: the boarding islet, west of the route's spring.
  {
    const r = oR();
    docks.push({
      i: 0, pos: { x: x0 - outcropOff(r), y: h / 2 }, outcropR: r,
      pier: { ...channel[0] }, side: 'w', at: 0.5, chIdx: 0, biome: dealAt(0),
    });
  }
  // One dock islet per meander apex (|sin| = 1): t = (0.25 + 0.5k) / waves.
  const apexes = Math.floor(cfg.waves * 2);
  for (let k = 0; k < apexes; k++) {
    const t = (0.25 + 0.5 * k) / cfg.waves;
    if (t >= 1) break;
    const idx = Math.round(t * cfg.pts);
    const pt = channel[idx];
    const south = Math.sin(Math.PI * 2 * cfg.waves * t) > 0; // canvas y+ = south
    const sgn = south ? 1 : -1;
    const r = oR();
    docks.push({
      i: docks.length,
      pos: { x: pt.x, y: pt.y + sgn * outcropOff(r) }, outcropR: r,
      pier: { ...pt },
      side: south ? 's' : 'n',
      at: Math.min(0.94, Math.max(0.06, pt.x / w)),
      chIdx: idx,
      biome: dealAt(docks.length),
    });
  }
  // Terminus: the far strand, east of the route's end.
  {
    const r = oR();
    docks.push({
      i: docks.length, pos: { x: x1 + outcropOff(r), y: h / 2 }, outcropR: r,
      pier: { ...channel[cfg.pts] }, side: 'e', at: 0.5, chIdx: cfg.pts, biome: dealAt(docks.length),
    });
  }
  // THE STRAND-ISLETS: the inversion's land 'doodads' — rolled clear of the
  // sailing lane (laneHalfW either side of every route segment), the dock
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
  return { channel, laneHalfW, docks, islets };
}

/** The Soul-Ship's lane, straight off the plan: a once-lane down the whole
 *  route with a boarding hold at the head, a pause at every pier, an
 *  alighting pause at the terminus, then the cradle rest (the dissolved
 *  window) — cycling forever on the pure clock. `count` ships ride the
 *  same lane a phase apart, so a missed boat is never a full cycle's wait. */
export function ferryLaneFor(plan: SoulriverPlan): TrackSpec {
  const f = SOULRIVER_CFG.ferry;
  const pauses: { at: number; sec: number }[] = [];
  for (const d of plan.docks) {
    pauses.push({
      at: d.chIdx,
      sec: d.chIdx === 0 ? f.boardSec : d.chIdx === plan.channel.length - 1 ? Math.min(f.dockSec, 7) : f.dockSec,
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
    // The sea IS the way — no scored groove stroke over open water.
    groove: true,
    rearm: f.restSec,
    tag: 'pale_ferry',
  };
}

// --- the map's word ---------------------------------------------------------

// The zone pane names the sea (the courses attribution doctrine): wearing
// the soulway biome MEANS the funnel minted this ground — say what the
// soul-ship is for.
registerZoneInfoSource((world, zoneId) => {
  const z = world.zoneMap[zoneId];
  if (!z || z.id !== SOULRIVER_CFG.zoneId) return [];
  return [{
    kind: 'modifier' as const,
    icon: '⛴',
    color: '#7fc4e8',
    label: 'The River of Souls',
    detail: 'an inland sea of the dead — ride the Soul-Ship; the water itself will drink your soul',
  }];
});

// The charted sea wears its ship glyph beside the node (the harborhold
// badge idiom — paint only, the pane carries the words).
registerMarkerSource((world: World): MapMarker[] => {
  const def = world.zoneMap[SOULRIVER_CFG.zoneId];
  if (!def) return [];
  return [{
    id: 'soulriver', coord: { x: def.map.x + 16, y: def.map.y + 10 }, glyph: '⛴', r: 7,
    fill: '#10202c', stroke: '#4a8ab0', text: '#9fd8ec',
    title: `${def.name} — the deep's own crossing`,
    detail: 'The Soul-Ship pauses at every pier; each dock opens another country of the realm.',
    fog: 'charted', z: 18, dimension: def.dimension,
  }];
});

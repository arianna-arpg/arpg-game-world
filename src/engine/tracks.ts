// ---------------------------------------------------------------------------
// THE TRACK FABRIC — moving hazards on authored ways, as pure data.
//
// A TRACK is a polyline lane a hazard RIDER travels forever: the Ascendancy-
// trial buzzsaw, the revolving blade arm, the shuttling spike sled. The fabric
// stands deliberately BESIDE the will-lane (patrol routes, the procession
// cart, duty posts): those are BODIES with minds that abandon their way the
// moment the world interrupts them. A track rider is CLOCKWORK — it cannot be
// blocked, distracted, taunted, or slain, and its position is a PURE FUNCTION
// of the zone clock:
//
//     pose = trackPose(track, world.time, rider.phase)
//
// No integration, no velocity state, no drift — host, every co-op seat, and a
// resumed save all read the same blade at the same millimetre from the same
// synced clock (the projectile form painters' age-clock discipline, promoted
// to a fabric). Determinism is a construction property here, not a test hope.
//
// READABILITY is a first-class contract, three guarantees deep:
//   1. THE LANE IS CARVED — gen-time tracks lay a 'track_groove' way under
//      themselves (the traveled-way roller re-worn), so the path is learnable
//      at a glance before the blade ever arrives.
//   2. THE APPROACH TELEGRAPHS — the render layer strokes a warn arc AHEAD of
//      each rider along its lane, and imminentThreatTo() surfaces the same
//      approach to every dodge-mind: the player's eyes and the AI's read are
//      one truth, sampled from the same pure resolver.
//   3. DRAWN == TESTED — a rider's painter draws exactly the HitShape the
//      contact sweep tests (the hit-surface fabric's doctrine): the saw's
//      toothed disc IS its surface; the flail arm's beam IS its rect.
//
// The PAYLOAD rides the existing hazard vocabulary — typed damage through the
// one mitigation ladder (there is no "true damage"), statuses via
// applyStatus, shoves via pushActor (weight-scaled, impulse-additive, and
// pit-aware: a rider owned by a boss shoving a body over an abyss lip kills
// through the pitfall fabric's forced lane WITH CREDIT, all existing code).
// The same TrackPayload grammar attaches to STATIC doodads via
// DoodadRule.contact — a bumper is a rider that never left home.
//
// This module is a PURE LEAF (the pitfall.ts idiom): geometry, registries,
// and config only. The engine half (contact sweep, payload application,
// threat registration) lives in World.updateTracks; the drawn half in
// render/vis/trackLayer.ts. Docs: docs/engine/tracks.md.
// ---------------------------------------------------------------------------

import type { Vec2 } from '../core/math';
import type { HitShape } from './shapes';
import type { DamageType } from './stats';

// --- config ----------------------------------------------------------------

export const TRACK_CFG = {
  /** Salt for any zone-load stream a theme row may roll on (kept distinct
   *  from every other fabric's salt so lanes can't shift each other). */
  salt: 0x7a4c95,
  /** Default per-body re-hit grace (seconds) when a payload names none. */
  icdSec: 0.9,
  /** Contact sweep cadence (seconds) — the creep/fog dressOccupants beat.
   *  Impulse/damage land at most once per ICD anyway; this just bounds the
   *  sweep cost. */
  applyEvery: 0.1,
  /** Default warn-arc length (px of lane ahead of the rider) when a rider
   *  names none. The telegraph the player and the dodge-AI both read. */
  warnAhead: 130,
  /** How far ahead (seconds) imminentThreatTo samples a rider's future —
   *  clipped by the dodge kernel's own horizon. */
  threatHorizon: 1.1,
  /** Threat sampling step (seconds) — the future is exact (pure resolver),
   *  this only bounds how finely we ask it. */
  threatStep: 0.22,
  /** Sanity ceiling: riders per zone (validation + ensure guard). */
  maxRidersPerZone: 24,
  /** Landing shove when a payload carries impulse but the victim is already
   *  dead-centre on the rider (degenerate radial) — push along the lane. */
  degenerateDir: 0.0,
} as const;

// --- payload ---------------------------------------------------------------

/** What touching a hazard DOES — every field optional, every field riding an
 *  existing engine lever. The one grammar shared by track riders and static
 *  contact doodads (DoodadRule.contact). */
export interface TrackPayload {
  /** Typed hit through the one mitigation ladder (mitigateTyped — armor,
   *  resists, the whole defender stack; never evasion/block: you dodge a
   *  buzzsaw with your feet, not your evasion stat). Scales per zone level
   *  like region standDamage. */
  hit?: { base: number; perLevel?: number; type: DamageType };
  /** Status stamped on contact (applyStatus, chance-gated). */
  status?: { id: string; chance?: number };
  /** Radial shove strength (pushActor — weight-scaled, impulse-additive,
   *  pit-aware through the push integrator's forced lane). */
  impulse?: number;
  /** Per-body re-hit grace, seconds (default TRACK_CFG.icdSec). */
  icdSec?: number;
  /** The fog-grant faction grammar: only these factions are touched… */
  factions?: string[];
  /** …or these factions are spared (the Court skates its own lake). */
  notFactions?: string[];
  /** Airborne bodies pass over a ground hazard (default true). */
  sparesAirborne?: boolean;
  /** Dormant un-roused neutrals are PLANTED scenery (default true — the
   *  sentry fabric's spare). */
  sparesDormant?: boolean;
}

// --- riders ----------------------------------------------------------------

/** A registered hazard body that rides tracks. The `kind` names its
 *  DOODAD_VISUALS painter row (the track layer feeds the painter fabric
 *  synthetic doodads — zero renderer switches); the `surface` is its honest
 *  hit shape, posed by the one resolver both the sweep and the painter read. */
export interface TrackRiderDef {
  id: string;
  /** Doodad-kind whose DOODAD_VISUALS entry draws this rider. */
  kind: string;
  /** The honest contact surface. Rects orient per `orient` + `spin`. */
  surface: { kind: 'circle'; r: number } | { kind: 'rect'; hw: number; hh: number };
  /** Rect orientation along the lane: 'lane' = long axis with travel (a
   *  sled), 'radial' = long axis across it (a sweeping arm). Discs ignore. */
  orient?: 'lane' | 'radial';
  /** Own-axis spin, rad/s (visual for discs; folded into a rect's surface
   *  rot — drawn == tested either way). */
  spin?: number;
  payload: TrackPayload;
  /** Warn-arc length px (default TRACK_CFG.warnAhead; 0 = no arc). */
  warnAhead?: number;
  /** Accent for the warn arc / debug reads (falls back to painter's own). */
  color?: string;
}

const TRACK_RIDERS: Record<string, TrackRiderDef> = {};

export function registerTrackRider(def: TrackRiderDef): void {
  if (TRACK_RIDERS[def.id]) console.warn(`[tracks] re-registering rider '${def.id}' — overriding`);
  TRACK_RIDERS[def.id] = def;
}

export function trackRider(id: string): TrackRiderDef | undefined { return TRACK_RIDERS[id]; }
export function trackRiderIds(): string[] { return Object.keys(TRACK_RIDERS); }

// --- track specs (authoring) ----------------------------------------------

/** One authored lane. Zone-space points; a landmark builder, a ZoneTheme row,
 *  or a runtime ensure all speak this same spec. */
export interface TrackSpec {
  /** Waypoints, zone space. ≥2 (≥3 for closed). */
  path: Vec2[];
  /** Closed ring (the last point joins the first). */
  closed?: boolean;
  /** 'loop' circulates (closed or open-with-teleport-home is refused —
   *  open loops require closed geometry); 'pingpong' shuttles end↔end;
   *  'once' runs the open lane a SINGLE pass from birth (`bornAt`) and
   *  retires at the far end (the loosed boulder, the dart in flight —
   *  World.updateTracks culls the done lane with a terminal burst). */
  mode?: 'loop' | 'pingpong' | 'once';
  /** Lane speed, px/s. */
  speed: number;
  /** Dwell plateaus: the rider PAUSES `sec` on arriving at waypoint index
   *  `at` (cadence gates — the sled that rests at each end). */
  pauses?: { at: number; sec: number }[];
  /** The bodies on this lane, each with a phase offset (0..1 of the full
   *  period) so one lane carries a spread of blades. */
  riders: { kind: string; phase?: number }[];
  /** Carve a groove way under the lane at gen time (gen-emitted tracks
   *  only; default true there). Runtime-ensured tracks stroke live. */
  groove?: boolean;
  /** Actor TAG credited for this lane's kills and shoves (the King owns his
   *  court's blades) — resolved live, absent = uncredited environment. */
  ownerTag?: string;
  /** Actor ID credited instead (the trapworks lane a presser loosed —
   *  players wear no tags; resolved live like ownerTag, id outranks tag). */
  ownerId?: number;
  /** Zone-clock second this lane goes LIVE (default 0 = the zone's own
   *  dawn). Before it, riders hold the lane's start pose, PENDING — unspun,
   *  unswept, unthreatening; the track layer strokes the whole coming lane
   *  instead (the volley's rake flashing before the bolts fly). Purity
   *  holds: local time = clock − bornAt, still the one synced clock. */
  bornAt?: number;
  /** Initial armed state (default true). A DISARMED lane retracts whole:
   *  riders undrawn, unswept, unthreatening — only a gen-carved groove
   *  remains as the tell. Flipped live via World.setTracksArmed(tag) — the
   *  pressure plate's appear/disappear lever. */
  armed?: boolean;
  /** Wiring handle: the trapworks fabric (and anything else) arms, disarms
   *  and finds lanes by tag. Not unique — one plate may throw many lanes. */
  tag?: string;
}

// --- placed tracks (runtime) ----------------------------------------------

interface ArcTable {
  pts: Vec2[];          // resolved polyline (closed rings repeat [0] at end)
  cum: number[];        // cumulative arc length at each pt
  total: number;        // full lane length
}

/** One timeline span: either travelling [s0→s1] or dwelling at s0. */
interface ScheduleSpan { t0: number; t1: number; s0: number; s1: number }

export interface PlacedTrack {
  spec: TrackSpec;
  arc: ArcTable;
  /** Travel+pause schedule over one one-way pass. */
  schedule: ScheduleSpan[];
  /** Seconds for one one-way pass (travel + pauses). */
  passSec: number;
  /** Full cycle: loop = passSec; pingpong = 2·passSec; once = passSec. */
  periodSec: number;
  riders: PlacedRider[];
  /** Lane AABB inflated by the widest rider's reach — the threat scan's and
   *  the render cull's quick reject. */
  bound: { x0: number; y0: number; x1: number; y1: number };
  /** Live armed state (seeded from spec.armed; flipped by setTracksArmed).
   *  The ONE gate the sweep, the threat scan, and the track layer all read. */
  armed: boolean;
}

export interface PlacedRider {
  def: TrackRiderDef;
  phase: number;
  /** Per-body re-hit gate: actor id → world time the gate reopens. */
  icdUntil: Map<number, number>;
}

/** A resolved rider pose — position, lane bearing, surface rotation. The ONE
 *  truth the contact sweep, the painter, the warn arc, and the threat scan
 *  all sample. `pending` = the lane's bornAt hasn't struck yet: the rider
 *  holds the start pose, frozen and harmless (the boulder still in its
 *  cradle, the bolt still in the wall). */
export interface TrackPose { x: number; y: number; dir: number; rot: number; paused: boolean; pending?: boolean }

// --- construction ----------------------------------------------------------

function buildArc(path: Vec2[], closed: boolean): ArcTable {
  const pts = closed ? [...path, path[0]] : [...path];
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return { pts, cum, total: cum[cum.length - 1] };
}

/** Build the one-way travel/pause schedule. Pauses key waypoint INDEX in the
 *  authored path (closed rings may pause at 0 — the seam point — once per
 *  pass). Zero-length lanes are refused at validation. */
function buildSchedule(arc: ArcTable, spec: TrackSpec): { spans: ScheduleSpan[]; passSec: number } {
  const speed = Math.max(1e-3, spec.speed);
  const pauseAt = new Map<number, number>();
  for (const p of spec.pauses ?? []) pauseAt.set(p.at, Math.max(0, p.sec));
  const spans: ScheduleSpan[] = [];
  let t = 0;
  // A pause at the very start (index 0) dwells before the first move.
  const p0 = pauseAt.get(0);
  if (p0) { spans.push({ t0: t, t1: t + p0, s0: 0, s1: 0 }); t += p0; }
  for (let i = 1; i < arc.pts.length; i++) {
    const s0 = arc.cum[i - 1], s1 = arc.cum[i];
    const dt = (s1 - s0) / speed;
    if (dt > 0) { spans.push({ t0: t, t1: t + dt, s0, s1 }); t += dt; }
    // Arrival pause (skip the closed ring's synthetic last point — its
    // arrival IS index 0's next-pass departure).
    const idx = spec.closed && i === arc.pts.length - 1 ? -1 : i;
    const ps = idx >= 0 ? pauseAt.get(idx) : undefined;
    if (ps) { spans.push({ t0: t, t1: t + ps, s0: s1, s1 }); t += ps; }
  }
  return { spans, passSec: t };
}

/** Resolve an authored spec into a placed runtime track. Throws on refusal
 *  (validation should have warned earlier — placement refuses garbage so the
 *  sim never carries a NaN lane). */
export function placeTrack(spec: TrackSpec): PlacedTrack {
  const minPts = spec.closed ? 3 : 2;
  if (!spec.path || spec.path.length < minPts) throw new Error(`[tracks] path needs ≥${minPts} points`);
  if ((spec.mode ?? 'loop') === 'loop' && !spec.closed) throw new Error(`[tracks] 'loop' requires closed geometry (use pingpong for open lanes)`);
  if (spec.mode === 'once' && spec.closed) throw new Error(`[tracks] 'once' rides an open lane (a closed ring has no far end to retire at)`);
  const arc = buildArc(spec.path, !!spec.closed);
  if (arc.total < 24) throw new Error(`[tracks] degenerate lane (${arc.total.toFixed(1)}px)`);
  const { spans, passSec } = buildSchedule(arc, spec);
  const periodSec = (spec.mode ?? 'loop') === 'pingpong' ? passSec * 2 : passSec;
  const riders: PlacedRider[] = [];
  let maxReach = 0;
  for (const r of spec.riders ?? []) {
    const def = TRACK_RIDERS[r.kind];
    if (!def) { console.warn(`[tracks] unknown rider '${r.kind}' — lane runs without it`); continue; }
    riders.push({ def, phase: ((r.phase ?? 0) % 1 + 1) % 1, icdUntil: new Map() });
    maxReach = Math.max(maxReach, def.surface.kind === 'circle'
      ? def.surface.r : Math.hypot(def.surface.hw, def.surface.hh));
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of arc.pts) {
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
  }
  const bound = { x0: x0 - maxReach, y0: y0 - maxReach, x1: x1 + maxReach, y1: y1 + maxReach };
  return { spec, arc, schedule: spans, passSec, periodSec, riders, bound, armed: spec.armed ?? true };
}

// --- the pure resolver -----------------------------------------------------

/** Arc position s → world point + lane tangent. */
function pointAt(arc: ArcTable, s: number): { x: number; y: number; dir: number } {
  const { pts, cum, total } = arc;
  const sc = Math.min(Math.max(s, 0), total);
  // Linear walk — lanes carry a handful of points; binary search is vanity.
  let i = 1;
  while (i < cum.length - 1 && cum[i] < sc) i++;
  const a = pts[i - 1], b = pts[i];
  const seg = cum[i] - cum[i - 1];
  const f = seg > 1e-6 ? (sc - cum[i - 1]) / seg : 0;
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    dir: Math.atan2(b.y - a.y, b.x - a.x),
  };
}

/** Schedule time (one pass, 0..passSec) → arc s + dwell flag. */
function scheduleS(spans: ScheduleSpan[], t: number): { s: number; paused: boolean } {
  for (const sp of spans) {
    if (t <= sp.t1) {
      if (sp.s0 === sp.s1) return { s: sp.s0, paused: true };
      const f = (t - sp.t0) / (sp.t1 - sp.t0);
      return { s: sp.s0 + (sp.s1 - sp.s0) * f, paused: false };
    }
  }
  const last = spans[spans.length - 1];
  return { s: last ? last.s1 : 0, paused: false };
}

/** THE resolver: a rider's exact pose at an absolute clock second. Pure —
 *  same clock in, same pose out, on every seat and every resume. A lane with
 *  `bornAt` runs on LOCAL time (clock − bornAt): before birth the rider
 *  holds the start pose pending and unspun; a 'once' lane clamps at the far
 *  end instead of wrapping (the shatter pose the cull reads). Absent bornAt,
 *  local time == the clock — existing lanes are numerics-identical. */
export function trackPose(tr: PlacedTrack, timeSec: number, phase: number, rider?: TrackRiderDef): TrackPose {
  const tl = timeSec - (tr.spec.bornAt ?? 0);
  if (tl < 0) {
    const { s } = scheduleS(tr.schedule, 0);
    const p = pointAt(tr.arc, s);
    const base = rider?.surface.kind === 'rect'
      ? p.dir + (rider.orient === 'radial' ? -Math.PI / 2 : 0)
      : p.dir;
    return { x: p.x, y: p.y, dir: p.dir, rot: base, paused: true, pending: true };
  }
  const period = Math.max(1e-3, tr.periodSec);
  let t: number;
  let reversed = false;
  if (tr.spec.mode === 'once') {
    t = Math.min(tl, tr.passSec);  // single pass — clamp at the far end, never wrap
  } else {
    t = ((tl + phase * period) % period + period) % period;
    if ((tr.spec.mode ?? 'loop') === 'pingpong' && t > tr.passSec) {
      t = tr.periodSec - t;        // mirror the return leg through the SAME schedule
      reversed = true;
    }
  }
  const { s, paused } = scheduleS(tr.schedule, t);
  const p = pointAt(tr.arc, s);
  const dir = reversed ? p.dir + Math.PI : p.dir;
  const spin = (rider?.spin ?? 0) * tl;
  // 'radial' turns the rect across the lane; on a CCW ring the −π/2 turn
  // points local −x at the ring's center, so a hub-ended painter (the flail's
  // boss) lands its pivot at the wheel's heart. The surface is symmetric —
  // only the drawn orientation cares about the sign.
  const base = rider?.surface.kind === 'rect'
    ? dir + (rider.orient === 'radial' ? -Math.PI / 2 : 0)
    : dir;
  return { x: p.x, y: p.y, dir, rot: base + spin, paused };
}

/** The rider's posed hit surface — what the sweep tests IS what the painter
 *  draws (rects carry the pose rot; discs are rotation-invariant). */
export function riderSurface(def: TrackRiderDef, pose: TrackPose): HitShape {
  if (def.surface.kind === 'circle') return { kind: 'circle', r: def.surface.r };
  return { kind: 'rect', hw: def.surface.hw, hh: def.surface.hh, rot: pose.rot };
}

/** A 'once' lane whose single pass has fully run (local time past the far
 *  end) — the cull test World.updateTracks and the probe both read. Pure of
 *  the same clock as trackPose; cyclic lanes are never done. */
export function trackDone(tr: PlacedTrack, timeSec: number): boolean {
  if (tr.spec.mode !== 'once') return false;
  return timeSec - (tr.spec.bornAt ?? 0) >= tr.passSec;
}

/** Still waiting on bornAt — the pending read shared by the sweep skip, the
 *  track layer's rake telegraph, and the threat scan. */
export function trackPending(tr: PlacedTrack, timeSec: number): boolean {
  return timeSec < (tr.spec.bornAt ?? 0);
}

// --- author helpers --------------------------------------------------------

/** A closed ring lane (n points around cx,cy at radius r; phase0 rotates the
 *  seam so grooves don't all start due east). */
export function ringPath(cx: number, cy: number, r: number, n = 24, phase0 = 0): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase0 + (i / n) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

/** An open shuttle lane. */
export function linePath(a: Vec2, b: Vec2): Vec2[] { return [{ x: a.x, y: a.y }, { x: b.x, y: b.y }]; }

// --- validation ------------------------------------------------------------

/** Physical-band lint for a spec (the flock-dial doctrine: dials stay
 *  physical). Returns human-readable gripes; empty = sane. */
export function lintTrackSpec(spec: TrackSpec, where: string): string[] {
  const out: string[] = [];
  const minPts = spec.closed ? 3 : 2;
  if (!spec.path || spec.path.length < minPts) out.push(`${where}: path needs ≥${minPts} points`);
  if ((spec.mode ?? 'loop') === 'loop' && !spec.closed) out.push(`${where}: 'loop' requires closed:true (open lanes pingpong)`);
  if (spec.mode === 'once' && spec.closed) out.push(`${where}: 'once' requires an open lane (closed rings never retire)`);
  if (spec.mode === 'once' && (spec.riders?.length ?? 0) > 1 && spec.riders.some(r => (r.phase ?? 0) !== 0)) {
    out.push(`${where}: 'once' riders share the single pass — phase offsets are dead weight (stagger bornAt across lanes instead)`);
  }
  if (!(spec.speed > 0) || spec.speed > 600) out.push(`${where}: speed ${spec.speed} outside (0,600] px/s`);
  if (!spec.riders?.length) out.push(`${where}: lane with no riders`);
  for (const r of spec.riders ?? []) {
    if (!TRACK_RIDERS[r.kind]) out.push(`${where}: rider '${r.kind}' unregistered`);
    if (r.phase !== undefined && (r.phase < 0 || r.phase >= 1)) out.push(`${where}: rider phase ${r.phase} outside [0,1)`);
  }
  for (const p of spec.pauses ?? []) {
    if (p.at < 0 || p.at >= (spec.path?.length ?? 0)) out.push(`${where}: pause at waypoint ${p.at} out of range`);
    if (p.sec < 0 || p.sec > 20) out.push(`${where}: pause ${p.sec}s outside [0,20]`);
  }
  return out;
}

/** Registered-rider lint (called from validateContent — warn, never throw). */
export function validateTrackRiders(warn: (msg: string) => void): void {
  for (const def of Object.values(TRACK_RIDERS)) {
    const s = def.surface;
    const reach = s.kind === 'circle' ? s.r : Math.hypot(s.hw, s.hh);
    if (!(reach > 2) || reach > 220) warn(`track rider ${def.id}: surface reach ${reach.toFixed(0)}px outside (2,220]`);
    if (def.spin !== undefined && Math.abs(def.spin) > 24) warn(`track rider ${def.id}: spin ${def.spin} rad/s is a blender`);
    const p = def.payload;
    if (!p.hit && !p.status && !p.impulse) warn(`track rider ${def.id}: payload does nothing`);
    if (p.hit && (p.hit.base < 0 || p.hit.base > 400)) warn(`track rider ${def.id}: hit.base ${p.hit.base} outside [0,400]`);
    if (p.impulse !== undefined && (p.impulse < 0 || p.impulse > 900)) warn(`track rider ${def.id}: impulse ${p.impulse} outside [0,900]`);
    if (p.icdSec !== undefined && (p.icdSec < 0.2 || p.icdSec > 10)) warn(`track rider ${def.id}: icd ${p.icdSec}s outside [0.2,10]`);
    if (def.warnAhead !== undefined && (def.warnAhead < 0 || def.warnAhead > 420)) warn(`track rider ${def.id}: warnAhead ${def.warnAhead} outside [0,420]`);
  }
}

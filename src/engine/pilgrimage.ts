// ---------------------------------------------------------------------------
// THE TERRACE PILGRIMAGE — the pure leaf (the Scald Basin's M3 coda; charter
// docs/design/scald-basin.md §8c, the eighth walk: THEATER, ratified).
//
// The geyserkin are the tribe that reads the beat; a PILGRIMAGE is them
// reading it together. A column of striders and shamans sets out from a
// terrace-side MOUTH (a zone edge), climbs to the zone's LOUDEST vent
// carrying prism-crust lanterns, and arrives at the brim AS the surge hour
// begins — procession → surge → wisp tide, the basin's whole life on one
// clock (her compounding law in motion).
//
// THE CUE LAW (her timing ruling, verbatim): "the surge would technically
// happen with or without the procession, but the procession could
// effectively be the cue for noticing the beginning of the surge." So the
// surge stays SOVEREIGN on its pure clock (engine/geysers.ts — the long
// clock, THE ALIGNED TIDE), and this fabric only READS it: `pilgrimageCue`
// is the ONE hook through which the procession learns when the hour opens.
// Nothing here writes the field; the line climbing the terraces is how a
// watchful player notices the hour coming (the show-don't-tell law). On a
// field with no surge key (a hand-built probe field, a package's literal)
// the hook falls back to THE PROVISIONAL CUE — the loudest vent's own next
// burst — so the procession reads exactly as well on bandless ground.
//
// THE RESIDENT LAW's four gates (engine/theater.ts) hold by construction:
// LOCAL (every read here is the zone's own geyser field + the clock),
// UNANNOUNCED (no omen, no map mark, no bulletin — the lanterns and the
// thickening steam are the only announcement), BUDGET-HONEST (the column
// pours through the theater fabric's replacement ledger), ARCLESS (nothing
// resolves — offerings dry away, the line disperses, zone memory at most).
// THE NO-TAG LAW (charter §8b): pilgrims never hover — they walk, fight if
// struck, or keep walking; the vigil at the brim carries a hard ceiling.
//
// This module is a PURE LEAF: config, the cue hook, and geometry resolvers
// only — no World import at runtime (the kind lives in data/pilgrimage.ts).
// Every number is a DIAL (unblessed — she blesses via playthroughs).
// Docs: docs/engine/pilgrimage.md. Probe: balance/probe_pilgrimage.ts.
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import {
  GEYSER_CFG, fieldSurgeWindow, nextSurgeAfter, ventReadAt,
  type GeyserClassId, type GeyserField, type PlacedVent,
} from './geysers';
import type { LightSpec } from '../render/vis/painters';
import type { PartSpec } from '../render/vis/parts';

// --- config (ALL DIAL) ------------------------------------------------------

export const PILGRIMAGE_CFG = {
  /** The theater kind id AND the actor tag the column wears (an AMBIENT tag —
   *  the line passes through, never an objective: the wax_vigil precedent). */
  kind: 'terrace_pilgrimage',
  /** THE CAST: a shaman leads the rite; striders carry the most lanterns. The
   *  tables name EXISTING geyserkin defs — no new combat kit (§8c). */
  cast: {
    lead: 'vent_shaman',
    escort: [{ id: 'stilt_strider', weight: 3 }, { id: 'vent_shaman', weight: 1 }],
    /** Followers asked for on the entry beat (dwell beats trim to the pour
     *  room — THE FARM LAW); below `minFollowers` of room the line declines
     *  whole (a two-body pilgrimage reads as a stroll). */
    followers: 5,
    minFollowers: 2,
  },
  /** THE DEPARTURE BAND: a beat may set the line out only when the cue lies
   *  inside [the fastest honest walk, the slowest honest walk + slack] —
   *  the column must be WALKING, never waiting at a mouth (THE NO-TAG LAW)
   *  and never arriving after the hour. `min` floors the band (never set
   *  out with fewer seconds than this to the cue). */
  depart: { min: 25, slack: 30 },
  /** THE ARRIVAL: the line aims to stand at the brim `lead` seconds BEFORE
   *  the cue (the surge's first tide beat follows t0 by GEYSER_CFG.surge.lead
   *  — they arrive as the broils quicken). */
  arrive: { lead: 3 },
  /** THE PACE SOLVE (re-solved on a cadence as the walk meets terrain):
   *  pace = remaining ÷ (stride × seconds left), clamped to this band
   *  (0.45 = the funeral's slow walk, 1 = a full march). */
  pace: { min: 0.45, max: 1, solveEvery: 0.5 },
  /** THE BRIM: the line halts `clear` units outside the loudest vent's
   *  column strike disc (+ the body's own radius) — a step from the throat,
   *  never in it (the country's honest worst idea). */
  brim: { clear: 12 },
  /** THE WAY: chord waypoints every `stride` units, each nudged out of every
   *  vent's strike disc by `ventPad`; a mouth on a zone without exits seats
   *  `mouthInset` inside the arena rim. */
  route: { stride: 160, ventPad: 16, mouthInset: 70 },
  /** THE OFFERINGS at the brim: prism-crust dress pieces (the ONE
   *  plantImpactDress→evap path — the transience doctrine) seated on a pure
   *  hash ring in [ringPad] beyond the column disc, drying after `dwell`;
   *  `gemChance` = the small loot beat (the spoils law + budget honesty
   *  both apply — ONE keyed roll per pilgrimage, dropGemAt seals itself). */
  offerings: {
    kind: 'prism_offering', count: 5, radius: [18, 22] as const,
    ringPad: [6, 26] as const, dwell: [90, 160] as const, gemChance: 0.06,
  },
  /** THE VIGIL: the line keeps the brim until the surge window closes (or,
   *  on the provisional burst cue, `afterBurst` seconds past the burst);
   *  `max` is THE NO-TAG CEILING — no vigil outlives it, whatever the
   *  clock says; `early` = how long before the cue a too-quick line may
   *  stand the brim (beyond it the beat would not have set out). */
  vigil: { afterBurst: 14, max: 150, early: 40 },
  /** THE STEP-OFF (the show-don't-tell tutorial at scale): the rite's
   *  discipline — every `every` seconds each pilgrim reads the ONE threat
   *  resolver (World.imminentThreatTo, the same read dodge-minds and the
   *  drawn broil ride) and, with a broil inside `horizon` seconds, hands
   *  its feet the standing dive state (Actor.aiDodgeExit — the dodge
   *  reflex's own machinery): the body steps OFF the vent a breath before
   *  it blows. `pad` = the clearance beyond the strike disc the read asks
   *  for — kept WIDER than the brim stand-off (brim.clear + a body), so the
   *  line at the brim recoils on every tide beat (the show); `window` caps
   *  the dive. */
  stepOff: { every: 0.1, horizon: 1.25, pad: 32, window: 1.0 },
  /** THE PRISM-CRUST LANTERN (the grove's carried-lamp grammar, at ACTOR
   *  grain — Actor.carriedLamp): a warm mineral glow that BREATHES on the
   *  sky's radiance — near dark at noon, full at dusk and night (at dusk the
   *  terraces light as the line climbs). */
  lantern: {
    radius: -4.5, color: '#ffd9a0', intensity: 0.55, flicker: 1.4,
    radiance: { at1: 0.12 },
  } as LightSpec,
  /** The held lantern's drawn half (parts.ts `lantern`, worn as a runtime
   *  tack through Actor.extraParts — the tamed collar's seam). */
  lanternPart: { kind: 'lantern', color: '#ffe2b0', scale: 1 } as PartSpec,
  /** Salt for the offering ring's pure hash. */
  salt: 0x9117a6,
} as const;

/** THE CUE — when the procession's hour opens (`at`) and when its vigil
 *  ends (`end`). `source` names the clock that spoke: the surge hour (the
 *  sovereign) or the provisional next burst of the loudest vent. */
export interface PilgrimCue { at: number; end: number; source: 'surge' | 'burst' }

/** Class rank for "the loudest vent" (great > geyser > hiss). */
export const VENT_RANK: Record<GeyserClassId, number> = { hiss: 1, geyser: 2, great: 3 };

// --- the loudest vent -------------------------------------------------------

/** THE LOUDEST VENT of a field: the biggest class dealt (the great
 *  metronome where one stands; the terraces, which deal no greats, climb
 *  to their biggest geyser); among equals the first dealt — pure, so every
 *  seat and every resume climb to the same mouth. Null on an empty field. */
export function loudestVent(field: GeyserField | null | undefined): { vent: PlacedVent; idx: number } | null {
  if (!field || !field.vents.length) return null;
  let best = -1, bestRank = -1;
  for (let i = 0; i < field.vents.length; i++) {
    const r = VENT_RANK[field.vents[i].cls];
    if (r > bestRank) { bestRank = r; best = i; }
  }
  return best < 0 ? null : { vent: field.vents[best], idx: best };
}

// --- THE ONE HOOK: the cue -------------------------------------------------

/** THE CUE HOOK — the procession's ONE read of the clock it answers to.
 *  THE SURGE HOUR is sovereign: a surge-keyed field's cue is the NEXT
 *  window's open (engine/geysers.ts nextSurgeAfter — pure f(world clock,
 *  zone key), so every seat and every resume agree); a dev-forced window
 *  (GeyserField.surgeForce) cues at its own t0 while still ahead and
 *  nothing once it has opened. THE PROVISIONAL CUE: a key-less field (a
 *  hand-built probe field, a package's literal) answers to the loudest
 *  vent's own next burst — the procession reads as well on bandless
 *  ground. Null when the field cannot cue at all (no field, no vents). */
export function pilgrimageCue(field: GeyserField | null | undefined, t: number,
  mode: 'bands' | 'solo' = 'bands'): PilgrimCue | null {
  if (!field || !field.vents.length) return null;
  if (field.surgeForce) {
    const w = field.surgeForce;
    return t < w.t0 ? { at: w.t0, end: w.t1, source: 'surge' } : null;
  }
  if (field.surgeKey !== undefined) {
    // A window open NOW has already cued (the line is late for it): the
    // next one is the cue — nextSurgeAfter's own law, read once.
    const near = fieldSurgeWindow(field, t);
    const w = near && t < near.t0 ? near : nextSurgeAfter(field.surgeKey, t);
    return { at: w.t0, end: w.t1, source: 'surge' };
  }
  const L = loudestVent(field);
  if (!L) return null;
  const read = ventReadAt(field, L.vent, t, mode);
  const at = t + (read.phase === 'erupt' ? read.toBurst : read.toBurst);
  const erupt = GEYSER_CFG.classes[L.vent.cls].eruptSec;
  return { at, end: at + erupt + PILGRIMAGE_CFG.vigil.afterBurst, source: 'burst' };
}

// --- geometry (pure) --------------------------------------------------------

/** The brim seat: the stand-off point on the approach side of a vent —
 *  columnR + the body's radius + PILGRIMAGE_CFG.brim.clear from the centre,
 *  toward `approach`. A step from the throat, never in it. */
export function brimSeat(vent: PlacedVent, approach: Vec2, bodyR: number): Vec2 {
  let dx = approach.x - vent.pos.x, dy = approach.y - vent.pos.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) { dx = 1; dy = 0; } else { dx /= len; dy /= len; }
  const d = GEYSER_CFG.classes[vent.cls].columnR + bodyR + PILGRIMAGE_CFG.brim.clear;
  return vec(vent.pos.x + dx * d, vent.pos.y + dy * d);
}

/** Nudge a point radially OUT of every vent's strike disc (+ pad) — the
 *  way never stands in a vent (THE BEAT LAW's tutorial: the locals walk
 *  around the throats). `except` spares one vent (the brim's own). Two
 *  relaxation passes settle a point caught between two discs. */
export function clearOfVents(p: Vec2, field: GeyserField | null | undefined, pad: number, except = -1): Vec2 {
  const out = vec(p.x, p.y);
  if (!field) return out;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < field.vents.length; i++) {
      if (i === except) continue;
      const v = field.vents[i];
      const r = GEYSER_CFG.classes[v.cls].columnR + pad;
      let dx = out.x - v.pos.x, dy = out.y - v.pos.y;
      const d = Math.hypot(dx, dy);
      if (d >= r) continue;
      if (d < 1e-6) { dx = 1; dy = 0; } else { dx /= d; dy /= d; }
      out.x = v.pos.x + dx * (r + 0.5);
      out.y = v.pos.y + dy * (r + 0.5);
    }
  }
  return out;
}

/** Is a point inside any vent's strike disc (+ pad)? (`except` spares one.) */
export function inVentDisc(p: Vec2, field: GeyserField | null | undefined, pad: number, except = -1): boolean {
  if (!field) return false;
  for (let i = 0; i < field.vents.length; i++) {
    if (i === except) continue;
    const v = field.vents[i];
    if (Math.hypot(p.x - v.pos.x, p.y - v.pos.y) < GEYSER_CFG.classes[v.cls].columnR + pad) return true;
  }
  return false;
}

/** THE WAY: chord waypoints from the mouth to the brim every
 *  PILGRIMAGE_CFG.route.stride units, each nudged clear of every vent disc
 *  (the brim's own vent excepted). Pure geometry — the caller snaps each
 *  to walkable ground; the walk between waypoints rides the zone's own
 *  flow field (moveToward), so walls are the mover's business. Endpoints
 *  excluded (they are `from` and `to`). */
export function pilgrimRoute(from: Vec2, to: Vec2, field: GeyserField | null | undefined,
  except = -1): Vec2[] {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  const n = Math.floor(len / PILGRIMAGE_CFG.route.stride);
  const via: Vec2[] = [];
  for (let i = 1; i < n; i++) {
    const f = i / n;
    const p = vec(from.x + (to.x - from.x) * f, from.y + (to.y - from.y) * f);
    via.push(clearOfVents(p, field, PILGRIMAGE_CFG.route.ventPad, except));
  }
  return via;
}

/** Polyline length from `from` through `pts` in order (the remaining walk). */
export function routeLength(pts: readonly Vec2[], from?: Vec2): number {
  let len = 0;
  let prev = from ?? pts[0];
  for (let i = from ? 0 : 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - prev.x, pts[i].y - prev.y);
    prev = pts[i];
  }
  return len;
}

/** THE PACE SOLVE: the stride fraction that lands `remaining` units in
 *  `secondsLeft` at `speed` units/sec, clamped to the pace band. Out of
 *  time = a full march (late is hurried, never refused). */
export function paceToArrive(remaining: number, speed: number, secondsLeft: number): number {
  const P = PILGRIMAGE_CFG.pace;
  if (secondsLeft <= 0.05 || speed <= 0) return P.max;
  const raw = remaining / (speed * secondsLeft);
  return Math.max(P.min, Math.min(P.max, raw));
}

/** The departure band for a walk of `pathLen` at `speed`: [fastest honest
 *  walk, slowest honest walk + slack] seconds to the cue (+ the arrival
 *  lead), floored at depart.min. A beat may set the line out only inside
 *  it — THE NO-TAG LAW's structural half (never waiting at a mouth) and
 *  the cue's (never arriving after the hour). */
export function departBand(pathLen: number, speed: number): { min: number; max: number } {
  const P = PILGRIMAGE_CFG;
  const s = Math.max(1, speed);
  const fastest = pathLen / (s * P.pace.max) + P.arrive.lead;
  const slowest = pathLen / (s * P.pace.min) + P.arrive.lead + P.depart.slack;
  return { min: Math.max(P.depart.min, fastest), max: Math.max(P.depart.min, slowest) };
}

// --- the offering ring (pure per-vent hash — no rng, no state) -------------

/** Unit float of three ints (the rideCapOf family's discipline). */
export function hash01(a: number, b: number, c: number): number {
  let v = Math.imul((a | 0) + 0x7f4a7c15, 2654435761) >>> 0;
  v = (v ^ Math.imul((b | 0) + 3, 0x9e3779b1) ^ Math.imul((c | 0) + 11, 0x85ebca6b)) >>> 0;
  v = Math.imul(v ^ (v >>> 15), 2246822519) >>> 0;
  return ((v ^ (v >>> 13)) >>> 0) / 4294967296;
}

/** THE OFFERING RING: `n` seats around a vent, just outside its column
 *  strike disc (in PILGRIMAGE_CFG.offerings.ringPad), on a pure hash of
 *  the vent's seat — the same ring every pilgrimage lays at this mouth
 *  (foreordained; a resume re-derives it). Seats spread by angle with a
 *  hashed jitter so the ring reads laid, not stamped. */
export function offeringSeats(vent: PlacedVent, n: number, salt = PILGRIMAGE_CFG.salt): Vec2[] {
  const out: Vec2[] = [];
  const kx = Math.round(vent.pos.x) ^ salt, ky = Math.round(vent.pos.y);
  const r0 = GEYSER_CFG.classes[vent.cls].columnR;
  const [pLo, pHi] = PILGRIMAGE_CFG.offerings.ringPad;
  const base = hash01(kx, ky, 0) * Math.PI * 2;
  for (let j = 0; j < n; j++) {
    const ang = base + (j / Math.max(1, n)) * Math.PI * 2 + (hash01(kx, ky, j * 2 + 1) - 0.5) * 0.5;
    const d = r0 + pLo + hash01(kx, ky, j * 2 + 2) * (pHi - pLo);
    out.push(vec(vent.pos.x + Math.cos(ang) * d, vent.pos.y + Math.sin(ang) * d));
  }
  return out;
}

/** Human-readable gripes for the dials (the flock-dial doctrine). */
export function lintPilgrimageCfg(): string[] {
  const P = PILGRIMAGE_CFG;
  const out: string[] = [];
  if (!(P.pace.min > 0 && P.pace.min <= P.pace.max && P.pace.max <= 1.5)) out.push('pace band must be 0 < min ≤ max ≤ 1.5');
  if (!(P.depart.min >= 0 && P.depart.slack >= 0)) out.push('depart.min/slack must be ≥ 0');
  if (!(P.vigil.max > 0 && P.vigil.early >= 0 && P.vigil.afterBurst >= 0)) out.push('vigil dials must be ≥ 0 (max > 0)');
  if (!(P.cast.followers >= P.cast.minFollowers && P.cast.minFollowers >= 1)) out.push('cast.followers ≥ minFollowers ≥ 1');
  if (!(P.offerings.gemChance >= 0 && P.offerings.gemChance <= 0.25)) out.push('offerings.gemChance must stay small (0..0.25) — budget honesty');
  if (!(P.stepOff.every > 0 && P.stepOff.horizon > 0 && P.stepOff.window > 0)) out.push('stepOff dials must be > 0');
  if (!((P.lantern.radiance?.at1 ?? 1) <= (P.lantern.radiance?.at0 ?? 1))) out.push('the lantern must breathe brighter at dusk than at noon (at1 ≤ at0)');
  return out;
}

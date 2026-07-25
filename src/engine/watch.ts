// --- THE WATCH FABRIC — attention as a visible, climbable ladder ------------
//
// Perception has always been fully modelled (detection reach, the frontal
// sight cone, rear hearing, LoS gating, stealth shrouds, alert callouts) and
// fully INVISIBLE: an enemy either hadn't noticed you or was already killing
// you, and the player could never tell which — approach was a coin flip.
// A WATCHER is a body whose attention is a LADDER with visible rungs:
//
//   unaware → stirring → searching → locked
//
// `MonsterDef.watch` opts a body in. While it stands UNPROVOKED, a fresh
// target acquisition no longer locks instantly — the would-be lock FEEDS a
// suspicion meter instead (rise scaled by proximity, decay after a grace
// when you back off), and only a full meter locks. The rungs ride machinery
// that already exists: STIRRING turns the head toward the stimulus,
// SEARCHING plants the standing alert-investigate walk (alertUntil/
// alertFrom — the same walk kin callouts use), and LOCKED is the ordinary
// lock (shout, opener, aggro — nothing downstream changes). Pain always
// bypasses: a wounded watcher skips the ladder (you started it), and taunts,
// relentless bonds and already-aggroed bodies never gate.
//
// THE LAWS:
//  - DRAWN == TESTED. The scan STAMPS the exact scalars it tested (reach,
//    arc, rear fraction, alert state) onto the actor (Actor.sense*); the
//    drawn cone, the client wire and the probes read the stamps and the
//    fan clips with the SAME castRay LoS itself marches. The cone you see
//    is the cone that judges you — never an approximation.
//  - LEGIBLE OR NOTHING. If a body can detect you, the means must show:
//    validateWatch refuses a watcher with no drawn cone AND no watch-
//    sourced tell row (the census names shirkers).
//  - LADDERS DECAY. Back off mid-climb and the meter drains after a grace —
//    watchable, learnable, reversible below the lock.
//  - SIDE CHANNELS CAP. Noise (World.noiseAt) and scent (the trail fabric)
//    raise suspicion only to the SEARCH rung — they say WHERE, never WHO;
//    only the watcher's own senses on your actual body close the lock.
//
// The three debut postures this module serves:
//  - THE SENTINEL: sweep (the scanning gaze — facing oscillates on station)
//    + a drawn cone; alertShout wakes the post when it locks.
//  - THE DROWSING: sleep — below the stir rung the eyes are SHUT (the cone
//    collapses to the all-around rear-hearing ring, drawn as a ring) and a
//    still intruder feeds slower than a sprinting one.
//  - THE TRACKER: scent — it hunts trail points (where you WERE, laid by
//    World.updateWatchTrails, broken by water's wading/swimming statuses),
//    following them in time order through the investigate walk until its
//    own eyes finally meet you.
//
// This module is a PURE LEAF (the tells.ts idiom): config, spec, the
// suspicion math (lazy decay — a pure read, no per-tick writes), the sense-
// shape resolver, trail helpers, validation. The sweep lives in
// World.updateWatch; the gate lives in ai.ts acquireTarget; the drawn read
// lives in render/vis/watchLayer.ts. Docs: docs/engine/watchers.md; probe
// balance/probe_watchers.ts.
// ---------------------------------------------------------------------------

import { registerTellSource } from './tells';

// --- the sense constants (formerly ai.ts inline consts — the one registry) --

/** The perception fold's modular constants. ai.ts's scan, the drawn cone
 *  and the probes all read HERE — values identical to the historical
 *  inline consts, moved so drawn and tested share one source. */
export const SENSE_CFG = {
  /** Default frontal sight-cone width (degrees) — PerceptionSpec /
   *  MonsterDef.vision override per monster. */
  arcDeg: 150,
  /** Default all-around hearing as a fraction of detection reach. */
  rearMul: 0.35,
  /** How hard stealth charges shroud their bearer (× detection reach). */
  stealthMul: 0.35,
  /** Alerted minds watch all around at this × reach (no cone penalty). */
  alertMul: 1.5,
} as const;

// --- config ----------------------------------------------------------------

export const WATCH_CFG = {
  /** The ladder's rung thresholds over the 0..1 suspicion meter. GLOBAL by
   *  design — the ladder is a LANGUAGE the player learns once; def dials
   *  tune speeds, never the vocabulary. lock = 1. */
  rungs: { stir: 0.25, search: 0.6 },
  /** Seconds of full-rate exposure (point-blank, in the cone, seen) from
   *  0 to lock. WatchSpec.riseSec overrides. */
  riseSec: 2.2,
  /** Seconds from a full meter back to 0 once decay begins. */
  decaySec: 6,
  /** Quiet seconds before decay begins (the double-take). */
  graceSec: 1.2,
  /** Proximity taper: full rise inside nearFrac × reach; at the reach edge
   *  the rate is edgeFrac × full. The far edge of a cone is a WARNING
   *  ZONE, not a tripwire. */
  nearFrac: 0.4,
  edgeFrac: 0.3,
  /** Rise multiplier while the watcher is ALERTED (a shout, a lost lock —
   *  alertUntil holds): a warned mind climbs its ladder fast. */
  alertRiseMul: 2.2,
  /** Seconds of investigation planted when the ladder crosses SEARCH
   *  (feeds alertUntil; PerceptionSpec.alertMul scales it like every
   *  other alert duration). WatchSpec.searchSec overrides. */
  searchSec: 6,
  /** Seconds a wound keeps the gate OPEN (a recently-hurt watcher locks
   *  instantly — pain needs no ladder). */
  provokedSec: 8,
  /** Sleep defaults (WatchSpec.sleep): an intruder moving slower than
   *  stillSpeed (px/sec) feeds at stillMul × rate — creep the rim, don't
   *  dash it; a mover feeds at full rate. */
  sleep: { stillMul: 0.35, stillSpeed: 24 },
  /** Scent defaults (WatchSpec.scent): nose reach to a trail point (px),
   *  how stale a print still smells (sec), how close counts as reaching a
   *  print before the nose moves on (px — MUST exceed the investigate
   *  walk's own 40px arrive-null, or the walk parks the body just outside
   *  the consume ring forever: the measured deadlock), the ladder feed
   *  while the nose holds a line (per sec, capped at the search rung),
   *  and the rolling investigate window a fresh print keeps alive (sec). */
  scent: { range: 110, maxAge: 16, arrive: 52, feedPerSec: 0.5, walkSec: 2.5 },
  /** Noise stimuli (World.noiseAt): suspicion fed at the blast point,
   *  linear falloff to the radius edge; capped at the search rung —
   *  a sound names a PLACE, never a prey. */
  noise: { feed: 0.5 },
  /** The scanning-gaze turn rate toward a stimulus while STIRRING
   *  (rad/sec — the head swings, readably, instead of snapping). */
  turnRadSec: 3.4,
  /** THE TRAIL (laid for players by World.updateWatchTrails, read by
   *  scent watchers): a point every stepDist px of travel, ring-buffered
   *  at max, aged out at maxAge; statuses in `breakStatuses` suspend
   *  laying entirely — wade a stream and the trail GAPS (the honest
   *  counterplay: water holds no scent). */
  trail: {
    stepDist: 30,
    max: 64,
    maxAge: 18,
    breakStatuses: ['wading', 'swimming'] as string[],
  },
  /** World.updateWatch sweep cadence (sec) — transitions, the gaze sweep
   *  and trail cursors move at this beat; the suspicion READ itself is
   *  continuous (lazy decay). */
  sweepSec: 0.12,
} as const;

// --- data shapes -------------------------------------------------------------

/** One body's watch posture (MonsterDef.watch). Every field is a dial;
 *  absent fields read WATCH_CFG. An EMPTY spec ({}) is already a full
 *  watcher: cone drawn, ladder gating, defaults throughout. */
export interface WatchSpec {
  /** Seconds of full-rate exposure from 0 to lock (default CFG.riseSec). */
  riseSec?: number;
  /** Seconds from full back to 0 once decay begins (default CFG.decaySec). */
  decaySec?: number;
  /** Quiet seconds before decay begins (default CFG.graceSec). */
  graceSec?: number;
  /** Seconds of investigation planted at the SEARCH crossing (default
   *  CFG.searchSec; scaled by the watcher's own alertMul). */
  searchSec?: number;
  /** GENUINE SLEEP: below the stir rung the eyes are SHUT — the sight cone
   *  collapses to the all-around rear-hearing ring (drawn as a ring), and
   *  a still intruder feeds at stillMul (default CFG.sleep.stillMul).
   *  `true` = all defaults. */
  sleep?: { stillMul?: number } | true;
  /** THE SCANNING GAZE: while UNAWARE the facing oscillates ±arcDeg/2
   *  around the post bearing (aiPostFacing, else the spawn facing) over
   *  `sec` seconds per full swing — the drawn cone sweeps with it. */
  sweep?: { arcDeg: number; sec: number };
  /** SCENT: this body hunts TRAILS (where you WERE). range = nose reach to
   *  a trail point; maxAge = how stale a print still smells. Scent feeds
   *  the ladder only to the search rung — the chase ends when its own
   *  senses finally meet you. */
  scent?: { range?: number; maxAge?: number };
  /** Draw the sense read (the cone / the sleeper's hearing ring). Default
   *  true — the legibility law. `false` is legal ONLY when the def wears
   *  a watch-sourced tell row instead (validateWatch enforces it). */
  cone?: boolean;
}

/** The ladder's rungs (watchRungOf): 0 unaware · 1 stirring · 2 searching ·
 *  3 locked. */
export const WATCH_RUNG = { unaware: 0, stir: 1, search: 2, locked: 3 } as const;

// --- the suspicion math (pure — lazy decay, no per-tick writes) ---------------

/** The narrow body view the math reads — Actor satisfies it structurally;
 *  probes hand-build it. */
export interface WatchBody {
  watchS: number;
  watchFedAt: number;
  aggroed: boolean;
}

/** The ONE suspicion read: banked value minus the decay earned since the
 *  last feed (after the grace). Aggro pins the meter at 1 — a locked
 *  watcher's tell never flickers mid-fight. Pure; deterministic; the
 *  gate, the sweep, the tell source and the cone color all read HERE. */
export function watchValueOf(a: WatchBody, w: WatchSpec, now: number): number {
  if (a.aggroed) return 1;
  if (a.watchS <= 0) return 0;
  const idle = now - a.watchFedAt - (w.graceSec ?? WATCH_CFG.graceSec);
  if (idle <= 0) return a.watchS;
  return Math.max(0, a.watchS - idle / (w.decaySec ?? WATCH_CFG.decaySec));
}

/** Value → rung (the vocabulary law: thresholds are global config). */
export function watchRungOf(v: number): number {
  if (v >= 1) return WATCH_RUNG.locked;
  if (v >= WATCH_CFG.rungs.search) return WATCH_RUNG.search;
  if (v >= WATCH_CFG.rungs.stir) return WATCH_RUNG.stir;
  return WATCH_RUNG.unaware;
}

/** Bank a feed: decay settles first (the read), then the amount lands,
 *  raised only toward `cap` (noise/scent/shouts stop at the search rung) —
 *  a cap never LOWERS a meter something else raised, and every feed
 *  refreshes the grace clock (a heard noise keeps a searcher searching).
 *  Returns the new value; callers compare rungs around the call. */
export function feedWatch(
  a: WatchBody, w: WatchSpec, now: number, amount: number, cap = 1,
): number {
  const cur = watchValueOf(a, w, now);
  a.watchS = Math.min(1, Math.max(cur, Math.min(cap, cur + amount)));
  a.watchFedAt = now;
  return a.watchS;
}

/** The proximity-tapered rise for one exposure tick: dt seconds of being
 *  perceivable at normalized distance dNorm (d / reach). alerted minds
 *  climb at alertRiseMul. Returns the suspicion amount to feed. */
export function watchRiseAmount(
  w: WatchSpec, dt: number, dNorm: number, alerted: boolean, stillMul = 1,
): number {
  const near = WATCH_CFG.nearFrac;
  const t = dNorm <= near ? 0 : Math.min(1, (dNorm - near) / (1 - near));
  const taper = 1 + (WATCH_CFG.edgeFrac - 1) * t;
  const rate = taper / (w.riseSec ?? WATCH_CFG.riseSec);
  return dt * rate * (alerted ? WATCH_CFG.alertRiseMul : 1) * stillMul;
}

// --- the sense shape ---------------------------------------------------------

/** Resolve the arc a watcher's eyes cover RIGHT NOW: a sleeper below the
 *  stir rung has its eyes SHUT — the cone collapses to 0 (everything is
 *  rear hearing). Everyone else keeps the authored arc. The scan and the
 *  drawn read share this one resolver. */
export function watchArcDeg(
  w: WatchSpec | undefined, v: number, authoredArcDeg: number,
): number {
  if (w?.sleep && v < WATCH_CFG.rungs.stir) return 0;
  return authoredArcDeg;
}

/** The perception reach fold — THE tested formula, extracted whole from the
 *  scan so the drawn cone can never drift from it: base reach × the
 *  target's detectability × the stealth shroud × (alerted: all-around at
 *  alertMul | in-cone: full | behind: rearMul). */
export function senseReach(
  detect: number, detectability: number, stealthed: boolean,
  alerted: boolean, inCone: boolean, rearMul: number,
): number {
  let reach = detect * detectability;
  if (stealthed) reach *= SENSE_CFG.stealthMul;
  if (alerted) reach *= SENSE_CFG.alertMul;
  else if (!inCone) reach *= rearMul;
  return reach;
}

// --- the trail fabric --------------------------------------------------------

/** One scent print: where, and when it was laid. */
export interface TrailPoint { x: number; y: number; t: number }

/** The trail carrier view (players wear one when scent watchers stand). */
export interface TrailBody {
  trail?: TrailPoint[];
  trailIdx: number;
}

/** Lay a print into the ring buffer (oldest overwritten past max). */
export function layTrailPoint(a: TrailBody, x: number, y: number, t: number): void {
  if (!a.trail) { a.trail = []; a.trailIdx = 0; }
  const p = { x, y, t };
  if (a.trail.length < WATCH_CFG.trail.max) a.trail.push(p);
  else {
    a.trail[a.trailIdx] = p;
    a.trailIdx = (a.trailIdx + 1) % a.trail.length;
  }
}

/** The most recent print laid (undefined on an empty trail). */
export function trailNewest(a: TrailBody): TrailPoint | undefined {
  if (!a.trail?.length) return undefined;
  const i = a.trail.length < WATCH_CFG.trail.max
    ? a.trail.length - 1
    : (a.trailIdx + a.trail.length - 1) % a.trail.length;
  return a.trail[i];
}

/** THE NOSE: the next print to follow — the OLDEST print strictly fresher
 *  than afterT (time-order: the tracker walks where you walked, in the
 *  order you walked it), still young enough to smell, and within range of
 *  the nose when a range is given. Returns undefined at a gap (wading
 *  broke the lay) or a cold trail — the tracker loses you exactly where
 *  the water was. */
export function trailNext(
  trail: readonly TrailPoint[] | undefined, afterT: number, now: number,
  maxAge: number, nose?: { x: number; y: number; range: number },
): TrailPoint | undefined {
  if (!trail?.length) return undefined;
  let best: TrailPoint | undefined;
  for (let i = 0; i < trail.length; i++) {
    const p = trail[i];
    if (p.t <= afterT || now - p.t > maxAge) continue;
    if (nose) {
      const dx = p.x - nose.x, dy = p.y - nose.y;
      if (dx * dx + dy * dy > nose.range * nose.range) continue;
    }
    if (!best || p.t < best.t) best = p;
  }
  return best;
}

// --- integrity ---------------------------------------------------------------

/** Walk a def registry: every watch row must be LEGIBLE (a drawn cone, or
 *  a tell row reading the watch source — never punish invisibly), sleep/
 *  scent/sweep dials sane. Returns human-readable faults (probe food). */
export function validateWatch(defs: Record<string, {
  watch?: WatchSpec;
  tells?: { source: string }[];
  brainVariants?: { tells?: { source: string }[] }[];
} | undefined>): string[] {
  const bad: string[] = [];
  for (const id in defs) {
    const def = defs[id];
    const w = def?.watch;
    if (!def || !w) continue;
    const tellRead = (def.tells ?? []).some(t => t.source.startsWith('watch'))
      || (def.brainVariants ?? []).some(v => (v.tells ?? []).some(t => t.source.startsWith('watch')));
    if (w.cone === false && !tellRead) {
      bad.push(`${id}: watch with cone:false and no watch-sourced tell row — an ILLEGIBLE watcher (the law: if it can detect you, the means must show)`);
    }
    if (w.riseSec !== undefined && w.riseSec <= 0) bad.push(`${id}: riseSec must be > 0`);
    if (w.decaySec !== undefined && w.decaySec <= 0) bad.push(`${id}: decaySec must be > 0`);
    if (w.sweep && (w.sweep.sec <= 0 || w.sweep.arcDeg <= 0)) {
      bad.push(`${id}: sweep needs positive arcDeg and sec`);
    }
    if (w.scent && w.scent.range !== undefined && w.scent.range <= 0) {
      bad.push(`${id}: scent.range must be > 0`);
    }
  }
  return bad;
}

// --- the tell source ---------------------------------------------------------
// 'watch' reads the live ladder 0..1 (locked pins 1) — the same meter the
// gate climbs; a def binds it to any channel (glow, eyes-part alpha, lean).
// Registered here so importing the fabric IS wiring the vocabulary; the
// body view is structural (Actor carries the fields).

interface WatchTellBody extends WatchBody { watch?: WatchSpec }

registerTellSource('watch', (a, w) => {
  const b = a as unknown as WatchTellBody;
  if (!b.watch) return 0;
  return watchValueOf(b, b.watch, w.time);
});

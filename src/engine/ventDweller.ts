// ---------------------------------------------------------------------------
// THE VENT DWELLER — a body that lives IN a beat_vent (Scald Basin M3: THE
// GEYSERMAW, the great geyser den's apex — charter docs/design/scald-basin.md
// §8 "lives IN the great geyser and is only ABOVE ground around eruptions —
// the beat as a boss mechanic: the window is the fight").
//
// THE LAW: a dweller's presence is a PURE FUNCTION of its home vent's clock.
// It reads `ventReadAt` (engine/geysers.ts — the track fabric's pure clock)
// and NEVER keeps a timer of its own: every co-op seat and every resume agree
// on where the maw stands by construction (the resume-inits-to-current-
// ordinal idiom of World.updateGeysers — a reload simply finds it up or under).
//
//   read = ventReadAt(field, homeVent, world.time, mode)
//   phase = dwellerPhaseAt(read, spec, openSec)          'under' | 'up' | 'sinking'
//
// THE WINDOW opens as the vent's column CLEARS (openSec = the class's
// eruptSec — the column bursts, and as the water falls the maw is there; it
// never rides its own column) and runs `upSec` seconds; the window's last
// `sinkSec` is THE SINKING TELL (the body wears a ghosted status the tells
// fabric reads — drawn, never a floater); everything else is UNDER. Under, the
// body is SUBMERGED: untargetable, invulnerable, concealed (not drawn), its
// own clock STOPPED (a timeScale-0 status — no thinking, no casting, no
// cooldowns burning, no DoTs), pinned to the mouth — the vent stands quiet or
// broiling, and THE BROIL LAW is the breach tell: the water itself begins to
// roil two seconds before the burst, then the column, then the maw.
//
// THE SEEN COLUMN (the breach law's witness): a dweller rises only behind a
// column of THIS cycle. A clock HAND-OFF — the surge hour's aligned tide
// joining or leaving a vent (engine/geysers.ts surgeTideRead) — resets a
// vent's count without a burst; on a count alone the maw would rise from a
// quiet mouth with no column, the one thing the broil law forbids. So the
// resolver takes an optional witness (when the vent was last SEEN erupting)
// and keeps the body under until a real beat — pure given the pair, and the
// World sweep + the probe track the same witness (drawn == tested).
//
// THE NO-TAG LAW (charter §8b, structural): a submerge is a WINDOW, never a
// flee — the window must recur on a readable beat short enough that the fight
// never stalls. `windowOf` CLAMPS the authored window so the UNDER stretch
// (period − upSec) never exceeds VENT_DWELLER_CFG.maxUnderSec (a slow vent
// keeps its clock — the vent's clock is the vent's — so the WINDOW stretches
// to meet it), and so the window always CLOSES (a dweller that never sinks is
// not a dweller). lintVentDweller names every clamp loudly.
//
// This module is a PURE LEAF (the geysers.ts idiom): config, the spec type,
// the resolver, the window fold and the lint. The world half is
// World.updateVentDwellers (the sweep that wears the states), the data half
// MonsterDef.ventDweller. Every number is a DIAL (unblessed — she blesses via
// playthroughs). Docs: docs/engine/greatgeyser.md. Probe: balance/probe_den.ts.
// ---------------------------------------------------------------------------

import type { VentRead } from './geysers';

export const VENT_DWELLER_CFG = {
  /** Sweep cadence, seconds (the geyser fabric's applyEvery idiom — the
   *  phase flips ride the pure read, so a coarse sweep loses nothing). */
  sweepEvery: 0.05,
  /** How far from its SEAT (the spawn point — the den recipe's boss seat)
   *  a dweller looks for its home vent. No vent in reach = an ordinary
   *  body that never submerges (loud, once). */
  homeReach: 260,
  /** THE NO-TAG CEILING: the longest a dweller may stay UNDER between
   *  windows (the vent's period − the window). A vent slower than this
   *  stretches the WINDOW, never the fight's silence. */
  maxUnderSec: 40,
  /** The window must CLOSE: at least this much of every cycle is spent
   *  under (the broil + a breath — the vent's own tell needs its stage). */
  minUnderSec: 4,
  /** The shortest fight window a spec may author. */
  minUpSec: 5,
  /** The default sinking tell (seconds of the window's tail worn ghosted). */
  sinkSec: 1.4,
  /** The sinking tell may never eat more than this share of the window. */
  sinkShareMax: 0.4,
  /** THE SEEN COLUMN's slack: a column sampled this many seconds after its
   *  own burst still counts as THIS cycle's (the sweep grain + a breath). */
  seenSlack: 0.25,
  /** The worn states (engine/status.ts rows): SUBMERGED = timeScale 0 +
   *  conceals (the body hangs inside the vent, outside time, undrawn);
   *  SINKING = the ghosted tail (legibility only — hittable to the end). */
  submergedStatus: 'vent_submerged',
  sinkingStatus: 'vent_sinking',
  /** The breach's world-side spectacle: flash radius × body radius, shake. */
  breachFlashMul: 2.6,
  breachShake: 2.0,
  color: '#9fe0e8',
} as const;

/** MonsterDef.ventDweller — the body lives IN its home beat_vent. */
export interface VentDwellerSpec {
  /** Seconds ABOVE ground after the vent's column clears — THE FIGHT WINDOW
   *  (DIAL; clamped by windowOf under the NO-TAG ceiling). */
  upSec: number;
  /** The window's tail worn as the sinking tell (default
   *  VENT_DWELLER_CFG.sinkSec; capped at sinkShareMax × the window). */
  sinkSec?: number;
  /** Floated at the breach (the rise). */
  breachText?: string;
  /** Floated as it sinks back. */
  sinkText?: string;
  /** Home-vent reach override (VENT_DWELLER_CFG.homeReach). */
  reach?: number;
}

export type DwellerPhase = 'under' | 'up' | 'sinking';

/** The effective window on a vent of `period` seconds whose column holds
 *  `openSec` — the spec's upSec folded under the NO-TAG ceiling and the
 *  window-must-close law. Pure. */
export function windowOf(period: number, spec: VentDwellerSpec, openSec = 0): {
  openSec: number; upSec: number; sinkSec: number; underSec: number;
} {
  const C = VENT_DWELLER_CFG;
  const p = Math.max(1, period);
  const open = Math.max(0, Math.min(openSec, p * 0.5));
  let up = Math.max(0, spec.upSec);
  // THE NO-TAG CEILING: never under longer than the ceiling — the window
  // stretches to meet a slow vent (the vent keeps its clock).
  up = Math.max(up, p - C.maxUnderSec);
  // THE WINDOW MUST CLOSE: at least minUnderSec of every cycle is spent under.
  up = Math.min(up, p - open - C.minUnderSec);
  // …and be a fight.
  up = Math.max(C.minUpSec, up);
  // A degenerate vent (too fast for any of the above to hold) still keeps
  // SOME under-stretch: the window never swallows the whole cycle.
  up = Math.min(up, (p - open) * 0.85);
  const sink = Math.max(0, Math.min(spec.sinkSec ?? C.sinkSec, up * C.sinkShareMax));
  return { openSec: open, upSec: up, sinkSec: sink, underSec: p - up };
}

/** THE SEEN COLUMN (the breach law's witness): when the dweller's vent was
 *  last SEEN erupting (a sampled read with phase 'erupt') and the clock now.
 *  A clock hand-off (the surge hour's tide join/leave — engine/geysers.ts)
 *  can reset a vent's count WITHOUT a column; the dweller never breaches on
 *  a count alone — only behind a column of THIS cycle. Pure given the pair. */
export interface SeenColumn { columnSeenAt: number; now: number }

/** Does a seen column belong to the read's own cycle? (seen no earlier than
 *  this cycle's burst — a sweep's slack forgives the sampling grain). */
export function columnSeenThisCycle(read: VentRead, seen: SeenColumn): boolean {
  return seen.now - seen.columnSeenAt <= read.sinceBurst + VENT_DWELLER_CFG.seenSlack;
}

/** THE resolver: where a dweller stands at this vent read. Pure — same read
 *  in, same phase out, on every seat and every resume. The window opens at
 *  `openSec` after the burst (the column clears) and runs the effective
 *  window; its tail is the sinking tell; everything else is UNDER (the quiet
 *  stretch AND the broil — the vent's own roil is the breach tell). With a
 *  `seen` witness, the window stands only behind a column of THIS cycle (THE
 *  SEEN COLUMN law) — a count reset by a clock hand-off keeps the body
 *  under until the next real beat. */
export function dwellerPhaseAt(read: VentRead, spec: VentDwellerSpec, openSec = 0, seen?: SeenColumn): DwellerPhase {
  const w = windowOf(read.period, spec, openSec);
  const t = read.sinceBurst - w.openSec;
  if (t < 0 || t >= w.upSec) return 'under';
  if (seen && !columnSeenThisCycle(read, seen)) return 'under';
  return t >= w.upSec - w.sinkSec ? 'sinking' : 'up';
}

/** Seconds until the NEXT window opens from this read (0 while up/sinking)
 *  — the dev readout's number, and the probe's. */
export function dwellerToWindow(read: VentRead, spec: VentDwellerSpec, openSec = 0): number {
  const w = windowOf(read.period, spec, openSec);
  const t = read.sinceBurst - w.openSec;
  if (t >= 0 && t < w.upSec) return 0;
  return t < 0 ? -t : read.toBurst + w.openSec;
}

/** Human-readable gripes for a spec against the vent it will ride (the
 *  flock-dial doctrine: dials stay physical; every clamp is NAMED). Empty =
 *  sane. `period` is the home vent's clock; pass the class eruptSec as
 *  `openSec` where known. */
export function lintVentDweller(spec: VentDwellerSpec, period: number, where: string, openSec = 0): string[] {
  const out: string[] = [];
  const C = VENT_DWELLER_CFG;
  if (!(spec.upSec > 0)) out.push(`${where}: upSec ${spec.upSec} — a window must have length`);
  if (spec.upSec < C.minUpSec) out.push(`${where}: upSec ${spec.upSec} < ${C.minUpSec} — too short to be a fight (clamped)`);
  const w = windowOf(period, spec, openSec);
  if (w.upSec > spec.upSec + 1e-6) {
    out.push(`${where}: the vent's ${period}s clock would leave the dweller under ${(period - spec.upSec).toFixed(1)}s > the NO-TAG ceiling ${C.maxUnderSec}s — the window STRETCHES to ${w.upSec.toFixed(1)}s (author a faster vent or a longer window)`);
  }
  if (w.upSec < spec.upSec - 1e-6 && spec.upSec >= C.minUpSec) {
    out.push(`${where}: upSec ${spec.upSec} would never let the dweller sink on a ${period}s vent — the window CLOSES at ${w.upSec.toFixed(1)}s`);
  }
  const askedSink = spec.sinkSec ?? C.sinkSec;
  if (askedSink > w.upSec * C.sinkShareMax + 1e-6) {
    out.push(`${where}: sinkSec ${askedSink} eats more than ${Math.round(C.sinkShareMax * 100)}% of the ${w.upSec.toFixed(1)}s window — capped at ${w.sinkSec.toFixed(1)}s`);
  }
  return out;
}

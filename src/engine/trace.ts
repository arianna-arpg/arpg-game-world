// ---------------------------------------------------------------------------
// THE TRACE FABRIC — the steady hand as a game act (docs/design/steady-hand.md
// T0). One pure, steppable session: an authored outline, a tolerance BAND
// (the tier's dial), and a fed stream of pen samples. Holding the bind IS
// drawing; progress is the NEAREST-POINT advance along the outline,
// MONOTONIC (the pen can never skip ahead or bank unreached path); deviation
// inside the band accumulates band-normalized ACCURACY; leaving the band is
// a SLIP (accuracy pays; progress freezes until the pen returns). The
// verdict — {progress, accuracy, slips} — is the consumer's food: the
// crafting consumer folds it into the mint, a future runic cast folds it
// into a skill. The fabric never knows what a trace is FOR.
//
// THE LAWS:
//  · PURE BY CONSTRUCTION — a session is a fold over fed samples; the same
//    samples give the same verdict, byte-exact, headless or live. No rng:
//    the shape is KNOWN and visible. This tests the hand, not the memory —
//    the harvest rite's anti-memorize law deliberately does not apply.
//  · THE PAUSE LAW — the world-side host engages the 'trace' TimeHold
//    surface (solo only; a shared world is never one player's to stop —
//    the rite's own policy, inherited verbatim).
//  · THE INPUT LAW — a tracing seat speaks to the trace alone: its intent
//    is swallowed at the applyInputs artery (World.traceFeed), so a bound
//    skill can never fire off the drawing hand.
//  · DEVICE PARITY (walk card 5, ruled at her delegation): the band is
//    premultiplied by the seat's device dial at session build — ONE
//    multiply, never a fork in the math.
//
// Shapes live in data/traceShapes.ts (authored polylines, unit space, an
// open registry). The crafting consumer (THE SMITH'S WRIT) is world-side;
// this module is sim-safe and imports no World.
// ---------------------------------------------------------------------------

import type { TraceShape } from '../data/traceShapes';

/** Central levers. ⚠ EVERY number here is UNBLESSED (2026-08-26) — her
 *  walks retune them; the shapes are the commitment. */
export const TRACE_CFG = {
  /** THE COMPLEXITY CLASSES' band half-widths, WORLD units (index =
   *  complexity-1; the walk's demo made these felt). Complexity is her
   *  horizontal axis — the DIFFICULTY lives mostly in the LINE ITSELF
   *  (an ornate base traces an ornate outline), so the bands tighten
   *  only gently. Past the ladder clamps to last. */
  complexityBands: [26, 22, 18] as readonly number[],
  /** THE HYBRID's ceiling (walk card 1c): from this COMPLEXITY up, a slip
   *  cap arms — more slips than `slipCap` FAILS the trace (writ kept,
   *  retry after `failCooldownSec`). Below it, slips only pay accuracy.
   *  (Class 3 stands empty until the ornate bases land — the buzz waits
   *  with them.) */
  hybridAtComplexity: 3,
  slipCap: 3,
  failCooldownSec: 20,
  /** Accuracy paid per slip (a fraction of the accumulated pool — the
   *  demo's own cost, felt and liked). */
  slipAccuracyCost: 0.03,
  /** DEVICE PARITY (card 5a): the band premultiplier per device. */
  deviceBandMul: { mouse: 1, pad: 1.3 } as Record<string, number>,
  /** How far along the outline the pen may reach past its frontier in one
   *  continuous stroke (world units) — the advance window that keeps the
   *  nearest-point read from snapping across a fold of the shape. */
  lookahead: 150,
  /** The drawn size of a unit-space shape in the world (its long side). */
  drawSize: 220,
  /** Resample step for the authored polylines (world units) — fine enough
   *  that nearest-point progress reads smooth. */
  resample: 4,
  /** A trace is DONE when the frontier reaches this share of the path. */
  doneAt: 0.995,
} as const;

/** One built session's fixed geometry: the shape resampled into WORLD
 *  space around a center, with cumulative lengths. */
export interface TracePath {
  pts: { x: number; y: number }[];
  /** The effective band half-width, world units (device mul folded). */
  band: number;
  shapeId: string;
}

/** The live state — pure JSON, stepped only by feed(). */
export interface TraceState {
  /** Furthest path index reached (monotonic). */
  frontier: number;
  samples: number;
  accSum: number;
  slips: number;
  outside: boolean;
  done: boolean;
  failed: boolean;
  /** Laid ink (render only — the verdict never reads it; capped). */
  ink: { x: number; y: number; in: boolean }[];
}

/** The verdict — the consumer's food. */
export interface TraceVerdict {
  progress: number;
  accuracy: number;
  slips: number;
  done: boolean;
  failed: boolean;
}

/** Build the fixed path: the unit-space shape scaled to `size` and
 *  centered at (cx, cy), resampled to TRACE_CFG.resample steps. */
export function buildTracePath(
  shape: TraceShape, cx: number, cy: number, band: number, size = TRACE_CFG.drawSize,
): TracePath {
  const raw = shape.points.map(p => ({ x: cx + (p[0] - 0.5) * size, y: cy + (p[1] - 0.5) * size }));
  if (shape.closed && raw.length) raw.push({ ...raw[0] });
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < raw.length - 1; i++) {
    const a = raw[i], b = raw[i + 1];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    // A DEGENERATE segment (an authored shape that already closes itself
    // wearing closed:true, a doubled point) would mint duplicate path
    // points the strict nearest-point tie-break can never advance onto —
    // the frontier would stall one short of done. The fabric absorbs the
    // authoring quirk: zero-length segments lay nothing.
    if (d < 1e-6) continue;
    const n = Math.max(1, Math.round(d / TRACE_CFG.resample));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  const tail = raw[raw.length - 1];
  if (tail && (!pts.length || Math.hypot(tail.x - pts[pts.length - 1].x, tail.y - pts[pts.length - 1].y) > 1e-6)) {
    pts.push(tail);
  }
  return { pts, band, shapeId: shape.id };
}

export function freshTraceState(): TraceState {
  return { frontier: 0, samples: 0, accSum: 0, slips: 0, outside: false, done: false, failed: false, ink: [] };
}

/** THE FEED — one pen sample. `drawing` false lifts the pen (state keeps;
 *  strokes resume). `slipCap` 0 = no cap (the sub-hybrid tiers). Pure:
 *  mutates only `st`, reads only its arguments. */
export function traceFeed(
  path: TracePath, st: TraceState, x: number, y: number, drawing: boolean, slipCap: number,
): void {
  if (st.done || st.failed || !drawing) return;
  const look = Math.ceil(TRACE_CFG.lookahead / TRACE_CFG.resample);
  const end = Math.min(path.pts.length - 1, st.frontier + look);
  let bestI = -1;
  let bestD = Infinity;
  for (let i = Math.max(0, st.frontier - 8); i <= end; i++) {
    const d = Math.hypot(x - path.pts[i].x, y - path.pts[i].y);
    if (d < bestD) { bestD = d; bestI = i; }
  }
  if (bestD <= path.band) {
    st.outside = false;
    if (bestI > st.frontier) st.frontier = bestI; // monotonic — no skipping
    st.samples++;
    st.accSum += 1 - bestD / path.band;           // band-normalized
    if (st.ink.length < 4000) st.ink.push({ x, y, in: true });
    if (st.frontier >= (path.pts.length - 1) * TRACE_CFG.doneAt) st.done = true;
  } else {
    if (!st.outside) {
      st.outside = true;
      st.slips++;
      st.accSum = Math.max(0, st.accSum - st.samples * TRACE_CFG.slipAccuracyCost);
      // THE HYBRID's ceiling (card 1c): past the cap, the trace FAILS —
      // the Operation buzz, reserved for the high tiers.
      if (slipCap > 0 && st.slips > slipCap) st.failed = true;
    }
    if (st.ink.length < 4000) st.ink.push({ x, y, in: false }); // progress freezes
  }
}

export function traceVerdict(path: TracePath, st: TraceState): TraceVerdict {
  return {
    progress: path.pts.length > 1 ? st.frontier / (path.pts.length - 1) : 0,
    accuracy: st.samples ? Math.max(0, Math.min(1, st.accSum / st.samples)) : 0,
    slips: st.slips,
    done: st.done,
    failed: st.failed,
  };
}

/** The complexity class's effective band (device mul folded — card 5's
 *  one multiply). */
export function traceBandFor(complexity: number, device: 'mouse' | 'pad'): number {
  const bands = TRACE_CFG.complexityBands;
  const base = bands[Math.max(0, Math.min(bands.length - 1, complexity - 1))];
  return base * (TRACE_CFG.deviceBandMul[device] ?? 1);
}

/** Does this complexity arm the hybrid's slip cap (card 1c)? 0 = uncapped. */
export function traceSlipCapFor(complexity: number): number {
  return complexity >= TRACE_CFG.hybridAtComplexity ? TRACE_CFG.slipCap : 0;
}

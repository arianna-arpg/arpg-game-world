// ---------------------------------------------------------------------------
// THE RENDER SCALE — internal resolution as a dial (Settings.renderScale).
//
// The canvas raster bill is proportional to BUFFER pixels, and a struggling
// canvas path (a low-end machine; a browser whose GPU/canvas acceleration
// has degraded over a long uptime — measured live: 18fps in the tutorial-
// grade Crossroads on a 4-day-up box while the same build's CPU cost sat
// under 10ms) can floor the frame rate in zones that cost nothing. The dial
// renders the SAME world view into a smaller buffer and lets CSS stretch it
// to the window: zoom rides the scale (`baseZoom × couchStretch × scale`),
// so world framing, camera law, couch fit and aim are byte-identical at any
// notch — only the pixel density moves.
//
// 'auto' (the default) is THE GOVERNOR: it watches the always-on frame ring
// (the same one the Pulse tab and the perf harness read) and steps the
// notch ladder down while sustained gap p95 sits past the 30fps knee, back
// up once frames hold comfortably — with asymmetric patience so it never
// flaps. The decision is a pure law (below) so it pins headless.
//
// The perf harness PINS scale 1 for its sweeps: the gate judges the
// authored render bill, never a governor's mercy.
// ---------------------------------------------------------------------------

export const RENDER_SCALE_CFG = {
  /** Hard rails for the manual dial (and the ladder's floor). */
  min: 0.5,
  max: 1,
  /** THE NOTCH LADDER (descending) — 'auto' only ever sits on a rung. */
  notches: [1, 0.85, 0.7, 0.55] as readonly number[],
  governor: {
    /** Seconds between auto verdicts (ring reduction cadence). */
    evalSec: 2,
    /** Sustained gap p95 ABOVE this steps DOWN a notch (~30fps knee). */
    stepDownP95Ms: 33,
    /** Sustained gap p95 BELOW this may step back UP (~50fps comfort). */
    stepUpP95Ms: 20,
    /** How long a verdict must hold before a DOWN step fires. */
    sustainSec: 4,
    /** Extra patience before an UP step — climbing costs a re-raster spike,
     *  so the governor climbs slowly and drops readily. */
    climbHoldSec: 20,
  },
} as const;

/** THE GOVERNOR'S LAW (pure — probe-pinned): given the current notch index
 *  and how long each verdict has held, the next notch index. `hotSec` =
 *  seconds p95 has continuously sat past stepDown; `coolSec` = seconds it
 *  has continuously sat under stepUp. Exactly one of them is meaningful per
 *  call (the caller resets the other); anything between the knees resets
 *  both — the dead band. */
export function nextNotch(at: number, hotSec: number, coolSec: number): number {
  const g = RENDER_SCALE_CFG.governor;
  const last = RENDER_SCALE_CFG.notches.length - 1;
  if (hotSec >= g.sustainSec && at < last) return at + 1;
  if (coolSec >= g.climbHoldSec && at > 0) return at - 1;
  return at;
}

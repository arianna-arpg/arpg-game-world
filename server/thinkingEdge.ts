// ---------------------------------------------------------------------------
// THE THINKING EDGE (docs/design/performance-lane.md §3 W0; the M6 plan
// docs/design/shard-m6-plan.md §1.4): an IDLE body far from every player
// thinks only on the wire's beat ticks, the ticks whose state ships, and
// thinks there with every second it skipped, so nothing a brain integrates
// is lost (dt-fed clocks: the fuse, threat decay, kite wind, wander timers
// all read `dt`; absolute clocks read `world.time` and never noticed).
//
// Who is edged: a body THE DISTANCE CENSUS classes `idle` (not a seat's, not
// scenery, not dormant, not held by a state machine, not engaged, casting,
// alerted, fighting, nor in a busy squad) that stands at least
// THINKING_EDGE_CFG.nearPx from every standing seat in its World. Everything
// else thinks every tick, exactly as before. A body that stops being idle
// mid-beat thinks at once on that tick with its owed seconds, so a struck or
// roused body never waits for the beat.
//
// Where it runs: only the shard host's AI loop (server/shardHost.ts) asks
// `thinkDt`; solo play, the co-op host and the balance harness call updateAI
// themselves and never see this file: THE SOLO INVARIANT by construction.
// Clients only ever receive beat-tick states, so an edged body's shipped
// path differs only by its decisions being quantized to the beat (50 ms at
// 60 Hz with a 20 Hz wire).
// ---------------------------------------------------------------------------
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';
import { CENSUS_CFG, censusContext, classifyBody, nearestSeatPx, type CensusContext } from './distanceCensus';

export const THINKING_EDGE_CFG = {
  /** The switch (the soak's `--think off` is the A/B). */
  enabled: true,
  /** An idle body closer than this to any standing seat thinks every tick: the close-quarters guard. */
  nearPx: CENSUS_CFG.nearPx,
};

/** Seconds an edged body has skipped since it last thought (per body; absent = none). */
const owed = new WeakMap<Actor, number>();

/** The tick's context for a World (the standing seats, the busy squads): one roster pass. */
export const edgeContext = (w: World): CensusContext => censusContext(w);

/** Is this body edged this tick (idle and far)? Pure read. */
export function isEdged(a: Actor, w: World, ctx: CensusContext): boolean {
  return classifyBody(a, w, ctx) === 'idle' && nearestSeatPx(a, ctx) >= THINKING_EDGE_CFG.nearPx;
}

/** The seconds this body thinks with on this tick: `dt` plus what it was owed, or 0 to skip
 *  (an edged body off the beat). The owed seconds are banked on a skip and paid on the next think. */
export function thinkDt(a: Actor, w: World, ctx: CensusContext, dt: number, beat: boolean): number {
  if (!THINKING_EDGE_CFG.enabled) return dt;
  if (!beat && isEdged(a, w, ctx)) {
    owed.set(a, (owed.get(a) ?? 0) + dt);
    return 0;
  }
  const o = owed.get(a);
  if (o === undefined) return dt;
  owed.delete(a);
  return dt + o;
}

/** The seconds a body is owed right now (the probe's read). */
export const owedDt = (a: Actor): number => owed.get(a) ?? 0;

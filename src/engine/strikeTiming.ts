import type { CastingState } from './actor';
import { instanceStrikeTimings, type ResolvedStrikeTiming, type StrikeTimingSpec } from './skills';

/** Shared timing defaults: simulation and bar paint read the same geometry. */
export const STRIKE_TIMING_CFG = {
  perfect: { start: 0.72, bonus: 0.7 },
  timed: { markerMin: 0.3, markerMax: 0.85, tolerance: 0.08, bonus: 1.2 },
};

/** Casts own their resolved disciplines. Old/manual cast states can still
 *  resolve from a real instance; render shells without sockets use their mode. */
export function strikeTimingsOf(cs: Pick<CastingState, 'mode' | 'inst' | 'strikeTimings'>): ResolvedStrikeTiming[] {
  if (cs.mode !== 'perfect' && cs.mode !== 'timed' && cs.mode !== 'overcharge') return [];
  if (cs.strikeTimings) return cs.strikeTimings;
  if (cs.inst.sockets) return instanceStrikeTimings(cs.inst);
  return cs.mode === 'overcharge' ? [] : [
    { kind: cs.mode, source: { kind: 'skill', id: cs.inst.def.id } },
  ];
}

export function rollStrikeMarker(timings: readonly StrikeTimingSpec[], random = Math.random): number | undefined {
  const cfg = STRIKE_TIMING_CFG.timed;
  return timings.some(t => t.kind === 'timed')
    ? cfg.markerMin + random() * (cfg.markerMax - cfg.markerMin) : undefined;
}

/** One attempt samples every window independently; successful MORE bonuses
 *  multiply. Missing one window cannot suppress another window's reward. */
export function resolveStrikeTiming(timings: readonly ResolvedStrikeTiming[], fraction: number, marker?: number) {
  const successes = timings.filter(t => t.kind === 'perfect'
    ? fraction >= STRIKE_TIMING_CFG.perfect.start
    : marker !== undefined && Math.abs(fraction - marker) <= STRIKE_TIMING_CFG.timed.tolerance);
  return { successes, multiplier: successes.reduce((mult, t) =>
    mult * (1 + (t.bonus ?? STRIKE_TIMING_CFG[t.kind].bonus)), 1) };
}

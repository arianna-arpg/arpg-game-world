// ---------------------------------------------------------------------------
// DAY / NIGHT — a pure function of the world clock.
//
// There is no state to keep: the phase, the light level (for the in-world
// tint), and the spawn bias are all derived from World.time, which already
// accumulates seconds and already survives zone travel. Night swells the
// ranks and wakes the dead; the small hours bring out predators; daylight is
// quietest. The bias only ever amplifies factions a zone already fields.
// ---------------------------------------------------------------------------

import type { SpawnBias } from './overlay';

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

/** Seconds for one full dawn→day→dusk→night→dawn turn. */
export const DAY_LENGTH = 240;

export interface DayCycle {
  phase: DayPhase;
  /** Position through the cycle, 0..1 (dawn at the wrap). */
  t: number;
  /** Ambient light, 0 (deep night) .. 1 (high noon) — drives the screen tint. */
  light: number;
  label: string;
  bias: SpawnBias;
}

const PHASE_LABEL: Record<DayPhase, string> = {
  dawn: 'Dawn', day: 'Day', dusk: 'Dusk', night: 'Night',
};

/** The turning of the day as ONE data table: each phase and the cycle-fraction
 *  (0..1) it ends at, in wheel order. dayCycle() and phaseAhead() both read
 *  this — rebalancing the day is one edit here, never a scattered literal. */
export const PHASE_WHEEL: ReadonlyArray<{ phase: DayPhase; until: number }> = [
  { phase: 'day', until: 0.40 },
  { phase: 'dusk', until: 0.50 },
  { phase: 'night', until: 0.90 },
  { phase: 'dawn', until: 1.00 },
];

// Reweights are by FACTION and only touch monsters already native to a zone.
// The Night Court keeps the strictest hours of anyone: it swells with the
// dark, thins at first light, and by day only its kept bodies stand watch.
const PHASE_BIAS: Record<DayPhase, SpawnBias> = {
  day: { countMul: 0.9, factionMul: { undead: 0.85, nightkin: 0.75 }, injectFactions: [] },
  dusk: { countMul: 1.05, factionMul: { undead: 1.2, gnoll: 1.1, nightkin: 1.2 }, injectFactions: [] },
  night: { countMul: 1.4, factionMul: { undead: 1.7, wild: 1.25, gnoll: 1.15, nightkin: 1.5 }, injectFactions: [] },
  dawn: { countMul: 1.0, factionMul: { undead: 0.8, sylvan: 1.15, nightkin: 0.7 }, injectFactions: [] },
};

/** Resolve the clock at a given world time. */
export function dayCycle(time: number): DayCycle {
  const cyc = ((time % DAY_LENGTH) + DAY_LENGTH) % DAY_LENGTH;
  const t = cyc / DAY_LENGTH;
  let phase: DayPhase = PHASE_WHEEL[PHASE_WHEEL.length - 1].phase;
  for (const spoke of PHASE_WHEEL) { if (t < spoke.until) { phase = spoke.phase; break; } }
  // Smooth light: peaks at t=0.20 (midday), troughs at t=0.70 (midnight).
  const light = 0.5 + 0.5 * Math.cos(2 * Math.PI * (t - 0.20));
  return { phase, t, light, label: PHASE_LABEL[phase], bias: PHASE_BIAS[phase] };
}

/** Look AHEAD on the wheel: the current phase, seconds until it turns, and the
 *  phase that follows — lets a system anticipate a boundary (a grief waning
 *  before the dawn takes it) without re-deriving the clock's arithmetic. */
export function phaseAhead(time: number): { phase: DayPhase; endsIn: number; next: DayPhase } {
  const cyc = ((time % DAY_LENGTH) + DAY_LENGTH) % DAY_LENGTH;
  const t = cyc / DAY_LENGTH;
  for (let i = 0; i < PHASE_WHEEL.length; i++) {
    if (t < PHASE_WHEEL[i].until) {
      return {
        phase: PHASE_WHEEL[i].phase,
        endsIn: (PHASE_WHEEL[i].until - t) * DAY_LENGTH,
        next: PHASE_WHEEL[(i + 1) % PHASE_WHEEL.length].phase,
      };
    }
  }
  // Unreachable (t < 1 by construction; the wheel's last spoke ends at 1).
  return { phase: PHASE_WHEEL[0].phase, endsIn: 0, next: PHASE_WHEEL[1].phase };
}

/** True when the clock stands in one of `phases` (undefined = any hour) —
 *  the shared gate for "this may only happen at night"-style data fields. */
export function inPhases(time: number, phases?: readonly DayPhase[]): boolean {
  return !phases || phases.includes(dayCycle(time).phase);
}

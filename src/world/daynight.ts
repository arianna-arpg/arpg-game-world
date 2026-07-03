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

// Reweights are by FACTION and only touch monsters already native to a zone.
const PHASE_BIAS: Record<DayPhase, SpawnBias> = {
  day: { countMul: 0.9, factionMul: { undead: 0.85 }, injectFactions: [] },
  dusk: { countMul: 1.05, factionMul: { undead: 1.2, gnoll: 1.1 }, injectFactions: [] },
  night: { countMul: 1.4, factionMul: { undead: 1.7, wild: 1.25, gnoll: 1.15 }, injectFactions: [] },
  dawn: { countMul: 1.0, factionMul: { undead: 0.8, sylvan: 1.15 }, injectFactions: [] },
};

/** Resolve the clock at a given world time. */
export function dayCycle(time: number): DayCycle {
  const cyc = ((time % DAY_LENGTH) + DAY_LENGTH) % DAY_LENGTH;
  const t = cyc / DAY_LENGTH;
  let phase: DayPhase;
  if (t < 0.40) phase = 'day';
  else if (t < 0.50) phase = 'dusk';
  else if (t < 0.90) phase = 'night';
  else phase = 'dawn';
  // Smooth light: peaks at t=0.20 (midday), troughs at t=0.70 (midnight).
  const light = 0.5 + 0.5 * Math.cos(2 * Math.PI * (t - 0.20));
  return { phase, t, light, label: PHASE_LABEL[phase], bias: PHASE_BIAS[phase] };
}

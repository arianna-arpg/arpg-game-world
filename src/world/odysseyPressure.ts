import type { OdysseyPressureDef } from '../data/odysseyPressure';
import type { OdysseyState } from './odyssey';

/** Derived from this world's receipts, never account history or character level.
 * Absent/eliminated factions have no tier; surviving factions begin at zero. */
export function odysseyEscalationTier(s: OdysseyState, faction: string): number | null {
  return s.roster.includes(faction) && !s.defeated.includes(faction) ? s.defeated.length : null;
}

/** The one activation gate shared by periodic and milestone-driven mechanics. */
export function odysseyPressureTier(s: OdysseyState, def: Pick<OdysseyPressureDef, 'faction' | 'startsAfter'>): number | null {
  const tier = odysseyEscalationTier(s, def.faction);
  return tier !== null && tier > 0 && tier >= def.startsAfter ? tier : null;
}

/** Preserve elapsed progress when tier/preparation changes. Missing interval
 * metadata on older saves preserves the deadline, without catch-up bursts. */
export function retimeOdysseyPressure(nextAt: number, previousInterval: number | undefined, interval: number, now: number): number {
  if (!nextAt) return now + interval;
  if (!previousInterval || previousInterval === interval) return nextAt;
  return now + Math.max(0, nextAt - now) * interval / previousInterval;
}

import { RELIC_SCALABLE, RELIQUARY_CFG } from '../data/reliquary';
import type { Modifier } from './stats';

export function relicNumeric(m: Pick<Modifier, 'stat' | 'kind' | 'value' | 'fromStat'>): boolean {
  return m.stat in RELIC_SCALABLE && (m.kind === 'flat' || m.kind === 'increased')
    && !m.fromStat && Number.isFinite(m.value) && m.value > 0;
}
/** Re-derive from raw item mods every time. No saved roll is ever multiplied.
 * Negative tradeoffs, grants, reservations, overrides and feedback links stay raw. */
export function empowerRelicMods(mods: Modifier[], power: number, seatFactor = 1): Modifier[] {
  const factor = (1 + Math.max(0, power)) * Math.max(0, seatFactor);
  return mods.filter(m => !m.stat.startsWith('seatPower_')).map(m => relicNumeric(m)
    ? { ...m, value: Math.min(RELIC_SCALABLE[m.stat], m.value * factor) } : m);
}
export function relicUniqueValue(m: Pick<Modifier, 'stat' | 'kind' | 'value' | 'fromStat'>): number {
  return relicNumeric(m) ? m.value * RELIQUARY_CFG.baseline : m.value;
}

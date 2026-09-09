import type { Actor } from './actor';
import { DAMAGE_TYPES, STAT_DEFS, type DamageType } from './stats';

export const takenAsStat = (from: DamageType, to: DamageType): string => `takenAs_${from}_${to}`;
const TAKEN_AS_IDS: string[] = [];
for (const from of DAMAGE_TYPES) for (const to of DAMAGE_TYPES) {
  if (from === to) continue;
  TAKEN_AS_IDS.push(`${from}_${to}`);
  STAT_DEFS[takenAsStat(from, to)] = { label: `${from} hit damage received as ${to}`, base: 0, min: 0, percent: true };
}

/** Defender conversion precedes resistance. All routes read the ORIGINAL
 * bundle once; outgoing fractions above 100% normalize, never create damage. */
export function receiveDamageAs(target: Actor, amounts: Partial<Record<DamageType, number>>): Partial<Record<DamageType, number>> {
  if (!target.sheet.armedFamily('takenAs_', TAKEN_AS_IDS).length) return amounts;
  const out: Partial<Record<DamageType, number>> = {};
  for (const from of DAMAGE_TYPES) {
    const amount = amounts[from] ?? 0;
    if (amount <= 0) continue;
    const routes = DAMAGE_TYPES.filter(to => to !== from)
      .map(to => ({ to, share: Math.max(0, target.sheet.get(takenAsStat(from, to))) })).filter(r => r.share > 0);
    const sum = routes.reduce((n, r) => n + r.share, 0), divisor = Math.max(1, sum);
    out[from] = (out[from] ?? 0) + amount * (1 - Math.min(1, sum));
    for (const r of routes) out[r.to] = (out[r.to] ?? 0) + amount * r.share / divisor;
  }
  return out;
}

export interface StatusRelay { id: string; status: string; radius: number; name: string }
export const STATUS_RELAYS: Record<string, StatusRelay> = {};
export const STATUS_RELAY_IDS: string[] = [];
export const relayStatusStat = (id: string): string => `relayStatus_${id}`;
export function registerStatusRelay(def: StatusRelay): void {
  if (!STATUS_RELAYS[def.id]) STATUS_RELAY_IDS.push(def.id);
  STATUS_RELAYS[def.id] = def;
  STAT_DEFS[relayStatusStat(def.id)] = { label: def.name, base: 0, min: 0 };
}

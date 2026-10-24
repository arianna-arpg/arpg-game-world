import type { ObjectiveSpec } from '../data/zones';

/** Pure worldgen alias resolver. A circuit consumes exactly one native draw. */
export function resolveNativeBeacon(kind: 'beacon' | 'circuit', rng: { int(lo: number, hi: number): number }): Extract<ObjectiveSpec, { kind: 'beacon' }> {
  return kind === 'circuit' ? { kind: 'beacon', count: rng.int(3, 4), chargeSec: 8 } : { kind: 'beacon' };
}

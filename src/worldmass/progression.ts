import type { MassSpec } from './contracts';

/** Expedition-owned policy: distance from the starting refuge plus an optional
 * seeded regional field. No character, play clock or residency input exists. */
export interface MassProgressionSpec {
  source: string;
  minLevel: number;
  maxLevel: number;
  stops: { distance: number; level: number }[];
  variation?: { field: string; levels: number; start: number; span: number };
}
export interface MassPopulation {
  level: number; table: { id: string; weight: number }[];
  /** Optional saved quotas over explicit native identities, independent of the hero. */
  limits?: { source: string; ids: string[]; max: number }[];
}
export function validateMassProgression(spec: MassProgressionSpec, terrain: MassSpec): void {
  const level = (n: number) => Number.isSafeInteger(n) && n >= 1 && n <= 100;
  if (!spec.source || !level(spec.minLevel) || !level(spec.maxLevel) || spec.minLevel > spec.maxLevel
    || !Array.isArray(spec.stops) || spec.stops.length < 2 || spec.stops.length > 64
    || spec.stops[0].distance !== 0) throw new Error('Invalid worldmass progression');
  spec.stops.forEach((s, i) => {
    if (!Number.isFinite(s.distance) || s.distance < 0 || s.distance > 1e9
      || (i > 0 && s.distance <= spec.stops[i - 1].distance)
      || !Number.isFinite(s.level) || s.level < spec.minLevel || s.level > spec.maxLevel)
      throw new Error('Invalid worldmass progression stop');
  });
  const v = spec.variation;
  if (v && (!terrain.fields.some(f => f.id === v.field) || !Number.isFinite(v.levels) || v.levels < 0 || v.levels > 100
    || !Number.isFinite(v.start) || v.start < 0 || !Number.isFinite(v.span) || v.span <= 0))
    throw new Error('Invalid worldmass regional danger');
}
export function geographicLevel(spec: MassProgressionSpec, distance: number, fields: Readonly<Record<string, number>>): number {
  if (!Number.isFinite(distance) || distance < 0) throw new Error('Invalid refuge distance');
  let level = spec.stops[spec.stops.length - 1].level;
  for (let i = 1; i < spec.stops.length; i++) {
    const a = spec.stops[i - 1], b = spec.stops[i];
    if (distance <= b.distance) {
      level = a.level + (b.level - a.level) * (distance - a.distance) / (b.distance - a.distance);
      break;
    }
  }
  const v = spec.variation;
  if (v) {
    const field = fields[v.field];
    if (!Number.isFinite(field)) throw new Error('Missing regional danger field');
    level += Math.max(-1, Math.min(1, field)) * v.levels * Math.max(0, Math.min(1, (distance - v.start) / v.span));
  }
  return Math.max(spec.minLevel, Math.min(spec.maxLevel, Math.floor(level)));
}

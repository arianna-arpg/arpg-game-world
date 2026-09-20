import { STAT_DEFS, type SkillTag } from './stats';
import type { OrbPaint } from './skills';

export type SatelliteEmission = { interval: number; range: number; windup?: number; target?: 'nearest' | 'farthest' } & (
  { mode: 'lob'; flight: number; arc: number; flash: number } | { mode: 'projectile' }
);

/** Satellites are carried effects, not actors: no health, AI, target or summon slot. */
export interface SatelliteDef {
  id: string;
  name: string;
  description: string;
  /** Ordinary skill payload; its effects and damage tags remain authoritative. */
  skill: string;
  tags: SkillTag[];
  /** Distance from the bearer's body rim, and the orb's contact radius. */
  orbit: number;
  radius: number;
  turnSpeed: number;
  armTime: number;
  /** Each orb may hit a given victim at most once per interval. */
  rehit?: number;
  /** Autonomous skill delivery. Range is measured from the orb. */
  emit?: SatelliteEmission;
  orbPaint?: OrbPaint;
  color: string;
  core: string;
}

export const SATELLITES: Record<string, SatelliteDef> = {};
export const SATELLITE_IDS: string[] = [];
export const satelliteCountStat = (id: string): string => `satelliteCount_${id}`;

export const SATELLITE_CFG = {
  maxPerActor: 8,
  maxStep: 1 / 120,
  maxFrame: 0.25,
  maxSweepDistance: 128,
  maxSweepSteps: 64,
  sweepSpacing: 6,
  /** Nearby pooled creatures enter the normal hit/credit pipeline. */
  promotePerFrame: 8,
  maxFlightsPerActor: 24,
};

export function registerSatellite(def: SatelliteDef): void {
  if (!SATELLITES[def.id]) SATELLITE_IDS.push(def.id);
  SATELLITES[def.id] = def;
  STAT_DEFS[satelliteCountStat(def.id)] = {
    label: `${def.name} Satellites`, desc: def.description, base: 0, min: 0, max: SATELLITE_CFG.maxPerActor,
  };
}

// Generic investment applies only to an already-granted family.
STAT_DEFS.satelliteCount = { label: 'Additional Satellites', desc: 'Adds satellites to families you already carry, up to the shared carrying limit.', base: 0, min: 0, max: SATELLITE_CFG.maxPerActor };
STAT_DEFS.satelliteOrbit = { label: 'Satellite Orbit Radius', desc: 'Scales how far your satellites orbit from your body.', base: 1, min: 0.25, max: 3, percent: true };
STAT_DEFS.satelliteSpeed = { label: 'Satellite Orbit Speed', desc: 'Scales the turning speed of your orbiting satellites.', base: 1, min: 0, max: 4, percent: true };

export function satelliteErrors(skillExists: (id: string) => boolean, deliveryType?: (id: string) => string | undefined): string[] {
  const errors: string[] = [];
  for (const [id, d] of Object.entries(SATELLITES)) {
    if (d.id !== id || !d.name || !d.description || !d.color || !d.core || !d.tags.includes('satellite')
      || ![d.orbit, d.radius, d.armTime].every(v => Number.isFinite(v) && v > 0)
      || (!d.rehit && !d.emit)
      || (d.emit && d.emit.mode !== 'lob' && d.emit.mode !== 'projectile')
      || (d.emit && deliveryType && deliveryType(d.skill) !== (d.emit.mode === 'lob' ? 'ground' : 'projectile'))
      || (d.orbPaint && ![d.orbPaint.fill, d.orbPaint.rim].every(v => Number.isFinite(v) && v >= 0 && v <= 1))
      || (d.emit?.windup !== undefined && (!Number.isFinite(d.emit.windup) || d.emit.windup <= 0))
      || (d.emit?.target !== undefined && !['nearest', 'farthest'].includes(d.emit.target))
      || (d.rehit !== undefined && (!Number.isFinite(d.rehit) || d.rehit <= 0))
      || (d.emit && ![d.emit.interval, d.emit.range, ...(d.emit.mode === 'lob' ? [d.emit.flight, d.emit.arc, d.emit.flash] : [])].every(v => Number.isFinite(v) && v > 0))
      || !Number.isFinite(d.turnSpeed) || !skillExists(d.skill)) errors.push(`satellite ${id}: invalid definition or missing payload`);
  }
  return errors;
}

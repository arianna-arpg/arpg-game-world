import type { Actor } from './actor';
import type { DamageType } from './stats';
import { SATELLITE_CFG } from './satelliteSpec';
import { instanceMods, skillContextTags, treeNodeOf, type SkillInstance, type ProjectileDelivery } from './skills';

export const PROJECTILE_ART_LIMITS = { maxOrbitSpeed: 18, maxLivePerSkill: 48 };
export function projectileArtsLiveLimit(inst: SkillInstance): number {
  const s = projectileArtsOf(inst);
  return !s?.orbit ? Infinity : s.satellite ? SATELLITE_CFG.maxPerActor : PROJECTILE_ART_LIMITS.maxLivePerSkill;
}

/** Composable projectile disciplines. Content owns the numbers; no skill or
 * node identifiers participate in their execution. Descendant fields are
 * independent so the order in which siblings are allocated is immaterial. */
export interface ProjectileArtsSpec {
  orbit?: { radius: number; turnSpeed: number; duration: number; rehit: number; visual: string };
  equippedSatelliteProjectiles?: number;
  satellite?: true;
  emit?: { interval: number; range: number; power: number; radius: number };
  orbitGrowth?: number;
  expireBurst?: { radius: number; power: number; fx?: string };
  nova?: { interval: number; radius: number; power: number; fx?: string };
  release?: true;
  wander?: { leash: number; speed: number; turnSpeed: number; jitter: number };
  pierce?: number;
  ailmentRamp?: { status: string; perCast: number; max: number };
  whiteHeat?: { status: string; element: Exclude<DamageType, 'physical'>; visual: string };
  attract?: { status: string; radius: number; duration: number; interval: number; maxWounds: number; mark: string; fx?: string };
  pillar?: { status: string; cooldown: number; radius: number; duration: number; interval: number; power: number; visual?: string; fx?: string };
  rupture?: { status: string; fraction: number; radius: number; fx?: string };
  cascade?: { count: number; spreadDeg: number; power: number; maxDepth: number; budget: number };
  flight?: { duration: number; speed: number; acceleration: number; bounceMore: number };
}

export function projectileArtsOf(inst: SkillInstance): ProjectileArtsSpec | undefined {
  if (inst.projectileRole === 'payload') return undefined;
  if (inst.projectileSpec) return inst.projectileSpec;
  let result = inst.def.projectileArts && { ...inst.def.projectileArts };
  for (const id of [...(inst.treeNodes ?? [])].sort()) {
    const patch = treeNodeOf(inst.def, id)?.projectileArts;
    if (patch) Object.assign(result ??= {}, patch);
  }
  return result;
}

/** Both preview and real casts see this delivery. Captured flights carry it
 * directly on their immutable definition for the existing projectile helpers. */
export function projectileArtsDelivery(inst: SkillInstance): ProjectileDelivery | undefined {
  if (inst.projectileRole || inst.def.delivery.type !== 'projectile') return undefined;
  const s = projectileArtsOf(inst); if (!s) return undefined;
  const d: ProjectileDelivery = { ...inst.def.delivery };
  if (s.pierce !== undefined) d.pierce = (d.pierce ?? 0) + s.pierce;
  if (s.orbit) {
    d.duration = s.orbit.duration; d.rehit = s.orbit.rehit; d.pierce = Infinity;
    d.hitForm = 'circle';
    d.trajectory = { ...d.trajectory, orbit: 1, orbitRadius: s.orbit.radius };
    d.ring = { phaseJitter: false };
  }
  if (s.flight) {
    d.duration = s.flight.duration; d.speed *= s.flight.speed;
    d.pierce = Infinity;
    d.trajectory = { ...d.trajectory, accel: s.flight.acceleration, frameBounce: Infinity };
  }
  return d;
}

export function projectileArtsCount(owner: Actor, inst: SkillInstance): number {
  const s = projectileArtsOf(inst); if (!s) return 0;
  const tags = skillContextTags(inst), extra = instanceMods(inst);
  return Math.floor((s.equippedSatelliteProjectiles ?? 0) * owner.sheet.get('satelliteEquipmentCount', tags, extra))
    + (s.satellite ? Math.floor(owner.sheet.get('satelliteCount', tags, extra)) : 0);
}

export function projectileArtsErrors(s: ProjectileArtsSpec, statusExists?: (id: string) => boolean): string[] {
  const errors: string[] = [];
  const visit = (v: unknown, path: string): void => {
    if (typeof v === 'number' && (!Number.isFinite(v) || v < 0)) errors.push(`invalid projectileArts.${path}`);
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) visit(x, path + '.' + k);
  };
  visit(s, '');
  for (const [name, value] of Object.entries(s)) {
    if (value && typeof value === 'object') for (const key of ['interval', 'duration', 'rehit', 'cooldown', 'radius', 'maxDepth', 'budget', 'maxWounds']) {
      if (key in value && (value as Record<string, number>)[key] <= 0) errors.push(`projectileArts.${name}.${key} must be positive`);
    }
    if (value && typeof value === 'object' && statusExists) for (const key of ['status', 'mark']) {
      const id = (value as Record<string, unknown>)[key];
      if (typeof id === 'string' && !statusExists(id)) errors.push(`projectileArts.${name}.${key} names unknown status ${id}`);
    }
  }
  if (s.rupture && s.rupture.fraction > 1) errors.push('projectileArts rupture cannot spend more than its bank');
  if (s.ailmentRamp && s.ailmentRamp.max > 1) errors.push('projectileArts ailment chance cap must be at most one');
  if (s.cascade && (!Number.isInteger(s.cascade.count) || s.cascade.count < 1)) errors.push('projectileArts cascade count must be a positive integer');
  return errors;
}

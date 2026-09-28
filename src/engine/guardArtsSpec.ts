import type { Actor } from './actor';
import { skillAbsorbAmount } from './absorb';
import { instanceMods, skillContextTags, treeNodeOf, type ProjectileDelivery, type SkillInstance } from './skills';

/** Native, composable guard disciplines. Unique fields merge across siblings;
 * no support graft or node-name branch participates in their execution. */
export interface GuardArtsSpec {
  armorRatio?: number;
  passiveBlockReduction?: number;
  plates?: { interval: number; max: number; reduction: number; label: string };
  plateRestore?: number;
  plateHeal?: { radius: number; lifeFraction: number };
  ram?: { base: number; thorns: number; weight: number; interval: number; repeat: number; reset: number; reach: number; arc: number; push: number };
  raiseBash?: number;
  bashWave?: { power: number; delivery: ProjectileDelivery };
  absorb?: { fraction: number; duration: number; cooldown: number };
  patience?: { seconds: number; multiplier: number };
  intactSatellite?: { family: string; max: number; duration: number };
  brokenSatellite?: { family: string; max: number; duration: number; power: number };
  intervention?: { cooldown: number; label: string };
  detonation?: { delay: number; radius: number; power: number };
  breakBurst?: { radius: number; power: number };
}

/** Shared safety budgets; these do not change authored skill tuning. */
export const GUARD_ARTS_LIMITS = { pendingBlasts: 16, promotePerFrame: 8, maximumReduction: 0.95 };

export function guardArtsErrors(spec: GuardArtsSpec): string[] {
  const errors: string[] = [];
  const positive = (name: string, ...values: number[]) => {
    if (values.some(v => !Number.isFinite(v) || v <= 0)) errors.push(`guardArts ${name}: values must be finite and positive`);
  };
  for (const key of ['armorRatio', 'plateRestore', 'passiveBlockReduction', 'raiseBash'] as const) {
    if (spec[key] !== undefined && (!Number.isFinite(spec[key]) || spec[key]! < 0)) errors.push(`guardArts ${key}: invalid value`);
  }
  if ((spec.plateRestore ?? 0) > 1 || (spec.passiveBlockReduction ?? 0) > 1) errors.push('guardArts: mitigation/restoration fractions exceed one');
  if (spec.plates) {
    positive('plates', spec.plates.interval, spec.plates.max, spec.plates.reduction);
    if (!Number.isInteger(spec.plates.max) || spec.plates.reduction >= 1 || !spec.plates.label) errors.push('guardArts: invalid plate cap, reduction or label');
  }
  if (spec.plateHeal) positive('plateHeal', spec.plateHeal.radius, spec.plateHeal.lifeFraction);
  if (spec.ram) {
    positive('ram', spec.ram.interval, spec.ram.reset, spec.ram.reach, spec.ram.arc, spec.ram.repeat);
    if ([spec.ram.base, spec.ram.thorns, spec.ram.weight, spec.ram.push].some(v => !Number.isFinite(v) || v < 0)
      || spec.ram.reset < spec.ram.interval) errors.push('guardArts: invalid ram payload or reset');
  }
  if (spec.bashWave) positive('bashWave', spec.bashWave.power, spec.bashWave.delivery.speed, spec.bashWave.delivery.radius, spec.bashWave.delivery.range);
  if (spec.absorb) positive('absorb', spec.absorb.fraction, spec.absorb.duration, spec.absorb.cooldown);
  if (spec.patience) positive('patience', spec.patience.seconds, spec.patience.multiplier);
  for (const rule of [spec.intactSatellite, spec.brokenSatellite]) if (rule) {
    positive('satellite', rule.max, rule.duration);
    if (!Number.isInteger(rule.max) || !rule.family) errors.push('guardArts: invalid satellite family/cap');
  }
  if (spec.brokenSatellite) positive('brokenSatellite', spec.brokenSatellite.power);
  if (spec.intervention) positive('intervention', spec.intervention.cooldown);
  if (spec.detonation) positive('detonation', spec.detonation.delay, spec.detonation.radius, spec.detonation.power);
  if (spec.breakBurst) positive('breakBurst', spec.breakBurst.radius, spec.breakBurst.power);
  return errors;
}

export function guardArtsOf(inst: SkillInstance): GuardArtsSpec | undefined {
  if (inst.guardArtsPayload) return undefined;
  let out = inst.def.guardArts;
  for (const id of [...new Set(inst.treeNodes ?? [])].sort()) {
    const patch = treeNodeOf(inst.def, id)?.guardArts;
    if (patch) out = { ...out, ...patch };
  }
  return out;
}

/** Same capacity for held guards, cast shields, previews and bash-derived hits. */
export function guardCapacity(a: Actor, inst: SkillInstance): number {
  const tags = skillContextTags(inst), mods = instanceMods(inst);
  return Math.max(0, ((inst.def.guard?.shieldLife ?? 0)
    + a.sheet.get('armor', tags, mods) * (guardArtsOf(inst)?.armorRatio ?? 0))
    * a.sheet.get('guardStrength', tags, mods));
}

export function guardArtAbsorb(a: Actor, inst: SkillInstance, power = 1): { amount: number; duration: number } | undefined {
  const spec = guardArtsOf(inst)?.absorb;
  return spec ? {
    amount: skillAbsorbAmount(a, inst, guardCapacity(a, inst) * spec.fraction * power),
    duration: spec.duration * power * a.sheet.get('effectDuration', skillContextTags(inst), instanceMods(inst)),
  } : undefined;
}

import { treeNodeOf, instanceInnateMods, makeSkillInstance, skillContextTags,
  type BuffEffect, type MeleeDelivery, type ProjectileDelivery, type SkillDef, type SkillInstance } from './skills';
import type { SkillTag } from './stats';

/** Independent, composable attack identities. No skill/node IDs in the runtime.
 * Patches own distinct fields; casting sweeps concatenate. Sorting makes sibling
 * allocation order irrelevant. */
export interface AttackSequenceSpec {
  hitCycle?: { max: number; increasedPerStack: number };
  cycleMax?: number;
  cycleBuff?: BuffEffect;
  vulnerability?: { perStack: number; duration: number; label: string };
  rhythm?: { bleed: number; impale: number };
  cycleArea?: { radiusPerStack: number; arcPerStack: number };
  consumeRhythm?: { multiplier: number };
  thrown?: ProjectileDelivery;
  recovery?: { meleeRange: number; bleed: number; missCooldown: number; look: string };
  bounce?: { seconds: number; distance: number; radius: number; charge: string; amount: number; cap: number; airLook: string;
    nova: { count: number; power: number } };
  catchBuff?: { max: number; label: string; repeatInterval: number };
  flightRain?: { interval: number; power: number; range: number; radius: number };
  /** Independent cast-time strikes. A zero delay lands immediately; later
   * beats use the same speed-scaled clock whether or not another beat exists. */
  castSweeps?: { delay: number; delivery: MeleeDelivery; power: number }[];
  impactBleed?: { radius: number; power: number; bleed: number };
}

export function attackSequenceOf(inst: SkillInstance): AttackSequenceSpec | undefined {
  if (inst.sequenceRole === 'payload') return undefined;
  let out = inst.def.attackSequence && { ...inst.def.attackSequence };
  for (const id of [...(inst.treeNodes ?? [])].sort()) {
    const patch = treeNodeOf(inst.def, id)?.attackSequence;
    if (patch) {
      const { castSweeps, ...fields } = patch;
      Object.assign(out ??= {}, fields);
      if (castSweeps) out.castSweeps = [...(out.castSweeps ?? []), ...castSweeps];
    }
  }
  return out;
}

export function attackSequenceDelivery(inst: SkillInstance): ProjectileDelivery | undefined {
  if (inst.sequenceRole) return undefined; // captured casts/payloads already carry their own delivery
  return attackSequenceOf(inst)?.thrown;
}

/** Socket admission and execution use the same component instance. Its own
 * tags route support effects; the parent retains its separate delivery tags. */
export function attackSequencePayload(host: SkillInstance, delivery: SkillDef['delivery'], tags?: SkillTag[]): SkillInstance {
  const inst = makeSkillInstance({ ...host.def, tree: undefined, attackSequence: undefined, trigger: undefined,
    delivery, tags: tags ?? [...skillContextTags(host)], innateMods: instanceInnateMods(host),
    leveling: { perLevel: [] }, thresholds: undefined, cooldown: 0, manaCost: 0, useTime: 0,
    effects: [{ type: 'damage' }], followUp: undefined, castCycle: undefined }, 1);
  inst.sockets = [...host.sockets]; inst.grafts = host.grafts && [...host.grafts];
  inst.sequenceHost = host.sequenceHost ?? host; inst.sequenceRole = 'payload'; inst.procChainDepth = 1;
  return inst;
}

export function attackSequenceSweepInstances(host: SkillInstance): SkillInstance[] {
  return (attackSequenceOf(host)?.castSweeps ?? []).map(sweep =>
    attackSequenceSweepInstance(host, sweep.delivery));
}

/** An authored strike is part of the paid attack, not a generated proc.
 * Preserve inherited depth when the parent itself came from a proc. */
export function attackSequenceSweepInstance(host: SkillInstance, delivery: MeleeDelivery): SkillInstance {
  const inst = attackSequencePayload(host, delivery, ['attack', 'melee', 'aoe', 'physical']);
  // Growth is already baked into innateMods; retain the real level for
  // downstream catalog follow-throughs without folding that growth twice.
  inst.level = host.level; inst.bonusLevels = host.bonusLevels;
  inst.procChainDepth = Math.max(host.procChainDepth ?? 0, host.state?.trigDepth ?? 0);
  return inst;
}

/** Shared support/preview census, independent from socket admission. */
export function attackSequenceStatuses(inst: SkillInstance): string[] {
  const s = attackSequenceOf(inst);
  return s?.rhythm ? ['bleed', 'impaled'] : s?.recovery || s?.impactBleed ? ['bleed'] : [];
}

export function attackSequenceErrors(s: AttackSequenceSpec): string[] {
  const errors: string[] = [];
  const scan = (v: unknown, path: string): void => {
    if (typeof v === 'number' && (!Number.isFinite(v) || v < 0)) errors.push(`invalid attackSequence.${path}`);
    if (v && typeof v === 'object') for (const [key, value] of Object.entries(v)) if (key !== 'mods') scan(value, path + '.' + key);
  };
  scan(s, '');
  if (s.hitCycle && (!Number.isInteger(s.hitCycle.max) || s.hitCycle.max < 1)) errors.push('invalid attackSequence hit-cycle maximum');
  if (s.cycleMax !== undefined && (!Number.isInteger(s.cycleMax) || s.cycleMax < 1)) errors.push('invalid attackSequence cycle maximum');
  if (s.flightRain && s.flightRain.interval <= 0) errors.push('attackSequence rain requires a positive interval');
  if (s.bounce && (s.bounce.seconds <= 0 || s.bounce.radius <= 0)) errors.push('attackSequence bounce requires positive time and radius');
  if (s.catchBuff && (!Number.isInteger(s.catchBuff.max) || s.catchBuff.max < 1 || s.catchBuff.repeatInterval <= 0)) errors.push('invalid attackSequence catch rhythm');
  if (s.thrown && (s.thrown.speed <= 0 || s.thrown.range <= 0 || s.thrown.radius <= 0)) errors.push('invalid attackSequence projectile');
  return errors;
}

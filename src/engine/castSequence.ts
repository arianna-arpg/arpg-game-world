import type { Actor } from './actor';
import { instanceDelivery, type SkillInstance, type SkillEffect } from './skills';
import { mod } from './stats';

/** A captured cast view: the catalog and later casts retain their original form. */
export function empoweredSkill(inst: SkillInstance, power: number, size: number, effects: SkillEffect[] = []): SkillInstance {
  const d = instanceDelivery(inst);
  const delivery = d.type === 'projectile' ? { ...d, radius: d.radius * size }
    : d.type === 'storm' ? { ...d, hitRadius: d.hitRadius * size } : d;
  return { ...inst, def: { ...inst.def, delivery, castSequence: undefined,
    effects: [...inst.def.effects, ...effects],
    innateMods: [...(inst.def.innateMods ?? []), mod('damage', 'more', power - 1)] } };
}

/** A completed-use cycle, local to the actual actor and native skill instance. */
export function castSequenceInstance(actor: Actor, inst: SkillInstance, realUse: boolean): SkillInstance {
  const spec = inst.def.castSequence;
  if (!spec || !realUse) return inst;
  const count = (actor.castSequences.get(inst) ?? 0) + 1;
  actor.castSequences.set(inst, count % spec.every);
  return count % spec.every === 0 ? empoweredSkill(inst, spec.power, spec.size, spec.effects) : inst;
}

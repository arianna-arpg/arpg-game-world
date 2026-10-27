import type { Actor } from './actor';
import { instanceDelivery, instanceMods, skillContextTags, type SkillInstance, type SummonDelivery } from './skills';

/** Shared capacity and mutually exclusive identities are independent contracts. */
export function summonCapacity(owner: Actor, inst: SkillInstance, d: SummonDelivery): number {
  if (d.arts?.single) return 1;
  const raw = owner.sheet.get('minionMaxCount', skillContextTags(inst), instanceMods(inst), d.maxActive);
  const multiple = d.capacityMultiple;
  if (multiple !== undefined && Number.isSafeInteger(multiple) && multiple > 0)
    return Math.max(multiple, Math.ceil(raw / multiple) * multiple);
  return Math.max(1, Math.round(raw));
}

/** A fixed slot request permits several reserved types to inhabit one pool.
 * Otherwise a contract requests its full effective capacity, as before.
 * Existing contracts keep their claims while a body is dead or rebuilding. */
export function summonContractSlots(owner: Actor, inst: SkillInstance, d: SummonDelivery): number {
  const cap = summonCapacity(owner, inst, d);
  const requested = d.persistent?.slots === undefined ? cap
    : Math.max(1, Math.round(d.persistent.slots + owner.sheet.get('summonCount', skillContextTags(inst), instanceMods(inst))));
  let held = 0;
  if (d.poolGroup) for (const [id, contract] of owner.summonToggles) {
    if (id === inst.def.id) continue;
    const other = instanceDelivery(contract.inst);
    if (other.type !== 'summon' || other.poolGroup !== d.poolGroup) continue;
    if (d.exclusiveGroup && other.exclusiveGroup === d.exclusiveGroup) continue;
    held += contract.slots ?? summonCapacity(owner, contract.inst, other);
  }
  return Math.max(0, Math.min(requested, cap - held));
}

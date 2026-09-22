import type { Actor } from './actor';
import { SKILLS } from '../data/skills';
import { instanceChargeCost, makeSkillInstance, type SkillInstance } from './skills';

/** A fresh life's provision is initial state, not a gain/proc event. */
export function fillFlaskChargeBanks(actor: Actor, skills: Iterable<SkillInstance>): void {
  const banks = new Map<string, number>();
  for (const inst of skills) {
    const cost = instanceChargeCost(inst);
    if (!inst.def.tags.includes('flask') || !cost) continue;
    banks.set(cost.charge, Math.max(banks.get(cost.charge) ?? 0, actor.chargeCapFor(cost.charge, inst)));
  }
  for (const [charge, cap] of banks) {
    actor.charges.set(charge, cap);
    actor.spendCharge(charge, 0); // synchronize ordinary per-charge modifiers
  }
}

/** Durable ammunition, separate from transient fermentation clocks. Derived
 * from the catalog so future flask banks enroll through their ordinary cost. */
const flaskBankDefs = Object.values(SKILLS).filter(d => d.tags.includes('flask') && d.chargeCost);
export function flaskChargeBanks(actor: Actor): Record<string, number> {
  return Object.fromEntries(flaskBankDefs.map(d => [d.chargeCost!.charge, actor.charges.get(d.chargeCost!.charge) ?? 0]));
}
/** Loading is restoration of state, not a gain: no charge proc or sympathy event. */
export function restoreFlaskChargeBanks(actor: Actor, banks: Record<string, number> | undefined, hostSnapshot = false): void {
  for (const def of flaskBankDefs) {
    const charge = def.chargeCost!.charge, value = banks?.[charge];
    const inst = actor.skills.find(s => s?.def.id === def.id) ?? makeSkillInstance(def);
    actor.charges.set(charge, Number.isFinite(value) ? Math.max(0, Math.min(hostSnapshot ? Infinity : actor.chargeCapFor(charge, inst), Math.floor(value!))) : 0);
  }
}

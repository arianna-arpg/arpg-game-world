import type { Actor } from './actor';
import { SKILLS } from '../data/skills';
import { makeSkillInstance } from './skills';

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

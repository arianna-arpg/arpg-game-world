import type { Actor } from './actor';
import { instanceMods, skillContextTags, type SkillInstance } from './skills';
/** Resolve explicit absorb effects through their source skill. Payment wards,
 * overheal and other earned pools retain their own bounded reward formulas. */
export function skillAbsorbAmount(caster: Actor, inst: SkillInstance, base: number): number {
  return Math.max(0, base * caster.sheet.get('absorbPower', skillContextTags(inst), instanceMods(inst)));
}

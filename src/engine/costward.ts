import type { Actor } from './actor';
import { instanceMods, skillContextTags, type SkillInstance } from './skills';

/** Resource payment becomes a finite absorb pool. Shared by payment and preview;
 * callers supply actual resources removed, excluding ES substitutes and debt. */
export function costWard(caster: Actor, inst: SkillInstance, paid: { mana: number; life: number }) {
  const tags = skillContextTags(inst), extra = instanceMods(inst);
  const get = (stat: string) => caster.sheet.get(stat, tags, extra);
  return {
    amount: Math.min(caster.maxLife() * get('costWardCap'),
      Math.max(0, paid.mana) * get('costWard_mana') + Math.max(0, paid.life) * get('costWard_life')),
    duration: get('costWardDuration') * get('effectDuration'),
  };
}

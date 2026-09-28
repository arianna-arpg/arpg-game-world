import type { Actor } from './actor';
import { instanceMods, skillContextTags, type SkillInstance } from './skills';

/** Individually attributable shields coexist with the legacy strongest-wins
 * pool. Replacement/cleanup is silent; only damage breaks and time expires. */
export interface AbsorbLayer {
  amount: number;
  remaining: number;
  source: SkillInstance;
  ended: (reason: 'broken' | 'expired') => void;
}
export function spendAbsorbLayers(target: Actor, total: number): number {
  for (const [key, layer] of [...target.absorbLayers]) {
    if (total <= 0) break;
    const used = Math.min(layer.amount, total);
    layer.amount -= used; total -= used;
    if (layer.amount <= 0) {
      target.absorbLayers.delete(key);
      layer.ended('broken');
    }
  }
  return total;
}
export function tickAbsorbLayers(target: Actor, dt: number): void {
  for (const [key, layer] of [...target.absorbLayers]) {
    layer.remaining -= dt;
    if (layer.remaining > 1e-9) continue;
    target.absorbLayers.delete(key);
    if (!target.dead && !target.downed) layer.ended('expired');
  }
}
/** Resolve explicit absorb effects through their source skill. Payment wards,
 * overheal and other earned pools retain their own bounded reward formulas. */
export function skillAbsorbAmount(caster: Actor, inst: SkillInstance, base: number): number {
  return Math.max(0, base * caster.sheet.get('absorbPower', skillContextTags(inst), instanceMods(inst)));
}

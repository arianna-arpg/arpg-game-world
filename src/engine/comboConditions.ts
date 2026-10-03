import type { Actor } from './actor';
import { instanceMods } from './skills';
import { comboProgress, COMBO_CFG } from './sequence';
import { COMBO_CONDITION_READOUTS } from '../data/comboConditions';

export type ComboConditionId = typeof COMBO_CONDITION_READOUTS[number]['id'];
export type ComboConditionRow = { id: ComboConditionId; lit: number; len: number; remaining: number };

/** Presentation only. Partial casts reuse the native progress reader, but an
 * active condition uses its authoritative countdown, not an aging cast tail.
 * This deliberately does not scale the starter window by comboWindow. */
export function comboConditionRows(a: Actor, now: number): ComboConditionRow[] {
  if (a.dead || a.downed) return [];
  if (a.comboConditionHud) return a.comboConditionHud;
  const skills = a.skills.filter(s => s !== null).flatMap(s => instanceMods(s));
  return COMBO_CONDITION_READOUTS.flatMap(def => {
    if (!a.sheet.usesCondition(def.id) && !skills.some(m => m.when === def.id)) return [];
    const progress = comboProgress(a.castRing ?? [], {
      [def.pattern]: { n: COMBO_CFG.conditionRun, by: 'skill' },
      within: COMBO_CFG.conditionWindow,
    }, now);
    const remaining = a.sheet.hasCondition(def.id) ? Math.max(0, a.comboCondLeft) : 0;
    return [{ id: def.id, ...progress, remaining }];
  });
}

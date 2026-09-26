import type { Actor } from './actor';
import { comboReadout, comboStat, type ComboRuleDef } from './sequence';
import { COMBO_LIST } from '../data/combos';
import { COMBO_CUE_STYLES, type ComboCueStyle } from '../data/comboCues';

export type ComboCueRow = { id: string; lit: number; len: number; glow: number };

export function comboCueStyle(rule: ComboRuleDef): ComboCueStyle | undefined {
  if (rule.cue === false) return undefined;
  // Same precedence as the matcher. Unknown mod profiles keep an honest read.
  const fallback = rule.seq ? 'weave' : rule.counts ? 'gather'
    : rule.vary ? (rule.vary.by === 'lane' ? 'weave' : 'round') : 'beat';
  const key = rule.cue ?? fallback;
  return Object.hasOwn(COMBO_CUE_STYLES, key) ? COMBO_CUE_STYLES[key] : COMBO_CUE_STYLES[fallback];
}

/** One consume-aware read for world, HUD and wire. No gameplay mutation.
 * Live grants are checked even before the first cast and after a respec. */
export function comboCueRows(a: Actor, now: number): ComboCueRow[] {
  if (a.dead || a.downed) return [];
  if (a.comboHud) return a.comboHud;
  const rows: ComboCueRow[] = [];
  for (const rule of COMBO_LIST) {
    if (a.sheet.get(comboStat(rule.id)) <= 0) continue;
    rows.push({ id: rule.id, ...comboReadout(a.castRing ?? [], rule, now,
      a.sheet.get('comboWindow'), a.comboFire?.get(rule.id)) });
  }
  return rows;
}

import { COMBAT_CUE_CFG, COMBAT_CUE_STYLES } from '../data/combatCues';
import type { Actor } from './actor';
import { instanceMods, skillContextTags } from './skills';

/** Frozen event data: clients never have to infer a success from text. */
export interface CombatCue { style: string; facing: number; }
export function combatCueStyle(id: string) {
  return Object.prototype.hasOwnProperty.call(COMBAT_CUE_STYLES, id)
    ? COMBAT_CUE_STYLES[id] : COMBAT_CUE_STYLES.parry;
}
export function combatCueFlash(pos: { x: number; y: number }, style: string,
  radius: number, facing = 0, color?: string) {
  const cfg = combatCueStyle(style);
  return { pos: { ...pos }, radius, color: color ?? cfg.color,
    life: cfg.life, maxLife: cfg.life, fx: 'combatCue',
    combatCue: { style, facing } satisfies CombatCue };
}
export function timingCueFlash(a: Actor, style: string, aim: { x: number; y: number }) {
  const facing = Math.atan2(aim.y - a.pos.y, aim.x - a.pos.x);
  const reach = a.radius + COMBAT_CUE_CFG.contactPad;
  return combatCueFlash({ x: a.pos.x + Math.cos(facing) * reach,
    y: a.pos.y + Math.sin(facing) * reach }, style, COMBAT_CUE_CFG.timingRadius, facing);
}

/** Exact opening guard window, including support-granted parries. The wire
 * carries this resolved read because remote casting instances are minimal. */
export function parryCueStrength(a: Actor): number {
  const cs = a.casting;
  if (!cs || cs.mode !== 'guard' || (cs.shield ?? 0) <= 0) return 0;
  if (cs.parryCue !== undefined) return cs.parryCue;
  const spec = cs.inst.def.guard;
  if (!spec) return 0;
  const window = spec.parry?.window ?? a.sheet.get('guardParry',
    skillContextTags(cs.inst.def), instanceMods(cs.inst));
  const elapsed = cs.channelTime ?? 99;
  return window > 0 && elapsed <= window ? 0.2 + 0.8 * Math.max(0, 1 - elapsed / window) : 0;
}

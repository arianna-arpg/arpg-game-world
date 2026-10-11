import type { World } from './world';
/** Paint-only links on peers. No owner, damage, healing or update state. */
export interface SkillTetherVisual {
  ax: number; ay: number; bx: number; by: number; width: number; color: string;
  voice?: string; skillId?: string; age: number; fade: number;
  fromTier?: number; toTier?: number;
}
export function skillTetherVisual(t: World['tethers'][number]): SkillTetherVisual {
  return { ax: t.ax, ay: t.ay, bx: t.bx, by: t.by, width: t.width, color: t.color,
    voice: t.visual ?? (t.link === 'pack' ? 'pack' : t.affects === 'allies' ? 'healing_chain' : undefined),
    skillId: t.inst?.def.id ?? t.skillId, age: t.visualAge ?? 1,
    fade: Number.isFinite(t.remaining) ? Math.min(1, Math.max(0, t.remaining / 0.12)) : 1,
    fromTier: t.a.tier ?? 0, toTier: t.b.tier ?? 0 };
}

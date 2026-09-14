import type { Actor } from './actor';
import type { GuardSurgeEffect, SkillInstance } from './skills';
import { instanceMods, skillContextTags } from './skills';
import { skillAbsorbAmount } from './absorb';

/** Guarded surges overfill the held shield. An explicitly authored fallback
 * buys a brief, strongest-only ward without needing another skill first. */
export function guardSurgePreview(caster: Actor, inst: SkillInstance, effect: GuardSurgeEffect) {
  const guarded = caster.casting?.mode === 'guard';
  const mana = Math.max(0, caster.mana * Math.max(0, Math.min(1, effect.manaFraction)));
  const ward = effect.unguarded;
  const base = guarded ? mana * effect.ratio : ward ? Math.min(mana * effect.ratio, caster.maxLife() * ward.capLife) : 0;
  return { guarded, mana, amount: skillAbsorbAmount(caster, inst, base),
    duration: !guarded && ward ? ward.duration * caster.sheet.get('effectDuration', skillContextTags(inst), instanceMods(inst)) : 0 };
}

export function applyGuardSurge(caster: Actor, inst: SkillInstance, effect: GuardSurgeEffect): boolean {
  const guard = caster.casting?.mode === 'guard' ? caster.casting : undefined;
  if (!guard && !effect.unguarded) return false;
  const surge = guardSurgePreview(caster, inst, effect);
  if (!surge.mana) return false;
  caster.mana -= surge.mana;
  if (guard) {
    guard.shield = (guard.shield ?? 0) + surge.amount;
    guard.maxShield = Math.max(guard.maxShield ?? 1, guard.shield);
  } else {
    caster.absorb = Math.max(caster.absorb, surge.amount);
    caster.absorbTimer = Math.max(caster.absorbTimer, surge.duration);
  }
  return true;
}

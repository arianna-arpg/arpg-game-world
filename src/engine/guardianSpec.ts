import { STAT_DEFS } from './stats';

/** Reactive projectile wards; no actor, target, satellite orbit or skill slot. */
export interface GuardianDef {
  id: string; name: string; description: string;
  recharge: number; reach: number; flash: number; color: string;
  moteRadius: number; moteOffset: number; moteSpread: number;
}
export const GUARDIANS: Record<string, GuardianDef> = {};
export const GUARDIAN_IDS: string[] = [];
export const GUARDIAN_CFG = { maxPerActor: 3, maxFrame: 0.25, teleport: 128 };
export const guardianCountStat = (id: string): string => `guardianCount_${id}`;
export function registerGuardian(def: GuardianDef): void {
  if (!GUARDIANS[def.id]) GUARDIAN_IDS.push(def.id);
  GUARDIANS[def.id] = def;
  STAT_DEFS[guardianCountStat(def.id)] = {
    label: `${def.name} Guardians`, desc: def.description, base: 0, min: 0, max: GUARDIAN_CFG.maxPerActor,
  };
}
STAT_DEFS.guardianRecharge = { label: 'Guardian Recharge Rate', desc: 'Scales how quickly your projectile guardians become ready after an interception.', base: 1, min: 0, max: 4, percent: true };
export function guardianErrors(): string[] {
  return Object.entries(GUARDIANS).flatMap(([id, d]) => d.id !== id || !d.name || !d.description || !d.color
    || ![d.recharge, d.reach, d.flash, d.moteRadius, d.moteOffset, d.moteSpread].every(n => Number.isFinite(n) && n > 0)
    ? [`guardian ${id}: invalid definition`] : []);
}

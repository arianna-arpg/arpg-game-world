import { treeNodeOf, type SkillInstance } from './skills';

/** Native Hivecall economy. Temporary guard offspring never pay Sovereignty. */
export const HIVECALL = {
  meterMax: 100, deathGain: 20, passiveGain: 2, duration: 18, cooldown: 4, novaCooldown: 2,
  rapidInterval: 0.2, broodDelay: 10, broodLife: 8, auraRadius: 180,
  redirect: 0.6, rescueWindow: 20,
} as const;
export interface HivecallState {
  meter: number;
  rebirthAt?: number;
  readyAt?: number;
  rescueUntil?: number;
  rescueStreak?: number;
}
export function hivecallState(inst: SkillInstance): HivecallState {
  return (inst.state ??= {}).hivecall ??= { meter: 0 };
}
export function hivecallNode(inst: SkillInstance | undefined, id: string): boolean {
  return !!inst?.def.hivecall && !!inst.treeNodes?.includes(id);
}
/** Ranked ids repeat; keep the form-only bonus independent of minion damage. */
export function hivecallFormDamage(inst: SkillInstance): number {
  if (!inst.def.hivecall) return 0;
  return (inst.treeNodes ?? []).reduce((sum, id) => sum + (treeNodeOf(inst.def, id)?.hivecallFormDamage ?? 0), 0);
}
export const hivecallRescueFactor = (streak: number): number => Math.pow(0.5, Math.min(8, streak));

/** Native objective-completion bounty. Place adapters snapshot the same curve;
 * future tuning cannot silently retune a continued expedition's entitlement. */
export interface ObjectiveRewardCurve { xpBase: number; xpPerLevel: number }
export const OBJECTIVE_REWARD: Readonly<ObjectiveRewardCurve> = { xpBase: 40, xpPerLevel: 30 };
export function objectiveRewardXp(level: number, curve: ObjectiveRewardCurve = OBJECTIVE_REWARD): number {
  return curve.xpBase + level * curve.xpPerLevel;
}

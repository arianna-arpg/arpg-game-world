/** Legendary duplicates advance a particular skill copy. All economy/reward
 * policy lives here; saved ranks are independent of the currently chosen reward. */
export interface SkillEmpowermentPolicy {
  enabled: boolean;
  copiesPerMerge: number;
  ranksPerMerge: number;
  preserveDonorRanks: boolean;
  /** null = no gameplay cap. Existing investment is never clamped on load. */
  maxRank: number | null;
  reward: { kind: 'passivePoints'; pointsPerRank: number };
}

export const SKILL_EMPOWERMENT: SkillEmpowermentPolicy = {
  enabled: true,
  copiesPerMerge: 2,
  ranksPerMerge: 1,
  preserveDonorRanks: true,
  maxRank: null,
  reward: { kind: 'passivePoints', pointsPerRank: 1 },
};

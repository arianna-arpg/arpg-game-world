/** Account power milestones. Receipts describe depth reached in ONE Odyssey,
 * never lifetime kills. Further systems can name later stages without engine cases. */
export const odysseyMilestoneKey = (stage: number): string => `odyssey_stage_${stage}`;

export const POWER_PROGRESSION = {
  vocations: { odysseyStage: 1, label: 'Vocations' },
  awakening: { odysseyStage: 2, label: 'Skill Awakening' },
};
export type PowerProgression = keyof typeof POWER_PROGRESSION;

export function powerProgressionOpen(ledger: Readonly<Record<string, number>>, system: PowerProgression): boolean {
  const stage = POWER_PROGRESSION[system].odysseyStage;
  return stage <= 0 || (ledger[odysseyMilestoneKey(stage)] ?? 0) >= 1;
}

export function powerProgressionRefusal(system: PowerProgression): string {
  return `Defeat ${POWER_PROGRESSION[system].odysseyStage} leaders in one Odyssey to unlock ${POWER_PROGRESSION[system].label} for your account.`;
}

/** Body-space motion profiles. Ground truth, hitboxes and timing stay native. */
export interface BodyActionProfile {
  pull: number; windTurn: number; compress: number;
  reach: number; releaseTurn: number; stretch: number; settle: number;
}
export const BODY_ACTION_PROFILES: Record<string, BodyActionProfile> = {
  sweep: { pull: .22, windTurn: -.32, compress: .10, reach: .28, releaseTurn: .28, stretch: .08, settle: .24 },
  thrust: { pull: .25, windTurn: -.08, compress: .13, reach: .34, releaseTurn: .04, stretch: .16, settle: .22 },
  cast: { pull: .12, windTurn: -.08, compress: .07, reach: .18, releaseTurn: .04, stretch: .10, settle: .26 },
  pulse: { pull: 0, windTurn: 0, compress: .12, reach: 0, releaseTurn: 0, stretch: .16, settle: .30 },
};
export const BODY_ACTION_CFG = { enabled: true, maxShift: .36, maxTurn: .4, minScale: .8, maxScale: 1.2, partSweepFraction: .35 };

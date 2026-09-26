/** The dialogue reader's shared presentation and reading dials. NPC purpose,
 * priority and dwell still belong to speechAttention.ts. */
export const DIALOGUE_CFG = {
  presentation: 'dialogue' as 'dialogue' | 'bubble',
  pageChars: 210,
  width: 880,
  portraitSize: 72,
  edge: 18,
  hudGap: 18,
  fontSize: 18,
  lineHeight: 1.65,
  /** Stable reading band, used with and without a service. Sizes pre-scale. */
  height: 190,
  heightMaxFraction: 0.36,
  heightLimitFraction: 0.6,
  minHeight: 130,
  minWorkspaceHeight: 180,
  controlClearance: 60,
  workspaceTop: 56,
};

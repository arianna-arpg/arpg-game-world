/** The dialogue reader's shared presentation and reading dials. NPC purpose,
 * priority and dwell still belong to speechAttention.ts. */
export const DIALOGUE_CFG = {
  presentation: 'dialogue' as 'dialogue' | 'bubble',
  pageChars: 210,
  width: 540,
  portraitSize: 72,
  edge: 18,
  hudGap: 18,
  fontSize: 18,
  lineHeight: 1.65,
  /** An NPC panel, independent of Inventory and its pages. Sizes pre-scale. */
  height: 520,
  workspaceTop: 56,
};

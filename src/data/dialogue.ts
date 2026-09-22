/** The dialogue reader's shared presentation and reading dials. NPC purpose,
 * priority and dwell still belong to speechAttention.ts. */
export const DIALOGUE_CFG = {
  presentation: 'dialogue' as 'dialogue' | 'bubble',
  pageChars: 210,
  width: 880,
  portraitSize: 144,
  edge: 18,
  hudGap: 18,
  fontSize: 18,
  lineHeight: 1.65,
  /** Shared service workspace. All sizes are pre-scale except edge/gap. */
  services: {
    readerHeight: 190,
    readerMaxFraction: 0.36,
    readerLimitFraction: 0.6,
    portraitSize: 72,
    /** Screen pixels: smaller windows scroll each service's content. */
    minPanelWidth: 300,
    minPanelHeight: 180,
    minReaderHeight: 130,
    controlClearance: 60,
    gap: 14,
    top: 48,
  },
};

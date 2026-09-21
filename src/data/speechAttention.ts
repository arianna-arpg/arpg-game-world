/** Speech attention is independent of bubble styling and service execution.
 * Priority expresses purpose; no actor name or inn layout participates. */
export interface SpeechAttention {
  priority: number;
  dwellSec: number;
  /** A usable counter can retain attention even when it has no instruction. */
  reserveSilent: boolean;
}

export const SPEECH_ATTENTION_CFG = {
  focus: { switchMargin: 18, staleSec: 1 },
  kinds: {
    ambient: { priority: 0, dwellSec: 0.65, reserveSilent: false },
    functional: { priority: 100, dwellSec: 0.4, reserveSilent: true },
  },
  roles: {} as Record<string, Partial<SpeechAttention> | undefined>,
};

/** Purpose → role → definition. Mutable data permits package overrides. */
export function speechAttentionFor(
  kind: keyof typeof SPEECH_ATTENTION_CFG.kinds, role: string,
  definition?: Partial<SpeechAttention>,
): SpeechAttention {
  return { ...SPEECH_ATTENTION_CFG.kinds[kind], ...SPEECH_ATTENTION_CFG.roles[role], ...definition };
}

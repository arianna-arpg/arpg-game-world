/** Speech attention is independent of bubble styling and service execution.
 * Priority expresses purpose; no actor name or inn layout participates. */
export interface SpeechAttention {
  priority: number;
  dwellSec: number;
  /** A usable counter can retain attention even when it has no instruction. */
  reserveSilent: boolean;
  /** Used when a functional counter has no more specific instruction. */
  restingLine?: string;
}

export const SPEECH_ATTENTION_CFG = {
  focus: { switchMargin: 18, staleSec: 1 },
  pointer: { enabled: true, hitPadding: 10 },
  cue: { radius: 23, width: 1.5, color: '#d8c8a8', alpha: 0.16, selectedAlpha: 0.38, progressAlpha: 0.55 },
  kinds: {
    ambient: { priority: 0, dwellSec: 0.65, reserveSilent: false },
    functional: { priority: 100, dwellSec: 0.4, reserveSilent: true },
  },
  roles: {
    innkeep: { restingLine: 'Rest a moment, love. There is always a place for you by the fire.' },
  } as Record<string, Partial<SpeechAttention> | undefined>,
};

/** Purpose → role → definition. Mutable data permits package overrides. */
export function speechAttentionFor(
  kind: keyof typeof SPEECH_ATTENTION_CFG.kinds, role: string,
  definition?: Partial<SpeechAttention>,
): SpeechAttention {
  return { ...SPEECH_ATTENTION_CFG.kinds[kind], ...SPEECH_ATTENTION_CFG.roles[role], ...definition };
}

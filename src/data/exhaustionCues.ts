import type { TellSpec } from '../engine/tells';

/** Shared exhaustion vocabulary. Placement is in facing space; intensity
 * follows the existing reserve/status/AI state, never an animation timer. */
export const WIND_PUFF: TellSpec[] = [
  {
    source: 'wind', band: [0.45, 1], curve: 'smooth', portrait: 0,
    channel: {
      kind: 'part',
      part: { kind: 'breathPuff', x: 0.48, y: 0.06,
        params: { period: 1.8, effortPeriod: 0.8, duty: 0.8, opacity: 0.75 } },
      alpha: [0, 0.9], scale: [0.65, 1.3],
    },
  },
  {
    // The retreat accumulator resets at exhaustion. This separate state
    // keeps gasps visible for the entire actual catch-breath window.
    source: 'winded', steps: 1, portrait: 0,
    channel: {
      kind: 'part',
      part: { kind: 'breathPuff', x: 0.48, y: 0.06, scale: 1.3,
        params: { period: 0.6, duty: 0.9, opacity: 0.9 } },
      alpha: [0, 1],
    },
  },
  { source: 'winded', steps: 1, portrait: 0, channel: { kind: 'lean', amp: 0.85 } },
];

/** Reserve vulnerability: deeper slump and short paired gasps beside the
 * collapsed bellows. The status can end early or have an authored duration. */
export const VENT_GASP: TellSpec[] = [
  {
    source: 'status:winded_gasp', steps: 1, portrait: 0,
    channel: {
      kind: 'part',
      part: { kind: 'breathPuff', x: 0.3, y: 0.28, mirror: true, scale: 1.1,
        color: '#d6e7b8', params: { period: 0.45, duty: 0.9, opacity: 0.9 } },
      alpha: [0, 1],
    },
  },
  { source: 'status:winded_gasp', steps: 1, portrait: 0, channel: { kind: 'lean', amp: 0.95 } },
];

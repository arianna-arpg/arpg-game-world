import type { StatusDef } from '../engine/status';
import type { AfflictionMotif } from './afflictionCues';

/** Shared lodged-steel language. Status data opts in; no skill/actor id tests.
 * A presence cue, not a forecast of the next qualifying attack or its damage. */
export const IMPALE_BODY_CUE: NonNullable<StatusDef['bodyCue']> = {
  group: 'lodged-steel',
  parts: [{ kind: 'lodgedSpikes', color: '#aebbc9', params: {
    n: 9, root: 0.58, scatter: 0.22, length: 0.95, width: 0.16, lean: 0.32,
  } }],
};
export const IMPALE_SCREEN_CUE: StatusDef['screenCue'] = {
  motif: 'impale', color: '#aebbc9', intensity: 0.85,
};
export const IMPALE_EDGE_MOTIF: AfflictionMotif = {
  gesture: 'spike', alphaFloor: 0.6, alphaCeil: 0.8,
  reachQuiet: 0.032, reachUrgent: 0.052, count: 8, period: 9, order: 4,
  spikeWidth: 0.14, spikeLean: 0.32, spikeBreath: 0.045, spikeInset: 0.12,
};

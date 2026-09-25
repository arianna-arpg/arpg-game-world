import { IMPALE_EDGE_MOTIF } from './impaleCues';

/** Independent ailment layers, restrained together without dropping a family.
 * Presentation thresholds only; actual low-life signaling remains separate. */
export const AFFLICTION_CUE_CFG = {
  horizon: 2, forecastSteps: 8,
  pressureStart: 0.04, pressureFull: 0.65,
  /** Sum of layer opacities. Quiet presence is reserved before stronger
   * layers share the remaining room; there is no strongest-N cutoff. */
  opacityBudget: 0.95,
  sideBand: 0.10,
  armedUrgencyFloor: 0.7,
};

export type AfflictionOverlayMode = 'gentle' | 'still' | 'off';
export type AfflictionGesture = 'drip' | 'ember' | 'vignette' | 'clasp' | 'notch' | 'spike';
export interface AfflictionMotif {
  gesture: AfflictionGesture;
  alphaFloor: number; alphaCeil: number;
  /** Lateral reach in short-side units; for vignettes, clear-center radius. */
  reachQuiet: number; reachUrgent: number;
  /** Fixed work per side, independent of stack count. */
  count: number;
  period: number;
  /** Paint broad haze underneath localized material effects. */
  order: number;
  /** Spike material: half-width / length, angle scatter, gentle depth motion,
   * and root inset / reach. Counts stay fixed on all four edges. */
  spikeWidth?: number; spikeLean?: number; spikeBreath?: number; spikeInset?: number;
}
/** Profiles can be extended or replaced by content. StatusDef.screenCue
 * selects a family/color/intensity; unknown profiles use the neutral fallback. */
export const AFFLICTION_MOTIFS: Record<string, AfflictionMotif> = {
  impale: IMPALE_EDGE_MOTIF,
  wound: { gesture: 'drip', alphaFloor: 0.13, alphaCeil: 0.65,
    reachQuiet: 0.025, reachUrgent: 0.065, count: 6, period: 7.5, order: 2 },
  fire: { gesture: 'ember', alphaFloor: 0.16, alphaCeil: 0.70,
    reachQuiet: 0.035, reachUrgent: 0.09, count: 12, period: 6, order: 3 },
  toxin: { gesture: 'vignette', alphaFloor: 0.055, alphaCeil: 0.32,
    reachQuiet: 0.48, reachUrgent: 0.30, count: 0, period: 8, order: 0 },
  doom: { gesture: 'clasp', alphaFloor: 0.12, alphaCeil: 0.50,
    reachQuiet: 0.035, reachUrgent: 0.09, count: 3, period: 9, order: 1 },
  generic: { gesture: 'notch', alphaFloor: 0.10, alphaCeil: 0.35,
    reachQuiet: 0.018, reachUrgent: 0.045, count: 5, period: 8, order: 1 },
};
export function afflictionMotif(id: string): AfflictionMotif {
  return Object.hasOwn(AFFLICTION_MOTIFS, id) ? AFFLICTION_MOTIFS[id] : AFFLICTION_MOTIFS.generic;
}

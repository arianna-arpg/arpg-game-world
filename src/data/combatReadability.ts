/** Shared mechanic cues. Geometry and pacing only: no combat authority. */
export const REACTIVE_CUE_CFG = {
  cap: { color: '#9ab0c8', pad: 8, width: 2, alpha: 0.55 },
  gasp: { color: '#ffd890', size: 6, pad: 13, width: 2, dim: 0.22, hudDepth: 0.60, hudSize: 9 },
  eventPad: 17,
};
export interface VolatileCueStyle { pieces: number; pad: number; reach: number; width: number; alpha: number; period: number; }
export const VOLATILE_CUE_STYLES: Record<string, VolatileCueStyle> = {
  vents: { pieces: 5, pad: 5, reach: 9, width: 2, alpha: 0.75, period: 2.8 },
};
export interface WardCueStyle { color: string; pieces: number; pad: number; width: number; linkAlpha: number; beadPeriod: number; }
export const WARD_CUE_STYLES: Record<string, WardCueStyle> = {
  lattice: { color: '#c68ee8', pieces: 6, pad: 14, width: 2.5, linkAlpha: 0.5, beadPeriod: 1.8 },
};

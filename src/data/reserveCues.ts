import type { TellChannel, TellSpec } from '../engine/tells';
import type { ReserveSpec } from '../engine/reserves';

/** Worn recovery vents. Profiles reuse the ordinary tell parts/pose fabric;
 * anatomy, placement and material are data, never monster-id branches. */
export const RESERVE_VENT_CUES: Record<string, TellChannel[]> = {
  steam: [{ kind: 'part', part: { kind: 'breathPuff', x: 0.25, y: 0.2, mirror: true,
    scale: 1.1, color: '#d5dfcf', params: { period: 0.6, duty: 0.95, opacity: 0.85 } }, alpha: [0, 1] }],
  sap: [{ kind: 'part', part: { kind: 'breathPuff', x: -0.5, y: 0.18, rot: Math.PI / 2,
    scale: 0.85, color: '#c8a878', params: { period: 0.75, duty: 0.95, opacity: 0.85, liquid: true } }, alpha: [0, 1] }],
};
export function reserveVentTells(specs: readonly ReserveSpec[] | undefined): TellSpec[] {
  const rows: TellSpec[] = [];
  for (const spec of specs ?? []) {
    if (!spec.vent || spec.vent.cue === false) continue;
    const key = spec.vent.cue ?? 'steam';
    const channels = Object.hasOwn(RESERVE_VENT_CUES, key) ? RESERVE_VENT_CUES[key] : RESERVE_VENT_CUES.steam;
    for (const channel of channels) rows.push({ source: 'reserveVent:' + spec.id, steps: 1, portrait: 0, channel });
  }
  return rows;
}

export interface PoolVentStyle {
  pieces: number; width: number; alpha: number; period: number; inner: number;
  boundaryAlpha: number; hudReach: number;
}
export const POOL_VENT_CUES: Record<string, PoolVentStyle> = {
  mist: { pieces: 10, width: 2, alpha: 0.42, period: 1.15, inner: 0.2, boundaryAlpha: 0.42, hudReach: 9 },
};
export const RESERVE_CUE_CFG = { stagePad: 6, outline: '#18221a', outlinePad: 2, hudPieces: 3 } as const;

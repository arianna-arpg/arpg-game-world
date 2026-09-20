/** Shared preparation geometry, independent of named skills or monsters. */
export interface CastingCueStyle {
  radius: number; frontPad: number; width: number; corners: number;
  interrupt: string; fizzle: string; ready: string;
}
export const CASTING_CUE_STYLES: Record<string, CastingCueStyle> = {
  standard: { radius: 13, frontPad: 5, width: 1.8, corners: 4,
    interrupt: 'cast_interrupt', fizzle: 'cast_fizzle', ready: 'cast_ready' },
};
export const CASTING_CUE_CFG = {
  emptyAlpha: 0.18, fullAlpha: 0.85, readyColor: '#fff0bb',
  focusColor: '#a8d8a0', brokenColor: '#e05050', focusGap: 5,
};
export function castingCueStyle(id = 'standard'): CastingCueStyle {
  return Object.hasOwn(CASTING_CUE_STYLES, id) ? CASTING_CUE_STYLES[id] : CASTING_CUE_STYLES.standard;
}

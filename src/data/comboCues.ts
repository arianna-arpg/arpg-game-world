/** Completion gestures share a silhouette on the caster and their HUD row.
 * No skill/monster ids: rule structure picks a default, data can override it. */
export interface ComboCueStyle {
  shape: 'beat' | 'weave' | 'round' | 'gather';
  width: number;
  reach: number;
}
export const COMBO_CUE_STYLES: Record<string, ComboCueStyle> = {
  beat: { shape: 'beat', width: 1.8, reach: 0.6 },
  weave: { shape: 'weave', width: 1.8, reach: 0.45 },
  round: { shape: 'round', width: 1.8, reach: 0.5 },
  gather: { shape: 'gather', width: 1.8, reach: 0.7 },
};
export const COMBO_CUE_CFG = {
  body: { size: 10, gap: 28, pad: 18, maxColumns: 4 },
  hud: { size: 5, pitch: 14, pip: 4.5, row: 18, iconGap: 13 },
  outline: '#10121a', outlinePad: 2.5, idleAlpha: 0.55,
} as const;

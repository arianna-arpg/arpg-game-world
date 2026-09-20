/** Shared defense vocabulary. New shell anatomy selects a profile, never
 * a monster-name branch in the renderer. Unknown profiles use `shell`. */
export interface DefenseCueStyle {
  shape: 'plates' | 'spiral' | 'carapace' | 'brace' | 'guard';
  pieces: number;
  travel: number;
  thickness: number;
  breakLife: number;
  reformLife: number;
  impactLife: number;
}

export const DEFENSE_CUE_STYLES: Record<string, DefenseCueStyle> = {
  shell: { shape: 'plates', pieces: 8, travel: 0.85, thickness: 0.17, breakLife: 0.65, reformLife: 0.5, impactLife: 0.2 },
  spiral: { shape: 'spiral', pieces: 7, travel: 0.7, thickness: 0.12, breakLife: 0.75, reformLife: 0.6, impactLife: 0.22 },
  carapace: { shape: 'carapace', pieces: 5, travel: 0.9, thickness: 0.28, breakLife: 0.65, reformLife: 0.55, impactLife: 0.2 },
  poise: { shape: 'brace', pieces: 4, travel: 0.45, thickness: 0.12, breakLife: 0.5, reformLife: 0.4, impactLife: 0.18 },
  guard: { shape: 'guard', pieces: 3, travel: 0.6, thickness: 0.24, breakLife: 0.45, reformLife: 0.3, impactLife: 0.18 },
};

export const DEFENSE_CUE_CFG = {
  poiseColor: '#d8b06a', shellPad: 6, poisePad: 3, guardPad: 9,
  intactAlpha: 0.22, poolAlpha: 0.43, brokenAlpha: 0.42,
  brokenGap: 0.36, reformAlpha: 0.7, fractureWidth: 1.7,
  bashLife: 0.28, bashTravel: 1.15,
};

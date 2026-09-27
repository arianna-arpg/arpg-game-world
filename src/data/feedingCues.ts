/** Consumption materials and actual resource-gain voices. Presentation only. */
export interface FeedingCueSpec { profile?: string; color?: string; }
export const FEEDING_CUE_STYLES: Record<string, { color: string; pieces: number; life: number; curl: number }> = {
  carrion: { color: '#bacb87', pieces: 4, life: 0.65, curl: 12 },
  flesh: { color: '#d67690', pieces: 5, life: 0.65, curl: 16 },
  ritual: { color: '#bb98e2', pieces: 6, life: 0.7, curl: 20 },
  life: { color: '#f08d90', pieces: 3, life: 0.32, curl: 9 },
  mana: { color: '#91b9f3', pieces: 3, life: 0.32, curl: 9 },
  es: { color: '#9ce5e8', pieces: 3, life: 0.32, curl: 9 },
  absorb: { color: '#e1eaf3', pieces: 3, life: 0.32, curl: 9 },
};
export const FEEDING_CUE_CFG = {
  outline: '#171923', lineWidth: 1.5, gainLife: 0.25, gainRows: 6,
  bodyMotes: 3, massPieces: 6, hudReach: 12, transferRadius: 18,
};

/** Shared outcome profiles, independent of skill/monster names. Geometry,
 * timing and density are presentation dials; none change combat rules. */
export interface CombatCueStyle {
  shape: 'cross' | 'ghost' | 'barrier' | 'scatter' | 'snap' | 'mend' | 'barbs' | 'ground' | 'fracture' | 'collapse';
  life: number; color: string; pieces: number; travel: number; width: number;
}
export const COMBAT_CUE_STYLES: Record<string, CombatCueStyle> = {
  cast_interrupt: { shape: 'fracture', life: 0.42, color: '#d05050', pieces: 5, travel: 1.3, width: 2 },
  cast_fizzle: { shape: 'collapse', life: 0.5, color: '#8a8678', pieces: 5, travel: 0.8, width: 1.7 },
  cast_ready: { shape: 'snap', life: 0.3, color: '#fff0bb', pieces: 4, travel: 0.7, width: 2.2 },
  parry: { shape: 'cross', life: 0.3, color: '#ffe9a6', pieces: 4, travel: 0.7, width: 2.5 },
  evade: { shape: 'ghost', life: 0.32, color: '#bfdaea', pieces: 3, travel: 0.75, width: 1.6 },
  immune: { shape: 'barrier', life: 0.28, color: '#dceaf4', pieces: 6, travel: 0.25, width: 2.2 },
  resist: { shape: 'scatter', life: 0.32, color: '#b8cad6', pieces: 5, travel: 0.8, width: 1.7 },
  perfect: { shape: 'snap', life: 0.32, color: '#ffe9a6', pieces: 4, travel: 0.55, width: 2 },
  flawless: { shape: 'snap', life: 0.4, color: '#fff1bd', pieces: 8, travel: 0.75, width: 2.4 },
  spark: { shape: 'snap', life: 0.22, color: '#fff8dc', pieces: 3, travel: 0.9, width: 2.8 },
  mend: { shape: 'mend', life: 0.55, color: '#9ae4b2', pieces: 4, travel: 0.7, width: 2.3 },
  affliction: { shape: 'barbs', life: 0.45, color: '#dc9fe4', pieces: 6, travel: 0.65, width: 2 },
  aftershock: { shape: 'ground', life: 0.4, color: '#dfbb84', pieces: 7, travel: 0.85, width: 2.3 },
};
export const COMBAT_CUE_CFG = {
  alpha: 0.9, contactPad: 9, timingRadius: 13,
  readyPad: 12, readyWidth: 2.3, readyColor: '#fff0b8',
  reflectedScale: 2.8, reflectedWidth: 1.8, reflectedColor: '#fff0b8',
};

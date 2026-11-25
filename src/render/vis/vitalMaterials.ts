/** Shared by the combat instruments and their hover key. Glyphs use a centred 16-unit square. */
export const VITAL_MATERIALS = {
  life: { label: 'Life', ink: '#ff9a96', glyph: 'M0 -7 C-1 -3 -5 0 -5 3 A5 5 0 0 0 5 3 C5 0 1 -3 0 -7 Z M-2 2 Q-3 5 0 5' },
  mana: { label: 'Mana', ink: '#9cc9ff', glyph: 'M0 -7 L5 0 0 7 -5 0 Z M0 -7 L1 0 0 7 M-5 0 L1 0 5 0' },
  es: { label: 'Energy shield', ink: '#83e5ee', glyph: 'M0 -6 L6 -4 5 1 Q4 5 0 7 Q-4 5 -5 1 L-6 -4 Z M0 -3 L0 4' },
  absorb: { label: 'Absorb', ink: '#deddf6', glyph: 'M-6 -2 L0 -6 6 -2 0 2 Z M-6 2 L0 6 6 2' },
  insight: { label: 'Insight', ink: '#7ce4ca', glyph: 'M-7 0 Q0 -9 7 0 Q0 9 -7 0 Z M0 -2 L1.5 0 0 2 -1.5 0 Z' },
  poise: { label: 'Poise', ink: '#efc283', glyph: 'M-6 5 L-6 -5 -3 -5 -3 -2 -1 -2 -1 -5 2 -5 2 -2 4 -2 4 -5 6 -5 6 5 Z' },
  endurance: { label: 'Endurance', ink: '#b5d683', glyph: 'M-6 5 L-3 -2 -1 0 2 -6 7 5 Z' },
  ward: { label: 'Ward', ink: '#b1ceff', glyph: 'M0 -7 L6 -2 4 4 0 7 -4 4 -6 -2 Z M-4 -2 L0 2 4 -2' },
} as const;
export type VitalMaterial = keyof typeof VITAL_MATERIALS;
export type HudOrb = 'life' | 'mana';
export const VITAL_GLASS = {
  life: {
    texture: 'flow', core: '#ff6655', body: '#b22236', shade: '#540e27', deep: '#200c1c',
    rim: '#ffd4bc', edge: '#72383d', well: '#341b26', metal: '#b99070'
  },
  mana: {
    texture: 'crystal', core: '#64c6ff', body: '#285cad', shade: '#202c71', deep: '#0f1537',
    rim: '#d5f4ff', edge: '#344c78', well: '#182538', metal: '#94acba'
  },
} as const;
export const VITAL_DIAL = {
  radius: 46, compactRadius: 36, glassRatio: 42 / 46, gap: 12, guardRadius: 7, capRadius: 4.5, clearance: 14,
  absorbReference: 60,
  // Fixed sectors run from the lower left to the lower right of the crown.
  sectors: {
    es: { from: -209, to: -170, divisions: 1, width: 4.5, tip: false },
    absorb: { from: -157, to: -117, divisions: 4, width: 4.5, tip: false },
    insight: { from: -104, to: -67, divisions: 1, width: 2.5, tip: true },
    poise: { from: -54, to: -11, divisions: 5, width: 4.5, tip: false },
    endurance: { from: 2, to: 38, divisions: 3, width: 4.5, tip: false },
  },
};
export type GuardDial = keyof typeof VITAL_DIAL.sectors;

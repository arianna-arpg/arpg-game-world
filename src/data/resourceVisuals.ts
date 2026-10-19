/** Resource identity is geometry first; callers may freely replace the paint. */
export type ResourceMaterial = 'life' | 'mana' | 'es' | 'absorb' | 'flame';
export const RESOURCE_VISUALS = {
  life: { color: '#e77882', curl: 13, pieces: 4 },
  mana: { color: '#91b9f3', curl: 9, pieces: 3 },
  es: { color: '#9ce5e8', curl: 7, pieces: 3 },
  absorb: { color: '#e1eaf3', curl: 7, pieces: 3 },
  flame: { color: '#ffd98a', curl: 11, pieces: 3 },
} satisfies Record<ResourceMaterial, { color: string; curl: number; pieces: number }>;
export const RESOURCE_FLOW = { life: 0.46, rows: 6, visible: 32, tail: 34, outline: '#171923' };

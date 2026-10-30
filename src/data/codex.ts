/** The Codex's shelves and reading policy. Content comes from the live registries. */
export interface CodexSection { id: string; label: string; pages: { id: string; label: string }[] }
export const CODEX_SECTIONS: CodexSection[] = [
  { id: 'abilities', label: 'Skills & Supports', pages: [{ id: 'skills', label: 'Skills' }, { id: 'supports', label: 'Supports' }] },
  { id: 'account', label: 'Account Unlocks', pages: [{ id: 'owned', label: 'Owned' }] },
  { id: 'bestiary', label: 'Bestiary', pages: [{ id: 'creatures', label: 'Creatures' }, { id: 'magic', label: 'Magic Packs' }, { id: 'affixes', label: 'Elite Affixes' }, { id: 'rarities', label: 'Rarity' }] },
  { id: 'mechanics', label: 'Mechanics', pages: [{ id: 'attributes', label: 'Attributes' }, { id: 'stats', label: 'Statistics' }, { id: 'conversions', label: 'Conversions' }] },
  { id: 'classes', label: 'Classes', pages: [{ id: 'classes', label: 'Vessels' }] },
];
export const CODEX_CFG = {
  pageSize: 24,
  refreshMs: 1000,
  sightingsEverySec: 0.5,
  /** Explicit opt-ins for future non-dropping player abilities. NPC arts stay out. */
  extraSkills: [] as string[],
  /** Shared player senses, with an omnidirectional reading for this top-down game. */
  perception: { arcDeg: 360, rearMul: 1 },
  previewLevel: 1,
};

/** The Codex's shelves and reading policy. Content comes from the live registries. */
export interface CodexSection { id: string; label: string; pages: { id: string; label: string; description?: string; empty?: string }[] }
export const CODEX_SECTIONS: CodexSection[] = [
  { id: 'abilities', label: 'Skills & Supports', pages: [{ id: 'skills', label: 'Skills', description: 'Find an art. Read its nature. Watch it unfold.' }, { id: 'supports', label: 'Supports', description: 'Explore the ways a support can change a skill.' }] },
  { id: 'account', label: 'Account Unlocks', pages: [{ id: 'owned', label: 'Owned', description: 'The permanent discoveries and gifts your account has claimed.', empty: 'Permanent Vault unlocks will be recorded here as your account grows.' }] },
  { id: 'bestiary', label: 'Bestiary', pages: [{ id: 'creatures', label: 'Creatures', description: 'Encounter the world. Let the Tracker deepen your understanding.' }, { id: 'magic', label: 'Magic Packs', description: 'Recognize a magic pack and learn how to answer it.' }, { id: 'affixes', label: 'Elite Affixes', description: 'Read the modifiers carried by elite enemies.' }, { id: 'rarities', label: 'Rarity', description: 'How rarity changes a creature and its rewards.' }] },
  { id: 'mechanics', label: 'Mechanics', pages: [{ id: 'attributes', label: 'Attributes', description: 'Every point, drawn from the current game rules.' }, { id: 'stats', label: 'Statistics', description: 'The statistics behind your build, with their current defaults and limits.' }, { id: 'conversions', label: 'Conversions', description: 'Follow damage between types and try the rules for yourself.' }] },
  { id: 'classes', label: 'Classes', pages: [{ id: 'classes', label: 'Vessels', description: 'The vessels discovered across your lives.' }] },
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
  /** A slow preview remains recoverable; a late ready frame still replaces the notice. */
  previewWaitMs: 12000,
};

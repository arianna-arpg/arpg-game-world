// ---------------------------------------------------------------------------
// MONSTER INFREQUENTS — themed drop pools (the Grim Dawn MI pattern).
//
// A THEME is a string shared by three registries and nothing else:
//   · bases carry the tag `mi_<theme>` (itembases.ts) — dropWeight 0 keeps
//     them OUT of the world pool; only their theme can mint them,
//   · affixes gate on that same tag (itemaffixes.ts) — the "goblin-ey"
//     lines that roll nowhere else, riding the ordinary tag-gating,
//   · monsters map onto a theme here (or per-def via
//     MonsterDef.infrequentTheme, which wins over this table).
// When a themed monster's kill mints a gear item, MI_CFG.chance swaps the
// base pull into the theme pool — same rarity pipeline, same affix engine,
// so an MI can still come up magic with an EXQUISITE theme line on it.
// Adding a theme = rows in three data files; the engine never changes.
// ---------------------------------------------------------------------------

export const MI_CFG = {
  /** Chance a themed monster's gear drop pulls from its theme pool. */
  chance: 0.3,
};

/** defId → theme, for monsters that don't declare their own. */
export const MONSTER_THEMES: Record<string, string> = {
  goblin_skirmisher: 'goblin',
  goblin_shaman: 'goblin',
  goblin_brute: 'goblin',
  goblin_chief: 'goblin',
  bandit_keeper: 'bandit',
  bandit_cutthroat: 'bandit',
  bandit_bruiser: 'bandit',
  bulwark_thane: 'bandit',
  bandit_wardcaster: 'bandit',
  steppe_ronin: 'bandit',
  zombie: 'undead',
  skeleton_warrior: 'undead',
  skeleton_archer: 'undead',
  hollow_bannerman: 'undead',
  cistern_warden: 'undead',
  transfusion_acolyte: 'undead',
};

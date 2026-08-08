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

import { registerWornThrong } from '../engine/throng';

export const MI_CFG = {
  /** Chance a themed monster's gear drop pulls from its theme pool. */
  chance: 0.3,
};

// THE UNTAMED BROOD — the abyssal theme's identity, throng-based (the
// worn-throng seam, engine/throng.ts WORN_THRONGS): the `wornThrong_
// abyssal_brood` stat rides the theme's gear (the Riftbound Cuffs'
// implicit + the 'of the Teeming Rift' suffix, itemaffixes.ts) and every
// rank folds all three axes — the brood clock quickens (frequency),
// beats condense more kin (number), and the roster cap + husk linger
// grow (density). Dormant broodlings appear in a ring around the wearer,
// join INNATELY underfoot (no bar skill — the walk is the claim), and
// hunt untamed on their own drive. Hunting the abyssal kin is the only
// road to the gear: the farm law, worn.
registerWornThrong({
  id: 'abyssal_brood', name: 'Abyssal Brood',
  monsterId: 'abyssal_broodling',
  color: '#7ac8d8',
  cap: 3, capPerRank: 1,
  everySec: 26, everyFloorSec: 8, freqPerRank: 0.5,
  countPerRank: 0.5,
  ttlSec: 40, ttlPerRank: 0.35,
  huntRadius: 420,
});

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
  bandit_trapsmith: 'bandit',
  pit_champion: 'bandit',
  warband_skald: 'bandit',
  camp_bannerman: 'bandit',
  zombie: 'undead',
  skeleton_warrior: 'undead',
  skeleton_archer: 'undead',
  hollow_bannerman: 'undead',
  cistern_warden: 'undead',
  transfusion_acolyte: 'undead',
  barrow_swordsaint: 'undead',
  gnoll_impaler: 'gnoll',
  abyssal_horologist: 'abyssal',
  rift_ascetic: 'abyssal',
};

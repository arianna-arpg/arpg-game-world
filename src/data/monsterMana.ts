// ---------------------------------------------------------------------------
// THE MANA POOLS: how much mana a body brings to a fight, beside its def's own pool.
// The owner's direction (decision C20): a caster runs dry only in a long fight or
// against a build that drains it, never routinely. A row raises the pool of a body that
// emptied in an ordinary fight, sized so it lasts about 45 s of casting at the rate it
// would cast with mana to spare, and still runs dry in a fight longer than that. Regen
// is untouched. Kits whose dry-out is part of their identity (the imp's claw rush once
// its fire runs out) and kits paced by mana alone (a spell with little or no cooldown,
// whose spend with mana to spare would pass 2.5 times its regen) have no row.
//
// Folded at spawn as a 'more' mana modifier for enemy mints only (its own 'manaPool'
// sheet source), like the threat dials: a summon, a form or a claimed beast keeps its
// def's pool. docs/design/npc-ai-direction.md records the pass and its evidence.
// ---------------------------------------------------------------------------

import { mod, type Modifier } from '../engine/stats';

/** Pass of 2026-11-03: about 45 s at the unconstrained spend, 10% to spare, rounded up to 5. */
export const MONSTER_MANA_TUNED: Record<string, number> = {
  ashling: 145,
  awakened_custodian: 80,
  bell_ram: 65,
  blowgun_wretch: 70,
  camp_bannerman: 250,
  canopic_bearer: 120,
  canopic_vizier: 235,
  cinder_sprite: 60,
  cortege_lantern: 440,
  crag_lynx: 85,
  depthkin_brute: 60,
  derecho_ram: 135,
  formic_major: 55,
  gauntlet_swarm: 105,
  gnomon_lancer: 120,
  hollow_scripture_harness: 345,
  hollow_vanguard: 35,
  howdah_archer: 110,
  khamsin_dervish: 120,
  lesser_brute: 60,
  levin_medusa: 290,
  levin_thegn: 130,
  lode_thrall: 90,
  lumen_moth: 25,
  myconid_warrior: 60,
  nettle_dervish: 55,
  orrery_keeper: 370,
  pit_champion: 100,
  pressure_hulk: 50,
  pyre_titan: 60,
  scree_shambler: 75,
  seam_ripper: 60,
  sepulcher_apis: 70,
  skinshed_dervish: 70,
  sleepless_warden: 140,
  the_antipode: 50,
  tidewrack_shambler: 95,
  tundra_behemoth: 115,
  ushabti_file: 25,
  ushabti_sentinel: 130,
  zephyr_eel: 145,
};

/** The pool a body's enemy mint wears: none without a row, or once its def's own pool
 *  already holds as much. */
export function manaPoolMods(defId: string, defPool: number): Modifier[] {
  const pool = MONSTER_MANA_TUNED[defId];
  return pool !== undefined && defPool > 0 && pool > defPool ? [mod('mana', 'more', pool / defPool - 1)] : [];
}

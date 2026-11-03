// ---------------------------------------------------------------------------
// THE THREAT DIALS: what each body's blows are worth, beside the shared skills it
// swings. Most monsters fight with skills other monsters share (claw, cleave), so a
// skill's own numbers cannot correct one body without moving all of them. A dial can.
//
// Every monster has a row, and every dial is 1 unless a tuning pass moved it. A dial
// is a multiplier folded at spawn as an ordinary 'more' damage modifier: `all` scales
// every blow, and any other key scales only blows carrying that tag ('melee', 'spell').
// A dial left at 1 adds no modifier, so an untouched body is byte-identical.
//
// The rows are live: `createMonster` reads them at each spawn, so the balance
// harness's knobs reach them (`monsterDamage.<id>.all*0.8`), and the farm proposes
// numbers here for any body whose threat sits far from its cohort. A dial holds the
// threat of bodies that fight the player, so only enemy-side mints wear it (its own
// 'threat' sheet source): the same def summoned by a player, worn as a form or
// claimed as a companion fights at its kit's full numbers.
// ---------------------------------------------------------------------------

import { mod, type Modifier, type SkillTag } from '../engine/stats';
import { MONSTERS } from './monsters';

/** Multipliers by blow tag. 'all' is untagged. */
export type DamageDial = Partial<Record<SkillTag | 'all', number>>;

/**
 * The tuned rows, by pass. A row says where the body's threat should sit, not why;
 * docs/design/npc-ai-direction.md records each pass and its evidence.
 *
 * Pass of 2026-11-02, after NPC AI phases 0 to 3: a body may rise as far as its
 * cohort's median, or 15% past its own old level if it already stood above the
 * median, and no further. Bodies whose new damage was only newly counted (blasts,
 * doom) were left alone.
 *
 * Passes of 2026-11-02, after phase 6's `direct` bucket (`hemophage`, `vent_matron`)
 * and its `approach` bucket (`shadow_self`, `surge_echo`): the same rule, read with the
 * intent layer off and then on. Dials of 0.95 or more are noise and stay at 1.
 */
export const MONSTER_DAMAGE_TUNED: Record<string, DamageDial> = {
  abyssal_crawler: { melee: 0.7 },
  abyssal_flayer: { melee: 0.85 },
  amanita_sovereign: { all: 0.9 },
  archfiend_legate: { melee: 0.6 },
  ash_whelp: { melee: 0.85 },
  bandit_wardcaster: { melee: 0.9 },
  barrow_gravemaker: { melee: 0.3 },
  beastkin_warbringer: { melee: 0.35 },
  beastlord_khan: { melee: 0.35 },
  bell_keeper: { melee: 0.65 },
  blade_wraith: { melee: 0.85 },
  caravan_master: { melee: 0.7 },
  carven_king: { melee: 0.5 },
  chrysalid_broodmother: { melee: 0.45 },
  deep_thresher: { melee: 0.75 },
  depthkin_brute: { melee: 0.3, all: 0.9 },
  depthkin_crawler: { melee: 0.3 },
  elemental_concordance: { all: 0.8 },
  emerald_mantis: { melee: 0.75 },
  first_chord: { all: 0.7 },
  gale_elemental: { melee: 0.65 },
  glut_incarnate: { melee: 0.5 },
  goblin_whelpsling: { melee: 0.65 },
  gorged_ghoul: { melee: 0.85 },
  grave_shaman: { all: 0.55 },
  harvest_effigy: { melee: 0.6 },
  hellhound: { melee: 0.3, all: 0.7 },
  hemophage: { all: 0.8 },
  imp: { melee: 0.3 },
  lesser_reaper: { melee: 0.85 },
  levin_thegn: { melee: 0.3, all: 0.65 },
  marshal_surtash: { melee: 0.6 },
  maw_entire: { melee: 0.4 },
  mirage_dancer: { melee: 0.3, all: 0.85 },
  mirage_khagan: { melee: 0.3, all: 0.5 },
  myconid_warrior: { melee: 0.3 },
  odyssey_beastkin: { melee: 0.35 },
  odyssey_carven: { melee: 0.5 },
  plague_carrier: { melee: 0.55 },
  rootwild_coppice: { melee: 0.7 },
  shadow_self: { all: 0.7 },
  surge_echo: { all: 0.9 },
  the_ashmother: { melee: 0.45 },
  the_magpie_king: { melee: 0.55 },
  tide_vicar: { all: 0.45 },
  transfusion_acolyte: { melee: 0.3, all: 0.5 },
  tundra_behemoth: { all: 0.85 },
  ult_woken_hollow: { melee: 0.65 },
  vampire_countess: { all: 0.8 },
  vent_matron: { all: 0.85 },
};

/** Every monster's dials, defaults included, so a knob can reach any of them. */
export const MONSTER_DAMAGE: Record<string, DamageDial> = Object.fromEntries(
  Object.keys(MONSTERS).map(id => [id, { all: 1, melee: 1, ...MONSTER_DAMAGE_TUNED[id] }]),
);

/** The modifiers a body's dials fold into, none for a dial at 1. */
export function damageDialMods(monsterId: string): Modifier[] {
  const dial = MONSTER_DAMAGE[monsterId];
  if (!dial) return [];
  const out: Modifier[] = [];
  for (const [tag, value] of Object.entries(dial) as [SkillTag | 'all', number][]) {
    if (value === 1 || !Number.isFinite(value)) continue;
    out.push(tag === 'all' ? mod('damage', 'more', value - 1) : mod('damage', 'more', value - 1, [tag]));
  }
  return out;
}

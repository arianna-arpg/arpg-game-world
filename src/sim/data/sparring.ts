// ---------------------------------------------------------------------------
// THE SPARRING PARTNER — the measuring body every kit can express against.
//
// The training dummy is passive, so it answers one question only: what does
// the hero's OWN hand deal to a target that never reacts? Minion AI ignores
// passive scenery, retaliation never fires on a body that never swings, and a
// recent-damage gate never opens. Those kits read zero on the dummy, and a zero
// that comes from the rig is a defect of the instrument, not a balance datum.
//
// The partner is the dummy's sibling (same id prefix, so dps_dummy counts it,
// same huge regenerating pool, same zero defenses) with one difference: it is
// a real threat. It walks up, swings a modest parity claw, draws courts, trips
// retaliation and opens gates. It registers at sim boot only, after the content
// census, and sits in no spawn table, so the game never meets it.
// ---------------------------------------------------------------------------

import { mod } from '../../engine/stats';
import { MONSTERS, type MonsterDef } from '../../data/monsters';

export const SPAR_CFG = {
  /** The partner's id. The 'target_dummy' prefix is load-bearing: the
   *  collector's dps_dummy lane reads the prefix (src/sim/metrics.ts). */
  id: 'target_dummy_spar',
  /** Its swing, a real catalog skill (the parity zombie's). */
  skill: 'claw',
  /** How hard the swing lands relative to the same skill on a parity body.
   *  Gentle on purpose: the lane measures output and opened gates, and a hero
   *  killed in a few seconds has told it very little. */
  damageMore: -0.5,
};

const PARTNERS: Record<string, MonsterDef> = {
  [SPAR_CFG.id]: {
    id: SPAR_CFG.id, name: 'Sparring Partner',
    color: '#c89a60', shape: 'rectangle', radius: 18, material: 'wood', look: 'training_dummy',
    base: { life: 20000, lifeRegen: 1500, moveSpeed: 95, armor: 0, evasion: 0, mana: 0, poise: 0, accuracy: 60 },
    mods: [mod('damage', 'more', SPAR_CFG.damageMore)],
    skills: [SPAR_CFG.skill],
    xp: 0,
    immortal: true,
  },
};

/** Idempotent. Called from bootSimEngine after validateContent. */
export function registerSparringPartners(): void {
  for (const [id, def] of Object.entries(PARTNERS)) MONSTERS[id] ??= def;
}

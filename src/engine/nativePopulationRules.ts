/** Native population tuning and selection, shared by World and retained areas. */
import {rand,randInt} from '../core/math';
import {MONSTERS} from '../data/monsters';
import type {PackArchetype,PackTableEntry} from '../data/zones';
import {presenceTable} from './presence';
// Leveling rebalance: trim per-enemy XP, lift pack count by the inverse, and
// scale count with the (linear) span of the zone so bigger arenas hold more
// foes while NET xp-per-zone — and thus the zones-per-level tempo — holds.
export const XP_SCALE = 0.8;
/** BASELINE per-level monster growth (INCREASED %, applied to EVERY monster as
 *  the `level` source). One global lever; a monster tunes FURTHER per-stat via
 *  its opt-in `scaling` (StatScale). */
export const MONSTER_LEVEL_SCALE: Record<string, number> = {
  life: 0.22, damage: 0.1, accuracy: 0.06, evasion: 0.06,
};
/** A monster's KIT level from its body level (the same ladder the player's
 *  gems climb): one skill level per four body levels. createMonster mints
 *  through it and relevelActor re-levels a living body's kit through it. */
export function monsterSkillLevelOf(level: number): number {
  return 1 + Math.floor((level - 1) / 4);
}
export const COUNT_SCALE = 1.25;        // ≈ 1/XP_SCALE: restores net XP at the reference area
export const REF_AREA = 1900 * 1300;    // the old deepwood footprint — the rebalance anchor
/** PURCHASED-POCKET population knobs (the "never a death trap" contract —
 *  docs/engine/pockets.md). packAreaFloor: the pack-budget area floor (vs the
 *  0.8 every other zone keeps) — a deliberately small hollow holds a genuinely
 *  small guard, and the floor exists so it still holds SOMETHING.
 *  arrivalGrace: the hostile-free ring around the one portal at fresh gen —
 *  the buyer always gets a fair landing. */
export const POCKET_CFG = { packAreaFloor: 0.3, arrivalGrace: 300 };
export const FIELD_PACK_AREA_CAP = 3.0; // Fields scale the enemy budget further with playable space

/** Roll a pack SIZE from a weighted archetype spread (swarm / standard / grazing) — the
 *  per-pack variety lever (PackSpec.archetypes). Uses the same non-seeded rand as the
 *  rest of pack spawning (Zone Memory remembers the result, so determinism isn't needed). */
export function rollPackSize(archs: PackArchetype[]): number {
  let total = 0;
  for (const a of archs) total += a.weight;
  let r = rand(0, total);
  for (const a of archs) { r -= a.weight; if (r <= 0) return randInt(a.size[0], a.size[1]); }
  const last = archs[archs.length - 1];
  return randInt(last.size[0], last.size[1]);
}
/** The pool roll's identity salt (the CAVE_FACE_SALT discipline): the
 *  draw rides its own stream derived off the zone's mint seed — nothing
 *  shared moves, and the answer is a pure function of the def. */
export const CAVE_POOL_SALT = 0xca9e51;
export function nativeWeightedPick(table: readonly PackTableEntry[], atLevel?: number): string {
    const picks = atLevel === undefined ? table
      : presenceTable(table, atLevel, id => MONSTERS[id]?.presence);
    let total = 0;
    for (const e of picks) total += e.weight;
    let roll = rand(0, total);
    for (const e of picks) {
      roll -= e.weight;
      if (roll <= 0) return e.id;
    }
    return picks[picks.length - 1].id;
  }

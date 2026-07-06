// ---------------------------------------------------------------------------
// MONSTER RARITY — the elite tier ladder.
//
// Any spawned pack can be led by an elite: magic → rare → champion → CROWNED.
// Each tier buffs life/damage, grows the body, multiplies xp, drops extra gems,
// and rolls affixes from a shared pool (applied as a 'rarity' StatSheet source).
// CROWNED is the gated apex — a warband champion; slaying one drives the
// Warbands package unlock (see the kill handler + ledger). Pure data + tiny
// helpers over the global RNG; the World applies the result to an Actor.
// ---------------------------------------------------------------------------

import { chance, rand } from '../core/math';
import { mod, type Modifier } from './stats';

export type MonsterRarity = 'normal' | 'magic' | 'rare' | 'champion' | 'crowned';

export interface RarityDef {
  /** Display prefix ('' for normal). */
  label: string;
  /** Selection weight among the non-crowned tiers. */
  weight: number;
  /** Number of affixes rolled. */
  affixes: number;
  lifeMul: number;   // final life multiplier
  dmgMul: number;    // final damage multiplier
  sizeMul: number;   // body-radius scale
  xpMul: number;     // xp-reward multiplier
  /** Guaranteed bonus gem drops on death. */
  drops: number;
  /** Outline-ring colour drawn by the renderer ('' = none). */
  ring: string;
}

export const RARITY_DEFS: Record<MonsterRarity, RarityDef> = {
  // Drops tuned SCARCE alongside DROP_CFG (loot.ts): an elite guarantees a
  // find without burying the floor in gems.
  normal:   { label: '',         weight: 100, affixes: 0, lifeMul: 1,    dmgMul: 1,    sizeMul: 1,    xpMul: 1,  drops: 0, ring: '' },
  magic:    { label: 'Magic',    weight: 22,  affixes: 1, lifeMul: 1.7,  dmgMul: 1.2,  sizeMul: 1.08, xpMul: 2,  drops: 0, ring: '#6c9cff' },
  rare:     { label: 'Rare',     weight: 7,   affixes: 3, lifeMul: 2.8,  dmgMul: 1.45, sizeMul: 1.16, xpMul: 4,  drops: 1, ring: '#ffd34d' },
  champion: { label: 'Champion', weight: 2,   affixes: 4, lifeMul: 4.6,  dmgMul: 1.7,  sizeMul: 1.28, xpMul: 8,  drops: 1, ring: '#ff8a3d' },
  crowned:  { label: 'Crowned',  weight: 0,   affixes: 5, lifeMul: 7.5,  dmgMul: 2.0,  sizeMul: 1.42, xpMul: 14, drops: 2, ring: '#e64db4' },
};

export interface Affix { id: string; label: string; mods: Modifier[]; }

/** Affix pool — each contributes a small set of monster stat mods. */
export const AFFIXES: Affix[] = [
  { id: 'vigorous',   label: 'Vigorous',   mods: [mod('life', 'increased', 0.6)] },
  { id: 'savage',     label: 'Savage',     mods: [mod('damage', 'increased', 0.45)] },
  { id: 'swift',      label: 'Swift',      mods: [mod('moveSpeed', 'increased', 0.35)] },
  { id: 'frenzied',   label: 'Frenzied',   mods: [mod('attackSpeed', 'increased', 0.4), mod('castSpeed', 'increased', 0.4)] },
  { id: 'ironhide',   label: 'Ironhide',   mods: [mod('armor', 'flat', 80)] },
  { id: 'evasive',    label: 'Evasive',    mods: [mod('evasion', 'increased', 1.2)] },
  { id: 'deadeye',    label: 'Deadeye',    mods: [mod('accuracy', 'increased', 0.6), mod('critChance', 'flat', 0.08)] },
  { id: 'brutal',     label: 'Brutal',     mods: [mod('critMulti', 'flat', 0.5)] },
  { id: 'warded',     label: 'Warded',     mods: [mod('fireRes', 'flat', 0.4), mod('coldRes', 'flat', 0.4), mod('lightningRes', 'flat', 0.4)] },
  { id: 'relentless', label: 'Relentless', mods: [mod('detectionRange', 'more', 0.5), mod('moveSpeed', 'increased', 0.2)] },
  // Increased effect DURATION — lengthens this monster's timed effects (skill linger,
  // status DoTs) AND its death-burst: both the coalesce telegraph and the orb's follow
  // time scale by effectDuration (see World.spawnDeathBurst). Most visibly, an Enduring
  // volatile/spore monster's tracking orb lingers and hounds the player longer.
  { id: 'enduring',   label: 'Enduring',   mods: [mod('effectDuration', 'increased', 0.6)] },
];

/** Chance a crowned-eligible pack is led by a Crowned champion. */
const CROWNED_CHANCE = 0.05;

/** Roll a pack-leader rarity. `crownedEligible` (Warbands active) gates the apex. */
export function rollRarity(crownedEligible: boolean): MonsterRarity {
  if (crownedEligible && chance(CROWNED_CHANCE)) return 'crowned';
  const tiers: MonsterRarity[] = ['normal', 'magic', 'rare', 'champion'];
  const total = tiers.reduce((s, t) => s + RARITY_DEFS[t].weight, 0);
  let r = rand(0, total);
  for (const t of tiers) { r -= RARITY_DEFS[t].weight; if (r < 0) return t; }
  return 'normal';
}

/** N distinct affixes from the pool (clamped to pool size). */
export function pickAffixes(n: number): Affix[] {
  const pool = [...AFFIXES];
  const out: Affix[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    out.push(pool.splice(Math.floor(rand(0, pool.length)), 1)[0]);
  }
  return out;
}

/** The full set of stat modifiers a rarity tier contributes (tier buffs +
 *  rolled affixes), for the actor's 'rarity' StatSheet source. */
export function rarityMods(rarity: MonsterRarity): Modifier[] {
  const def = RARITY_DEFS[rarity];
  const mods: Modifier[] = [];
  if (def.lifeMul !== 1) mods.push(mod('life', 'more', def.lifeMul - 1));
  if (def.dmgMul !== 1) mods.push(mod('damage', 'more', def.dmgMul - 1));
  for (const a of pickAffixes(def.affixes)) mods.push(...a.mods);
  return mods;
}

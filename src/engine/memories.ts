// ---------------------------------------------------------------------------
// THE STONE (skill-items charter M2, docs/design/skill-items.md §3/§3b/§4) —
// the ROUGH MEMORY: the gacha acquisition item and its RECALL.
//
// THE UNIT: every drop is one { d: dropperId, s: seed } pair and NOTHING
// else — THE LIVE-REGISTRY MANDATE (walk 2, her mandate): the grant's whole
// weight table re-derives at RECALL time from the standing registries
// (MonsterDef.skills, gemBias, the drop pool, the account's unlocks), never
// a baked table — an unlock-package edit reprices every pouch in the world
// with zero data churn, and a def rebalance retroactively re-leans old
// stones (correctly: the stone remembers WHO, not a frozen table).
//
// THE POUCH: all units share ONE stacking 1×1 bag tile (base 'rough_memory'
// — auto-minted at first pickup, auto-merged ever after, uncapped count).
// Stacking is contained ENTIRELY to this item kind: the units array IS the
// count, gems never stack. The array is append-ordered — FIFO within a
// dropper group falls out of taking the first match.
//
// THE FOREORDAINED CUT: the grant is a pure function of (unit.s) — sealed
// at DROP, revealed at recall, reload-proof (the vendor commission's
// seeded-die precedent). Deterministic GIVEN the account's pool at recall
// time; pool growth is monotone and player-authored, so a later unlock
// changing a later cut is progression, never scum.
//
// THE LEAN LADDER (§4, one rung per stone — strict fallback, never stacked),
// every rung resolving WITHIN the account-unlocked pool (THE UNLOCKED-POOL
// LAW, walk 2 — the pierce idea is dead; noDrop is never crossed):
//   1. KIT — the dropper's MonsterDef.skills ∩ the unlocked skill pool, at
//      the heavy kitMult (the headline promise: kill what you want to learn);
//   2. BIAS — a kit that teaches nothing (THE CLAW PROBLEM) leans the def's
//      gemBias tags at the standing GEM_DROP_CFG.biasMult;
//   3. WIDE — neither: the plain weighted pool over whatever IS unlocked
//      (her explicit fallback).
// Supports never ride the kit rung (kits are skills); they lean by gemBias
// where the def carries one. Cuts WAIVE GEM_DROP_CFG.carriedMult (card 9 —
// duplicates are merge currency now); direct drops keep it. GEM_FLOORS
// never reach a recall (floors are a mint-path lean for the ground the
// player STANDS on; the recall answers to the account alone).
//
// World.recallRoughMemory is the consumer (the pools, the spoils seal, THE
// MINT LAW's noteGemDrop stamp, THE ROOM LAW's refuse-before-consuming all
// live there beside the standing gem lanes); this file is the pure half:
// the unit/item shapes, MEMORY_CFG, the seeded draw, and the rarity lean.
// ---------------------------------------------------------------------------

import { Rng } from '../core/rng';
import { SKILL_RARITIES, type SkillRarity } from './skills';
import type { ItemInstance, RoughMemoryUnit } from './items';
import { nextItemUid } from './itemgen';

/** The pouch's wrapper base id (data/itembases.ts — dropWeight 0, never
 *  gear-rolled; the tile mints only through the kill-path conversion). */
export const ROUGH_MEMORY_BASE = 'rough_memory';

/** Every dial of the Rough Memory economy. ALL NUMBERS ARE DIALS (unblessed
 *  — her standing word: numbers bless through playthroughs). Strings are
 *  data here so iteration never hunts literals. */
export const MEMORY_CFG = {
  /** THE KIT LEAN (§4 rung 1): weight multiplier on the dropper's own
   *  droppable-and-unlocked kit skills. The headline promise should be
   *  FELT — order 5–10×, well above gemBias's 2.5. */
  kitMult: 7,
  /** Rarity lean by provenance (§3 "a boss's stone cuts richer" — the
   *  provenance-pays-twice dial): weight multipliers over the standing
   *  SKILL_RARITIES table when the dropper's DEF is a boss. DEF-grain by
   *  law: units store only { dropperId, seed }, and an actor's rolled
   *  elite tier is not derivable from its def — so only def truths
   *  (boss) may lean, exactly what THE LIVE-REGISTRY MANDATE predicts. */
  bossRarityLean: { common: 1, magic: 1.6, rare: 2.2, legendary: 3 } as Record<SkillRarity, number>,
  /** The pouch's one look color (tile face, drop float, count badge) —
   *  units carry no rarity until recalled, so the stone never borrows the
   *  rarity palette (§3b: provenance speaks in the panel, not the frame). */
  color: '#b89ae0',
  /** THE POUCH CARD's composition depth: dropper groups named before the
   *  tooltip folds to "…and N others" (§12's open dial). */
  tooltipGroups: 4,
  /** The recall's refusal strings (floated at the seat). */
  strings: {
    noRoom: 'no room to hold what returns',
    sealed: 'this ground refuses new spoils',
    noSalvage: 'the rough holds no salvage — recall it or let it lie',
  },
} as const;

// ------------------------------------------------------------- the item ---

export function isRoughMemoryItem(i: ItemInstance): boolean {
  return i.baseId === ROUGH_MEMORY_BASE && i.mem !== undefined;
}

/** The units riding a bag item, or null (a pouch is never empty — the last
 *  recall retires the tile). */
export function memoryUnitsOf(i: ItemInstance): RoughMemoryUnit[] | null {
  return isRoughMemoryItem(i) ? i.mem! : null;
}

/** The standing pouch tile in a bag, if one exists (one tile per kind —
 *  THE POUCH SHAPE: auto-merged, so a bag never grows a second). */
export function findRoughMemoryItem(items: readonly ItemInstance[]): ItemInstance | undefined {
  return items.find(isRoughMemoryItem);
}

/** Mint the pouch tile around one first unit (no cell yet — the caller
 *  places it). Rarity 'common' with no border meaning: units carry no
 *  rarity until recalled (§3b — provenance speaks in the panel, not the
 *  frame). */
export function makeRoughMemoryItem(units: RoughMemoryUnit[]): ItemInstance {
  return {
    uid: nextItemUid(),
    baseId: ROUGH_MEMORY_BASE,
    ilvl: 1, tier: 1,
    rarity: 'common',
    name: 'Rough Memory',
    baseRoll: 0, implicitRolls: [], affixes: [],
    mem: units,
  };
}

/** Append units onto a standing pouch — REPLACING the array (never splicing
 *  in place: saves and the wire shallow-copy items, so an aliased array
 *  mutation could reach a held snapshot; a fresh array cannot). */
export function mergeRoughMemory(pouch: ItemInstance, units: readonly RoughMemoryUnit[]): void {
  pouch.mem = [...(pouch.mem ?? []), ...units];
}

/** The pouch's composition grouped by dropper, FIRST-APPEARANCE order —
 *  the same order the panel lists and FIFO consumes, derived from the one
 *  append-ordered array (no second bookkeeping to drift). */
export function memoryGroups(units: readonly RoughMemoryUnit[]): { d: string; count: number }[] {
  const out: { d: string; count: number }[] = [];
  const at = new Map<string, number>();
  for (const u of units) {
    const i = at.get(u.d);
    if (i === undefined) { at.set(u.d, out.length); out.push({ d: u.d, count: 1 }); }
    else out[i].count++;
  }
  return out;
}

// ------------------------------------------------------------- the view ---
// THE RECALL panel's derived face (§3b) — built by World.memoryRecallView
// at ask time from the standing registries, consumed by the panel. The
// chips restate the EXACT weights the cut will roll (drawn == rolled: one
// derivation, World.memoryLeanOf, serves the roller and the face).

export interface MemoryLeanChip { id: string; name: string; color: string; mult: number }

export interface MemoryRecallGroup {
  /** Dropper def id (may have left the registry — the row degrades wide). */
  d: string;
  name: string;
  count: number;
  rung: 'kit' | 'bias' | 'wide';
  /** kit rung: the dropper's droppable-and-unlocked kit skills as chips. */
  kit: MemoryLeanChip[];
  /** bias rung: the def's gemBias tags (at the standing biasMult). */
  tags: string[];
}

export interface MemoryRecallViewData {
  uid: number;
  total: number;
  /** First-appearance order — the SAME order FIFO consumes. */
  groups: MemoryRecallGroup[];
  /** Standing refusal (sealed ground / no room), or null while recalls arm. */
  refusal: string | null;
}

/** One recall's grant — THE REVEAL's payload (§3b: the row flips to this). */
export interface MemoryRecallResult {
  kind: 'skill' | 'support';
  id: string;
  name: string;
  rarity?: SkillRarity;
  /** The minted bag item — the found-flash's anchor. */
  itemUid: number;
}

// ------------------------------------------------------------- the draw ---

/** One seeded weighted pick over a pool whose weights the CALLER derived
 *  (World.gemWeights — the one drop-policy formula; only the die differs
 *  from the live pickGem). total<=0 falls to pool[0], the pickGem contract. */
export function pickSeeded<T>(pool: readonly T[], weights: readonly number[], rng: Rng): T | null {
  if (pool.length === 0) return null;
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return pool[0];
  let r = rng.next() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Rarity at the cut: the standing SKILL_RARITIES table (54/30/14/2),
 *  seeded, optionally leaned by provenance (boss defs cut richer). Reads
 *  the registry's own weights — never a parallel table. */
export function rollSeededRarity(rng: Rng, lean?: Partial<Record<SkillRarity, number>>): SkillRarity {
  const ids = Object.keys(SKILL_RARITIES) as SkillRarity[];
  const weights = ids.map(id => SKILL_RARITIES[id].weight * (lean?.[id] ?? 1));
  return pickSeeded(ids, weights, rng) ?? 'common';
}

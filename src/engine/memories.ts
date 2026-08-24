// ---------------------------------------------------------------------------
// THE STONE (skill-items charter M2+M3, docs/design/skill-items.md §3/§3b/§4)
// — THE MEMORY FAMILY's gacha pouches and their RECALL:
//   · ROUGH MEMORY (M2, §4 lane 1 THE WILD CUT) — dropper-weighted random;
//   · PREFORMED MEMORY (M3, §4 lane 2 THE TRUED CUT) — the banner lane: a
//     rarer find whose recall interposes THE FACET choice (three triad
//     cards, walk-2 ruled) and rolls SKILLS ONLY from the chosen triad's
//     requirement partition (supports carry no attributes).
//
// THE UNIT: every drop is one { d: dropperId, s: seed } pair and NOTHING
// else — THE LIVE-REGISTRY MANDATE (walk 2, her mandate): the grant's whole
// weight table re-derives at RECALL time from the standing registries
// (MonsterDef.skills, gemBias, ATTRIBUTE_TRIADS, the drop pool, the
// account's unlocks), never a baked table — an unlock-package edit reprices
// every pouch in the world with zero data churn, and a def rebalance
// retroactively re-leans old stones (correctly: the stone remembers WHO,
// not a frozen table).
//
// THE POUCH: each KIND's units share ONE stacking 1×1 bag tile (bases
// 'rough_memory' / 'preformed_memory' — auto-minted at first pickup,
// auto-merged ever after, uncapped count; one tile PER KIND, never a
// second of the same kind). Stacking is contained ENTIRELY to this family:
// the units array IS the count, gems never stack. The array is
// append-ordered — FIFO within a dropper group falls out of taking the
// first match.
//
// THE FOREORDAINED CUT: the grant is a pure function of (unit.s) — sealed
// at DROP, revealed at recall, reload-proof (the vendor commission's
// seeded-die precedent). THE TRUED CUT forks a SUBSTREAM per facet off the
// one sealed seed (facetRng — outcome = f(unit.seed, chosen facet)), so
// each facet's would-be grant is equally foreordained. Deterministic GIVEN
// the account's pool at recall time; pool growth is monotone and
// player-authored, so a later unlock changing a later cut is progression,
// never scum.
//
// THE LEAN LADDER (§4, the WILD cut — strict fallback, never stacked),
// every rung resolving WITHIN the account-unlocked pool (THE UNLOCKED-POOL
// LAW, walk 2 — the pierce idea is dead; noDrop is never crossed):
//   1. KIT — the dropper's MonsterDef.skills ∩ the unlocked skill pool, at
//      the heavy kitMult (the headline promise: kill what you want to learn);
//   2. BIAS — a kit that teaches nothing (THE CLAW PROBLEM) leans the def's
//      gemBias tags at the standing GEM_DROP_CFG.biasMult;
//   3. WIDE — neither: the plain weighted pool over whatever IS unlocked
//      (her explicit fallback).
// THE TRUED cut replaces the ladder whole: its lean IS the facet — the
// partition of the unlocked pool whose requirements name the chosen
// triad's attributes, falling back to the whole unlocked pool when the
// partition is empty (THE UNLOCKED-POOL LAW's own fallback, her rule).
// Supports never ride the kit rung (kits are skills); they lean by gemBias
// where the def carries one — and never ride the TRUED cut at all. Cuts
// WAIVE GEM_DROP_CFG.carriedMult (card 9 — duplicates are merge currency
// now); direct drops keep it. GEM_FLOORS never reach a recall (floors are
// a mint-path lean for the ground the player STANDS on; the recall answers
// to the account alone).
//
// World.recallMemory is the consumer (the pools, the spoils seal, THE
// MINT LAW's noteGemDrop stamp, THE ROOM LAW's refuse-before-consuming all
// live there beside the standing gem lanes); this file is the pure half:
// the unit/item shapes, the KIND registry, MEMORY_CFG, the facet
// derivation, the seeded draw, and the rarity lean.
// ---------------------------------------------------------------------------

import { Rng } from '../core/rng';
import { SKILL_RARITIES, type SkillRarity } from './skills';
import { ATTRIBUTES, ATTRIBUTE_TRIADS, type AttributeId } from './stats';
import type { ItemInstance, RoughMemoryUnit } from './items';
import { nextItemUid } from './itemgen';

/** The pouch kinds — the gacha ladder's two stacking items (§3, walk-1
 *  ruled names). 'rough' = the wild lane; 'preformed' = the banner lane. */
export type MemoryKind = 'rough' | 'preformed';

export interface MemoryKindDef {
  /** The wrapper base id (data/itembases.ts — dropWeight 0, never
   *  gear-rolled; tiles mint only through the kill-path conversion and the
   *  counter's shelf). */
  base: string;
  /** The player-facing name (walk-1: the Memory family grammar). */
  name: string;
  /** The kind's one look color (tile face, drop float, count badge, panel
   *  header) — units carry no rarity until recalled, so a stone never
   *  borrows the rarity palette (§3b). */
  color: string;
  /** The tile face's glyph (the bag + the counter glass draw it). */
  glyph: string;
  /** THE FACET choice interposes at the recall (the banner lane): the cut
   *  is SKILLS-ONLY and rolls the chosen triad's requirement partition. */
  facets: boolean;
}

export const MEMORY_KINDS: Record<MemoryKind, MemoryKindDef> = {
  rough: {
    base: 'rough_memory', name: 'Rough Memory',
    color: '#b89ae0', glyph: '✦', facets: false,
  },
  preformed: {
    base: 'preformed_memory', name: 'Preformed Memory',
    color: '#e8c07a', glyph: '❖', facets: true,
  },
};

export const MEMORY_KIND_IDS = Object.keys(MEMORY_KINDS) as MemoryKind[];

/** Kept exported for the M2 seams (probe + prose): the rough base id. */
export const ROUGH_MEMORY_BASE = MEMORY_KINDS.rough.base;

/** THE TRADED PROVENANCE (M3, the one-shelf counter): units minted onto a
 *  vendor's shelf carry this dropper id — no monster forged them, so the
 *  wild lean degrades to the wide pool BY CONSTRUCTION (memoryLeanOf of an
 *  unregistered def) and the recall panel names the trade honestly. The
 *  banner lane's facet choice is untouched (the facet never read the
 *  dropper). */
export const MEMORY_TRADED_PROVENANCE = 'traded';

/** Every dial of the Memory economy. ALL NUMBERS ARE DIALS (unblessed —
 *  her standing word: numbers bless through playthroughs). Strings are
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
   *  (boss) may lean, exactly what THE LIVE-REGISTRY MANDATE predicts.
   *  Both kinds read it (the banner's provenance pays the same). */
  bossRarityLean: { common: 1, magic: 1.6, rare: 2.2, legendary: 3 } as Record<SkillRarity, number>,
  /** THE POUCH CARD's composition depth: dropper groups named before the
   *  tooltip folds to "…and N others" (§12's open dial). */
  tooltipGroups: 4,
  /** The recall's refusal strings (floated at the seat). */
  strings: {
    noRoom: 'no room to hold what returns',
    sealed: 'this ground refuses new spoils',
    noSalvage: 'the rough holds no salvage — recall it or let it lie',
    noFacet: 'commit to a facet first',
    /** The recall panel's display name for MEMORY_TRADED_PROVENANCE rows. */
    tradedName: 'Traded stock',
  },
} as const;

// ------------------------------------------------------------- the item ---

/** The pouch KIND a bag item is, or null (base id + units present). */
export function memoryKindOf(i: ItemInstance): MemoryKind | null {
  if (i.mem === undefined) return null;
  for (const k of MEMORY_KIND_IDS) if (MEMORY_KINDS[k].base === i.baseId) return k;
  return null;
}

export function isMemoryItem(i: ItemInstance): boolean {
  return memoryKindOf(i) !== null;
}

/** The units riding a bag item, or null (a pouch is never empty — the last
 *  recall retires the tile). */
export function memoryUnitsOf(i: ItemInstance): RoughMemoryUnit[] | null {
  return isMemoryItem(i) ? i.mem! : null;
}

/** The standing pouch tile OF A KIND in a bag, if one exists (one tile per
 *  kind — THE POUCH SHAPE: auto-merged, so a bag never grows a second of
 *  the same kind; the two kinds stand side by side). */
export function findMemoryItem(items: readonly ItemInstance[], kind: MemoryKind): ItemInstance | undefined {
  return items.find(i => i.mem !== undefined && i.baseId === MEMORY_KINDS[kind].base);
}

/** Mint a pouch tile around its first units (no cell yet — the caller
 *  places it). Rarity 'common' with no border meaning: units carry no
 *  rarity until recalled (§3b — provenance speaks in the panel, not the
 *  frame). */
export function makeMemoryItem(kind: MemoryKind, units: RoughMemoryUnit[]): ItemInstance {
  const def = MEMORY_KINDS[kind];
  return {
    uid: nextItemUid(),
    baseId: def.base,
    ilvl: 1, tier: 1,
    rarity: 'common',
    name: def.name,
    baseRoll: 0, implicitRolls: [], affixes: [],
    mem: units,
  };
}

/** The M2 spelling, kept for its standing seams: a ROUGH pouch. */
export function makeRoughMemoryItem(units: RoughMemoryUnit[]): ItemInstance {
  return makeMemoryItem('rough', units);
}

/** Append units onto a standing pouch — REPLACING the array (never splicing
 *  in place: saves and the wire shallow-copy items, so an aliased array
 *  mutation could reach a held snapshot; a fresh array cannot). */
export function mergeMemory(pouch: ItemInstance, units: readonly RoughMemoryUnit[]): void {
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

// ------------------------------------------------------------ the facets ---
// THE FACET (M3, §4 lane 2 — walk-2 ruled: the triad grain, and the cards
// double as attribute teaching). Derived LIVE from the attribute registry's
// own triads (engine/stats.ts ATTRIBUTE_TRIADS) — never a hardcoded list.

export interface MemoryFacet {
  /** The facet's stable id — the triad's lead (force) attribute id. */
  id: AttributeId;
  /** The card's title — the lead attribute's label ("Strength"). */
  label: string;
  /** The triad whole, for the card's teaching face (name + short each). */
  attrs: { id: AttributeId; label: string; short: string }[];
}

/** The three facet cards, derived from the registry at ask time. */
export function memoryFacets(): MemoryFacet[] {
  return ATTRIBUTE_TRIADS.map(t => ({
    id: t.lead,
    label: ATTRIBUTES[t.lead].label,
    attrs: t.members.map(id => ({ id, label: ATTRIBUTES[id].label, short: ATTRIBUTES[id].short })),
  }));
}

/** The chosen facet's attribute set, or null for an unknown facet id (the
 *  intent lane validates through this — a stale/foreign facet refuses). */
export function memoryFacetAttrs(facet: string): AttributeId[] | null {
  const t = ATTRIBUTE_TRIADS.find(x => x.lead === facet);
  return t ? [...t.members] : null;
}

/** THE TRUED CUT's substream: outcome = f(unit.seed, chosen facet) — each
 *  facet forks its own deterministic stream off the ONE sealed seed, so
 *  every facet's would-be grant is equally foreordained and reload-proof. */
export function facetRng(seed: number, facet: string): Rng {
  return new Rng((seed ^ hashStr(`facet:${facet}`)) >>> 0);
}

/** FNV-1a over a string (the repo's module-local hash idiom). */
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ------------------------------------------------------------- the view ---
// THE RECALL panel's derived face (§3b) — built by World.memoryRecallView
// at ask time from the standing registries, consumed by the panel. The
// chips restate the EXACT weights the cut will roll (drawn == rolled: one
// derivation, World.memoryLeanOf, serves the roller and the face). A
// PREFORMED view carries no chips — the facet cards ARE its odds face
// (the panel derives them from memoryFacets(), the same fold the cut
// rolls).

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
  /** Which pouch this is — the panel keys its face (name, color, the facet
   *  strip) off the kind. */
  kind: MemoryKind;
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

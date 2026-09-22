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
// THE MEMORY LAW (2026-09-12, her ruling — "skill and support drops happen
// as the memories rather than the explicit skill and support drops"): a gem
// that DROPS arrives as a Memory; a gem arrives NAMED only where it is
// OFFERED — the counter's shelf, the bounty board's card, the class kit, a
// recall. World.dropGemAt is the ONE chokepoint every drop lane already
// rides (the kill trickle, per-def counts, boss guarantees, elite spills,
// loot-table 'gem' payouts, event/objective/breakable payouts, quest pay,
// the Bonewright's built spoils), so the law is one policy read there —
// GEM_DROP_CFG.memoryShare (1 = the law whole; the remainder falls as the
// pre-law bare gem) — decided per mint OFF THE SEALED SEED (memoryFormOf:
// a hash-derived uniform, ZERO extra draws — THE STREAM LAW now holds at
// every lane, not only the trickle; the preformed split rides the same
// seed through memoryKindForSeed). THE EVENT FACTS a unit may carry beside
// { d, s } (items.ts RoughMemoryUnit): `e` the dropper's rolled elite tier
// (tierRarityLean composes with the boss lean — provenance pays), `t` the
// tileset it fell on where that country floors gems (THE GROUND — the
// recall reads GEM_FLOORS for the ground the unit was FOUND on, so the
// scald's "found here before it is owned" survives the memory form), `g`
// THE PROMISE (a pinned exact grant: the recall mints that very gem — a
// boss's specific spoil stays specific, it just arrives as a stone; pins
// always ride ROUGH pouches, the banner's facet law never applies to a
// promise). Pinned units group APART from their dropper's wild units
// (memoryGroupKey — the recall intent addresses a GROUP KEY, which for an
// unpinned unit is the bare dropper id, so every old caller still speaks).
//
// World.recallMemory is the consumer (the pools, the spoils seal, THE
// MINT LAW's noteGemDrop stamp, THE ROOM LAW's refuse-before-consuming all
// live there beside the standing gem lanes); this file is the pure half:
// the unit/item shapes, the KIND registry, MEMORY_CFG, the facet
// derivation, the seeded draw, the seed lanes, and the rarity lean.
// ---------------------------------------------------------------------------

import { Rng } from '../core/rng';
import { SKILL_RARITIES, type SkillRarity } from './skills';
import { ATTRIBUTES, ATTRIBUTE_TRIADS, type AttributeId } from './stats';
import type { ItemInstance, MemoryPin, RoughMemoryUnit } from './items';
import type { MonsterRarity } from './rarity';
import { nextItemUid } from './itemgen';

/** THE PROMISE's shape lives with the unit (items.ts); the fabric's
 *  consumers read it from here. */
export type { MemoryPin } from './items';

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
/** Non-creature provenance remains explicit without forging a monster
 *  identity — the registered PROVENANCE WORDS a drop lane may seal into a
 *  unit in place of a dropper def id (the recall panel names them through
 *  this table; an unregistered word prints raw). 'found' is the default
 *  every unforged drop wears (MEMORY_CFG.foundProvenance); 'chest' rides
 *  the container lane's LootCtx.sourceId; 'quest' is a writ's owed pay. */
export const MEMORY_FOUND_SOURCES: Record<string, string> = {
  chest: 'Chest', found: 'Found in the world', quest: 'Quest pay',
};

/** THE PROVENANCE a drop lane hands dropGemAt: WHO forged the drop (a def
 *  id or a registered word) and — an event fact the def cannot recover —
 *  the body's rolled ELITE tier. A bare string reads as { d }. */
export interface MemoryProvenance { d: string; e?: MonsterRarity }

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
  /** THE TIER LEAN (THE MEMORY LAW — "rarity-lean per provenance tier", the
   *  charter's §12 open dial, now a row): weight multipliers over the
   *  standing rarity table by the dropper's rolled ELITE tier (the unit's
   *  `e` event fact — DEF-grain can't say what the body rolled, so the
   *  drop seals it). Composes MULTIPLICATIVELY with bossRarityLean (a
   *  crowned boss's stone cuts richest). Missing tiers read neutral; magic
   *  and rare stand neutral here on purpose (their spill count already pays
   *  — RARITY_DEFS.drops), the leader tiers lean. DIALS, unblessed. */
  tierRarityLean: {
    champion: { common: 1, magic: 1.25, rare: 1.5, legendary: 1.75 },
    crowned:  { common: 1, magic: 1.5,  rare: 2,   legendary: 2.5 },
  } as Partial<Record<MonsterRarity, Record<SkillRarity, number>>>,
  /** THE FOUND WORD: the provenance every drop lane no body forged wears
   *  (events, breakables, puzzles, encounter chests without a source) — a
   *  MEMORY_FOUND_SOURCES key, so the panel names it. */
  foundProvenance: 'found',
  /** THE COUNTER'S BUY-BACK (the QoL pass, 2026-09-12): a pouch SELLS at
   *  the scrap counter — the whole stack in one blow, per-unit coarse
   *  (data/essences.ts SELL_CFG.memoryUnit) — while the bench still refuses
   *  it (potential is not steel to study). `confirmFrom` = the stack size
   *  from which the panel interposes THE SALE PROMPT (Settings.
   *  confirmMemorySale stands it down; the prompt's own checkbox writes
   *  that setting). Single units sell on the plain click. */
  sell: { confirmFrom: 2 },
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
    /** THE PROMISE's row words: the chip that names the sealed grant. */
    pinned: 'sealed to',
    /** The counter's receipt on a pouch sale ("{n} memories sold"). */
    sold: 'memories sold',
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

/** THE GROUP KEY: the address a recall names — the bare dropper id for a
 *  wild unit (every pre-law caller's own spelling), the dropper id plus the
 *  promised gem for a PINNED one, so a boss's sealed spoil stands as its own
 *  row beside that boss's wild stones and the player chooses which to
 *  recall. FIFO runs WITHIN the key. */
export function memoryGroupKey(u: RoughMemoryUnit): string {
  return u.g ? `${u.d}|${u.g.k}:${u.g.id}` : u.d;
}

export interface MemoryGroup {
  /** The recall address (memoryGroupKey). */
  key: string;
  /** The dropper def id / provenance word (portraits, names, the lean). */
  d: string;
  count: number;
  /** THE PROMISE the group's units carry (all units of a key share it). */
  pin?: MemoryPin;
}

/** The pouch's composition grouped by GROUP KEY, FIRST-APPEARANCE order —
 *  the same order the panel lists and FIFO consumes, derived from the one
 *  append-ordered array (no second bookkeeping to drift). */
export function memoryGroups(units: readonly RoughMemoryUnit[]): MemoryGroup[] {
  const out: MemoryGroup[] = [];
  const at = new Map<string, number>();
  for (const u of units) {
    const key = memoryGroupKey(u);
    const i = at.get(key);
    if (i === undefined) {
      at.set(key, out.length);
      out.push({ key, d: u.d, count: 1, ...(u.g ? { pin: u.g } : {}) });
    } else out[i].count++;
  }
  return out;
}

// -------------------------------------------------------- the seed lanes ---
// THE STREAM LAW at every lane: the drop's FORM (memory or bare gem) and a
// memory's KIND (rough or preformed) are pure functions of the sealed seed
// — a salted mulberry step off it, decorrelated from the recall's own Rng
// (which starts from the raw seed) — so no lane spends a global draw on
// either decision, and the seeded sim is byte-identical whatever the dials
// say (probe_memories rig I, extended to fractional shares).

/** A uniform in [0,1) derived from (seed, lane word) — the ONE mixing step
 *  both lane reads share. */
export function seedLaneFrac(seed: number, lane: string): number {
  return new Rng((seed ^ hashStr(`lane:${lane}`)) >>> 0).next();
}

/** THE MEMORY LAW's form read: does a drop sealed around `seed` arrive as a
 *  Memory (true) or as the pre-law bare gem (false), at `share` (GEM_DROP_CFG
 *  .memoryShare — 1 = every drop, 0 = the pre-law world, fractions split
 *  deterministically per seed)? */
export function memoryFormOf(seed: number, share: number): boolean {
  if (share >= 1) return true;
  if (share <= 0) return false;
  return seedLaneFrac(seed, 'form') < share;
}

/** THE TRUED CUT's split read: the pouch KIND a memory sealed around `seed`
 *  takes at `preformedShare` (GEM_DROP_CFG.preformedShare). */
export function memoryKindForSeed(seed: number, preformedShare: number): MemoryKind {
  if (preformedShare >= 1) return 'preformed';
  if (preformedShare <= 0) return 'rough';
  return seedLaneFrac(seed, 'kind') < preformedShare ? 'preformed' : 'rough';
}

/** THE PROVENANCE LEAN over the standing rarity table for one unit: the
 *  boss lean (a DEF truth) × the tier lean (the unit's sealed `e` event
 *  fact), multiplied per rarity; null when neither applies (the plain
 *  table). ONE fold — the cut rolls it, the probe reads it. */
export function memoryRarityLean(boss: boolean, tier?: MonsterRarity): Partial<Record<SkillRarity, number>> | null {
  const tierLean = tier ? MEMORY_CFG.tierRarityLean[tier] : undefined;
  if (!boss && !tierLean) return null;
  const out: Partial<Record<SkillRarity, number>> = {};
  for (const id of Object.keys(SKILL_RARITIES) as SkillRarity[]) {
    out[id] = (boss ? MEMORY_CFG.bossRarityLean[id] : 1) * (tierLean?.[id] ?? 1);
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
  /** The recall ADDRESS (memoryGroupKey) — what the intent names. */
  key: string;
  /** Dropper def id (may have left the registry — the row degrades wide). */
  d: string;
  name: string;
  count: number;
  /** 'pinned' = THE PROMISE: the row's units all recall to ONE sealed gem. */
  rung: 'kit' | 'bias' | 'wide' | 'pinned';
  /** kit rung: the dropper's droppable-and-unlocked kit skills as chips. */
  kit: MemoryLeanChip[];
  /** bias rung: the def's gemBias tags (at the standing biasMult). */
  tags: string[];
  /** pinned rung: the sealed grant's face (name/color/rarity where pinned). */
  pin?: { kind: 'skill' | 'support'; id: string; name: string; color: string; rarity?: SkillRarity };
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
export function rollSeededRarity(rng: Rng, lean?: Partial<Record<SkillRarity, number>>, ceiling?: SkillRarity): SkillRarity {
  const all = Object.keys(SKILL_RARITIES) as SkillRarity[];
  const ids = ceiling ? all.slice(0, all.indexOf(ceiling) + 1) : all;
  const weights = ids.map(id => SKILL_RARITIES[id].weight * (lean?.[id] ?? 1));
  return pickSeeded(ids, weights, rng) ?? 'common';
}

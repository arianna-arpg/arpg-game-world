// ---------------------------------------------------------------------------
// ITEM GENERATOR — the one roller every drop source shares.
//
// Composes the schema (items.ts) with the data registries (itembases /
// itemaffixes / uniques) exactly the way world.ts composes skills: data files
// import types, this file imports data, nothing cycles. Monsters, chests,
// vendors, quest rewards, and the corpse reclaim all mint through rollItem()
// with the same context {ilvl, rng} — a boss "drops better" only by what its
// loot table PASSES here, never by a special code path.
//
// Performance shape: the roller is called in kill bursts, so the hot lookups
// are precomputed/cached — droppable bases per category, and each base's
// eligible prefix/suffix pools (keyed by base id; base tags are static data).
// Tier eligibility is a handful of comparisons per family at roll time.
//
// Instances store 0..1 ROLLS, never final values: compileItemMods() derives
// live Modifiers on equip and describeItem() derives tooltip lines, so a
// data retune re-prices every item ever dropped (saves stay tiny and the
// economy stays patchable).
// ---------------------------------------------------------------------------

import { ITEM_AFFIXES, ITEM_AFFIX_LIST } from '../data/itemaffixes';
import { ITEM_BASES } from '../data/itembases';
import { UNIQUES, UNIQUE_LIST } from '../data/uniques';
import { epitaphFor, VESTIGES, type VestigeLine } from '../data/vestiges';
import {
  DEFENSE_KINDS, DEFENSE_LABEL_BY_STAT, ITEM_CFG, ITEM_RARITIES, ITEM_RARITY_IDS,
  baseBonusFor, defenseBudget, formatModLine, formatStatValue, lerpRange,
  levelReqForTier, roundStatValue, slotsForCategory, socketCap, statLabel,
  tierForIlvl, tieredBaseName,
  type AffixDef, type AffixKind, type AffixRollState, type AffixTierDef,
  type ItemBaseDef, type ItemCategory, type ItemInstance, type ItemRarity,
  type ModLineDef, type RangedLineDef, type UniqueDef,
} from './items';
import { STAT_DEFS, isAttributeId, type Modifier } from './stats';

type RngFn = () => number;

// ------------------------------------------------------------------ uids ---

let uidCounter = 1;

export function nextItemUid(): number {
  return uidCounter++;
}

/** Keep freshly-minted uids above everything a save restored. */
export function bumpItemUidFloor(seen: number): void {
  if (Number.isFinite(seen) && seen >= uidCounter) uidCounter = Math.floor(seen) + 1;
}

// ----------------------------------------------------------------- pools ---

function pickWeighted<T extends { weight: number }>(arr: readonly T[], rng: RngFn): T | null {
  let total = 0;
  for (const e of arr) total += Math.max(0, e.weight);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const e of arr) {
    r -= Math.max(0, e.weight);
    if (r <= 0) return e;
  }
  return arr[arr.length - 1] ?? null;
}

/** Droppable bases: weight > 0 AND the category has an ENABLED slot — a
 *  future category's bases stay dormant until its slot flips on. */
function droppableBases(): ItemBaseDef[] {
  return Object.values(ITEM_BASES).filter(
    b => b.dropWeight > 0 && slotsForCategory(b.category).length > 0,
  );
}

function basePool(ilvl: number, category?: ItemCategory): ItemBaseDef[] {
  return droppableBases().filter(b =>
    (category === undefined || b.category === category) &&
    (b.minIlvl === undefined || ilvl >= b.minIlvl));
}

/** MONSTER-INFREQUENT pool: bases tagged mi_<theme>. Deliberately IGNORES
 *  dropWeight (theme bases sit at 0 to stay out of the world pool) — the
 *  theme itself is the gate; picks are uniform within it. */
export function pickThemedBase(theme: string, ilvl: number, rng: () => number = Math.random): string | null {
  const tag = `mi_${theme}`;
  const pool = Object.values(ITEM_BASES).filter(b =>
    b.tags.includes(tag) && (b.minIlvl === undefined || ilvl >= b.minIlvl)
    && slotsForCategory(b.category).length > 0);
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)].id;
}

const affixPoolCache = new Map<string, { prefix: AffixDef[]; suffix: AffixDef[] }>();

/** The prefix/suffix families this base can roll (tag-gated), cached. */
export function affixPoolsFor(base: ItemBaseDef): { prefix: AffixDef[]; suffix: AffixDef[] } {
  let pools = affixPoolCache.get(base.id);
  if (pools) return pools;
  const baseTags = new Set([...base.tags, base.category]);
  const fits = (a: AffixDef): boolean =>
    (!a.tags || a.tags.some(t => baseTags.has(t))) &&
    (!a.excludeTags || !a.excludeTags.some(t => baseTags.has(t)));
  pools = {
    prefix: ITEM_AFFIX_LIST.filter(a => a.kind === 'prefix' && fits(a)),
    suffix: ITEM_AFFIX_LIST.filter(a => a.kind === 'suffix' && fits(a)),
  };
  affixPoolCache.set(base.id, pools);
  return pools;
}

// -------------------------------------------------------- tier selection ---

interface EligibleTier { index: number; def: AffixTierDef; }

function eligibleTiers(def: AffixDef, ilvl: number, rarity: ItemRarity): EligibleTier[] {
  const out: EligibleTier[] = [];
  for (let i = 0; i < def.tiers.length; i++) {
    const t = def.tiers[i];
    if (t.ilvl > ilvl) continue;
    if (t.magicOnly && rarity !== 'magic') continue;
    out.push({ index: i, def: t });
  }
  return out; // best-first, mirroring def.tiers
}

/** Weighted tier pick. Rares multiply each step DOWN the eligible ladder by
 *  an ilvl-shrinking bias (deep rares roll top-heavy); magic items pull
 *  toward an eligible EXQUISITE tier — and may OVERROLL: reach tiers ABOVE
 *  the item-level gate (ITEM_CFG.magic.overroll), the surprise that keeps a
 *  low blue interesting. Overroll extends WITHIN an already-pickable family;
 *  families whose every tier gates above the ilvl stay out of the pool. */
function pickTier(def: AffixDef, ilvl: number, rarity: ItemRarity, rng: RngFn): number | null {
  const elig = eligibleTiers(def, ilvl, rarity);
  if (elig.length === 0) return null;
  const topIlvl = ITEM_CFG.tierBreaks[ITEM_CFG.tierBreaks.length - 1];
  const t = Math.max(0, Math.min(1, ilvl / topIlvl));
  const bias = ITEM_CFG.rare.tierBias.low + (ITEM_CFG.rare.tierBias.high - ITEM_CFG.rare.tierBias.low) * t;
  const weighted = elig.map((e, rank) => ({
    e,
    weight: e.def.weight
      * (rarity === 'rare' ? Math.pow(bias, rank) : 1)
      * (e.def.magicOnly ? ITEM_CFG.magic.exquisiteWeightMult : 1),
  }));
  const over = ITEM_CFG.magic.overroll;
  if (rarity === 'magic' && over.chance > 0 && rng() < over.chance) {
    // Walk UP from the best normally-eligible tier (tiers are best-first).
    const bestElig = elig[0].index;
    for (let step = 1; step <= over.maxSteps; step++) {
      const idx = bestElig - step;
      if (idx < 0) break;
      const above = def.tiers[idx];
      if (above.magicOnly && !over.canReachExquisite) continue;
      weighted.push({
        e: { index: idx, def: above },
        weight: above.weight * Math.pow(over.stepDecay, step),
      });
    }
  }
  return pickWeighted(weighted, rng)?.e.index ?? null;
}

// ----------------------------------------------------------- affix rolls ---

function rollLineSet(count: number, rng: RngFn): number[] {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) rolls.push(rng());
  return rolls;
}

/** The base's affinity multiplier for a family: the PRODUCT of its theme
 *  matches (a caster+sustain family on a caster:2×sustain:1.5 base = 3×).
 *  Themeless families and affinity-less bases are neutral (×1). */
function affinityMult(base: ItemBaseDef, def: AffixDef): number {
  if (!base.affinity || !def.themes) return 1;
  let mult = 1;
  for (const t of def.themes) mult *= base.affinity[t] ?? 1;
  return mult;
}

function rollOneAffix(
  base: ItemBaseDef, pool: AffixDef[], used: Set<string>, ilvl: number, rarity: ItemRarity, rng: RngFn,
): AffixRollState | null {
  const open = pool
    .filter(a => !used.has(a.family) && eligibleTiers(a, ilvl, rarity).length > 0)
    .map(a => ({ a, weight: a.weight * affinityMult(base, a) }));
  const def = pickWeighted(open, rng)?.a;
  if (!def) return null;
  const tier = pickTier(def, ilvl, rarity, rng);
  if (tier === null) return null;
  used.add(def.family);
  const rolls = rollLineSet(def.lines.length, rng);
  for (let i = 1; i < def.lines.length; i++) if (def.lines[i].sharedRoll) rolls[i] = rolls[0];
  return { id: def.id, tier, rolls };
}

function rollAffixSet(base: ItemBaseDef, ilvl: number, rarity: ItemRarity, rng: RngFn): AffixRollState[] {
  const caps = ITEM_CFG.affixSlots[rarity];
  if (caps.prefixes + caps.suffixes === 0) return [];
  let nPre = 0;
  let nSuf = 0;
  if (rarity === 'magic') {
    if (rng() < ITEM_CFG.magic.bothChance) { nPre = 1; nSuf = 1; }
    else if (rng() < 0.5) nPre = 1;
    else nSuf = 1;
  } else {
    const total = Math.min(
      caps.prefixes + caps.suffixes,
      pickWeighted(ITEM_CFG.rare.countWeights, rng)?.count ?? ITEM_CFG.rare.countWeights[0].count,
    );
    for (let i = 0; i < total; i++) {
      const preOpen = caps.prefixes - nPre;
      const sufOpen = caps.suffixes - nSuf;
      if (preOpen <= 0 && sufOpen <= 0) break;
      if (rng() * (preOpen + sufOpen) < preOpen) nPre++;
      else nSuf++;
    }
  }
  const pools = affixPoolsFor(base);
  const used = new Set<string>();
  const out: AffixRollState[] = [];
  for (let i = 0; i < nPre; i++) {
    const a = rollOneAffix(base, pools.prefix, used, ilvl, rarity, rng);
    if (a) out.push(a);
  }
  for (let i = 0; i < nSuf; i++) {
    const a = rollOneAffix(base, pools.suffix, used, ilvl, rarity, rng);
    if (a) out.push(a);
  }
  return out;
}

/** Guarantee ONE affix from `family` on a magic/rare affix set — the
 *  themed-drop lever behind RollItemOpts.withFamily. Respects everything the
 *  organic roll respects: the base's tag gate (a family that cannot roll on
 *  this base is skipped silently — never bent), family dedup (an item that
 *  already carries the family is done), ilvl-eligible tiers, and the
 *  rarity's prefix/suffix caps — when the set is full on that kind, the
 *  forced line replaces one rolled sibling of the kind. */
function forceFamilyAffix(
  base: ItemBaseDef, affixes: AffixRollState[], family: string,
  ilvl: number, rarity: ItemRarity, rng: RngFn,
): void {
  if (affixes.some(a => ITEM_AFFIXES[a.id]?.family === family)) return;
  const pools = affixPoolsFor(base);
  const def = pools.prefix.find(a => a.family === family)
    ?? pools.suffix.find(a => a.family === family);
  if (!def) return;
  const tier = pickTier(def, ilvl, rarity, rng);
  if (tier === null) return;
  const caps = ITEM_CFG.affixSlots[rarity];
  const cap = def.kind === 'prefix' ? caps.prefixes : caps.suffixes;
  const sameKind = affixes.filter(a => ITEM_AFFIXES[a.id]?.kind === def.kind);
  if (cap > 0 && sameKind.length >= cap) {
    const evict = sameKind[Math.floor(rng() * sameKind.length)];
    affixes.splice(affixes.indexOf(evict), 1);
  }
  const rolls = rollLineSet(def.lines.length, rng);
  for (let i = 1; i < def.lines.length; i++) if (def.lines[i].sharedRoll) rolls[i] = rolls[0];
  affixes.push({ id: def.id, tier, rolls });
}

// ---------------------------------------------------------------- naming ---

function affixName(a: AffixRollState): string {
  const def = ITEM_AFFIXES[a.id];
  if (!def) return '';
  return def.names[Math.min(a.tier, def.names.length - 1)] ?? '';
}

function mintName(
  base: ItemBaseDef, tier: number, rarity: ItemRarity,
  affixes: AffixRollState[], unique: UniqueDef | undefined,
  superior: boolean, rng: RngFn,
): string {
  const tiered = tieredBaseName(base, tier);
  if (unique) return unique.name;
  if (rarity === 'common') return (superior ? 'Superior ' : '') + tiered;
  if (rarity === 'magic') {
    const pre = affixes.find(a => ITEM_AFFIXES[a.id]?.kind === 'prefix');
    const suf = affixes.find(a => ITEM_AFFIXES[a.id]?.kind === 'suffix');
    return [pre ? affixName(pre) : '', tiered, suf ? affixName(suf) : '']
      .filter(Boolean).join(' ');
  }
  const names = ITEM_CFG.rareNames;
  return names.first[Math.floor(rng() * names.first.length)]
    + names.second[Math.floor(rng() * names.second.length)];
}

// ---------------------------------------------------------------- roller ---

export interface RollItemOpts {
  ilvl: number;
  rng?: RngFn;
  /** Force a rarity (loot-table entries); otherwise weighted by config. */
  rarity?: ItemRarity;
  /** Constrain the base pool to one category. */
  category?: ItemCategory;
  /** Force an exact base family. */
  baseId?: string;
  /** Force an exact unique (implies rarity 'unique' and its base). */
  uniqueId?: string;
  /** Per-call rarity weight overrides layered over ITEM_CFG.rarityWeights. */
  rarityWeights?: Partial<Record<ItemRarity, number>>;
  /** Guarantee ONE affix from this FAMILY (AffixDef.family) on the minted
   *  item — the THEMED-DROP lever (a royal-jelly cache forcing its register;
   *  any future themed cache names any family, pure data). Commons promote
   *  to magic so the line has a slot; uniques ignore it (legends are
   *  authored). Silently skipped when the family cannot roll on the
   *  resolved base — the tag gate is never bent. */
  withFamily?: string;
}

function rollRarity(opts: RollItemOpts, rng: RngFn): ItemRarity {
  const table = ITEM_RARITY_IDS.map(id => ({
    id, weight: opts.rarityWeights?.[id] ?? ITEM_CFG.rarityWeights[id],
  }));
  return pickWeighted(table, rng)?.id ?? 'common';
}

function candidateUniques(ilvl: number, category?: ItemCategory, baseId?: string): UniqueDef[] {
  return UNIQUE_LIST.filter(u => {
    if (u.minIlvl !== undefined && ilvl < u.minIlvl) return false;
    const base = ITEM_BASES[u.baseId];
    if (!base) return false;
    if (category !== undefined && base.category !== category) return false;
    if (baseId !== undefined && u.baseId !== baseId) return false;
    return true;
  });
}

/** Mint one item. Returns null only when the constraints are unsatisfiable
 *  (unknown base id, empty category pool) — never throws from a kill burst. */
export function rollItem(opts: RollItemOpts): ItemInstance | null {
  ensureValidated();
  const rng = opts.rng ?? Math.random;
  const ilvl = Math.max(1, Math.round(opts.ilvl));

  let unique: UniqueDef | undefined = opts.uniqueId ? UNIQUES[opts.uniqueId] : undefined;
  if (opts.uniqueId && !unique) return null;
  let rarity: ItemRarity = unique ? 'unique' : opts.rarity ?? rollRarity(opts, rng);
  // A forced-family pull needs an affix SLOT: commons promote to magic (the
  // themed cache must always pay); an explicit/rolled magic+ stands as-is.
  if (opts.withFamily && !unique && rarity === 'common') rarity = 'magic';

  if (rarity === 'unique' && !unique) {
    const pool = candidateUniques(ilvl, opts.category, opts.baseId);
    unique = pickWeighted(pool, rng) ?? undefined;
    if (!unique) rarity = 'rare'; // no legend fits — degrade gracefully
  }

  const base = unique
    ? ITEM_BASES[unique.baseId]
    : opts.baseId
      ? ITEM_BASES[opts.baseId]
      : pickWeighted(basePool(ilvl, opts.category).map(b => ({ b, weight: b.dropWeight })), rng)?.b;
  if (!base) return null;

  const tier = tierForIlvl(ilvl);
  const superior = rarity === 'common' && rng() < ITEM_CFG.superior.chance;
  const affixes = rarity === 'magic' || rarity === 'rare'
    ? rollAffixSet(base, ilvl, rarity, rng)
    : [];
  if (opts.withFamily && !unique && (rarity === 'magic' || rarity === 'rare')) {
    forceFamilyAffix(base, affixes, opts.withFamily, ilvl, rarity, rng);
  }

  const item: ItemInstance = {
    uid: nextItemUid(),
    baseId: base.id,
    ilvl,
    tier,
    rarity,
    name: mintName(base, tier, rarity, affixes, unique, superior, rng),
    baseRoll: rng(),
    implicitRolls: (base.implicits ?? []).map(() => rng()),
    affixes,
  };
  if (superior) item.superior = rng();
  // SOCKETS: a low-weight bonus — whites both chance-richer AND count-fatter
  // (ITEM_CFG.sockets), clamped to the category's absolute cap.
  const cap = socketCap(base.category);
  if (cap > 0 && rng() < ITEM_CFG.sockets.chanceByRarity[rarity]) {
    const n = Math.min(cap, pickWeighted(ITEM_CFG.sockets.countWeights[rarity], rng)?.n ?? 1);
    item.sockets = new Array<string | null>(n).fill(null);
  }
  if (unique) {
    item.uniqueId = unique.id;
    item.uniqueRolls = rollLineSet(unique.lines.length, rng);
    for (let i = 1; i < unique.lines.length; i++) {
      if (unique.lines[i].sharedRoll) item.uniqueRolls[i] = item.uniqueRolls[0];
    }
  }
  return item;
}

// ----------------------------------------------------------------- forge ---

/** One explicit affix on a forged item. */
export interface ForgeAffixPick {
  /** Affix id — must belong to the base's tag-gated pool (illegal picks are
   *  dropped, never bent into an instance no drop could produce). */
  id: string;
  /** Tier INDEX into AffixDef.tiers (best-first, exquisite included). Omitted
   *  = the best ilvl-legal tier; an explicit index may exceed the ilvl gate
   *  on purpose (testing a top tier on a low item). */
  tier?: number;
}

export interface ForgeItemOpts {
  ilvl: number;
  /** Exact base family (or implied by uniqueId). */
  baseId?: string;
  /** Exact unique — implies its base and rarity 'unique'. */
  uniqueId?: string;
  /** Default: 'unique' with uniqueId, else 'rare' when affixes are picked,
   *  else 'common'. */
  rarity?: ItemRarity;
  /** Explicit affix families (family-deduped, kind-capped by the rarity). */
  affixes?: ForgeAffixPick[];
  /** Top up the remaining prefix/suffix slots with normal weighted rolls. */
  fillRandom?: boolean;
  /** Pin EVERY numeric roll (base/superior/implicits/affixes/unique lines) to
   *  this 0..1 quality. Omitted = random, exactly like a drop. */
  quality?: number;
  /** Force the superior implicit (commons only). */
  superior?: boolean;
  /** Exact socket count, clamped to the category cap (0 = none). Omitted =
   *  the natural rarity-weighted roll. */
  sockets?: number;
  rng?: RngFn;
}

/** DELIBERATE mint — the dev/QA and future-bench counterpart to rollItem's
 *  weighted lottery. Same registries, same instance shape, same derivation:
 *  everything is spec'd instead of rolled, so a tester (or a crafting recipe)
 *  can ask for "this base, these families at these tiers, max rolls" and get
 *  a legal item the whole pipeline already knows how to price and describe.
 *  Returns null only for unknown ids — never mints an off-registry instance. */
export function forgeItem(opts: ForgeItemOpts): ItemInstance | null {
  ensureValidated();
  const rng = opts.rng ?? Math.random;
  const q = opts.quality;
  const roll = (): number => (q !== undefined ? Math.min(1, Math.max(0, q)) : rng());
  const rollSet = (n: number): number[] => { const out: number[] = []; for (let i = 0; i < n; i++) out.push(roll()); return out; };
  const ilvl = Math.max(1, Math.round(opts.ilvl));

  const unique = opts.uniqueId ? UNIQUES[opts.uniqueId] : undefined;
  if (opts.uniqueId && !unique) return null;
  const rarity: ItemRarity = unique ? 'unique' : opts.rarity ?? (opts.affixes?.length ? 'rare' : 'common');
  const base = ITEM_BASES[unique?.baseId ?? opts.baseId ?? ''];
  if (!base) return null;

  const caps = ITEM_CFG.affixSlots[rarity];
  const pools = affixPoolsFor(base);
  const used = new Set<string>();
  const counts: Record<AffixKind, number> = { prefix: 0, suffix: 0 };
  const affixes: AffixRollState[] = [];
  for (const pick of opts.affixes ?? []) {
    const def = ITEM_AFFIXES[pick.id];
    if (!def || used.has(def.family)) continue;
    if (!(def.kind === 'prefix' ? pools.prefix : pools.suffix).includes(def)) continue;
    if (counts[def.kind] >= (def.kind === 'prefix' ? caps.prefixes : caps.suffixes)) continue;
    const tier = pick.tier !== undefined
      ? Math.max(0, Math.min(def.tiers.length - 1, Math.round(pick.tier)))
      : eligibleTiers(def, ilvl, rarity)[0]?.index ?? def.tiers.length - 1;
    used.add(def.family);
    counts[def.kind]++;
    const rolls = rollSet(def.lines.length);
    for (let i = 1; i < def.lines.length; i++) if (def.lines[i].sharedRoll) rolls[i] = rolls[0];
    affixes.push({ id: def.id, tier, rolls });
  }
  if (opts.fillRandom) {
    for (const kind of ['prefix', 'suffix'] as const) {
      const cap = kind === 'prefix' ? caps.prefixes : caps.suffixes;
      const pool = kind === 'prefix' ? pools.prefix : pools.suffix;
      while (counts[kind] < cap) {
        const a = rollOneAffix(base, pool, used, ilvl, rarity, rng);
        if (!a) break; // pool exhausted for this kind
        if (q !== undefined) a.rolls = a.rolls.map(() => Math.min(1, Math.max(0, q)));
        counts[kind]++;
        affixes.push(a);
      }
    }
  }

  const tier = tierForIlvl(ilvl);
  const superior = rarity === 'common' && (opts.superior ?? false);
  const item: ItemInstance = {
    uid: nextItemUid(),
    baseId: base.id,
    ilvl,
    tier,
    rarity,
    name: mintName(base, tier, rarity, affixes, unique, superior, rng),
    baseRoll: roll(),
    implicitRolls: (base.implicits ?? []).map(() => roll()),
    affixes,
  };
  if (superior) item.superior = roll();
  const cap = socketCap(base.category);
  if (opts.sockets !== undefined) {
    const n = Math.max(0, Math.min(cap, Math.round(opts.sockets)));
    if (n > 0) item.sockets = new Array<string | null>(n).fill(null);
  } else if (cap > 0 && rng() < ITEM_CFG.sockets.chanceByRarity[rarity]) {
    const n = Math.min(cap, pickWeighted(ITEM_CFG.sockets.countWeights[rarity], rng)?.n ?? 1);
    item.sockets = new Array<string | null>(n).fill(null);
  }
  if (unique) {
    item.uniqueId = unique.id;
    item.uniqueRolls = rollSet(unique.lines.length);
    for (let i = 1; i < unique.lines.length; i++) {
      if (unique.lines[i].sharedRoll) item.uniqueRolls[i] = item.uniqueRolls[0];
    }
  }
  return item;
}

// ------------------------------------------------------------- compiling ---

function rangedLineValue(line: RangedLineDef, roll: number, tier: number, defaultScale: number): number {
  const scale = 1 + (line.tierScale ?? defaultScale) * (tier - 1);
  return roundStatValue(lerpRange(line.range, roll, scale));
}

/** Base defense contributions: the slot budget split by the family's mix,
 *  priced per kind, lifted by the base roll (+superior). These are the
 *  item-own SEEDS the local fold multiplies over — weapon bases will seed
 *  their damage/crit through the same shape the day they ship. */
function defenseMods(base: ItemBaseDef, item: ItemInstance): Modifier[] {
  if (!base.defense) return [];
  const budget = defenseBudget(item.ilvl, item.tier, base.category) * (1 + baseBonusFor(item));
  const totalW = Object.values(base.defense).reduce((s, w) => s + w, 0);
  if (budget <= 0 || totalW <= 0) return [];
  const out: Modifier[] = [];
  for (const [kind, w] of Object.entries(base.defense)) {
    const def = DEFENSE_KINDS[kind];
    if (!def) continue;
    const value = Math.round(budget * (w / totalW) * def.coeff);
    if (value > 0) out.push({ stat: def.stat, kind: 'flat', value });
  }
  return out;
}

/** Visit every rolled line on the instance with its derived value —
 *  implicits, affixes, unique lines. ONE walker shared by the compiler and
 *  the local fold, so the sheet and the tooltip can never disagree. */
function eachItemLine(
  base: ItemBaseDef, item: ItemInstance,
  visit: (line: ModLineDef, value: number) => void,
): void {
  (base.implicits ?? []).forEach((line, i) => {
    visit(line, rangedLineValue(line, item.implicitRolls[i] ?? 0.5, item.tier, ITEM_CFG.implicitTierScale));
  });
  for (const a of item.affixes) {
    const def = ITEM_AFFIXES[a.id];
    const tierDef = def?.tiers[a.tier];
    if (!def || !tierDef) continue;
    def.lines.forEach((line, i) => {
      const roll = line.sharedRoll ? a.rolls[0] : a.rolls[i];
      visit(line, roundStatValue(lerpRange(tierDef.ranges[i], roll ?? 0.5)));
    });
  }
  if (item.uniqueId) {
    UNIQUES[item.uniqueId]?.lines.forEach((line, i) => {
      visit(line, rangedLineValue(line, item.uniqueRolls?.[i] ?? 0.5, item.tier, ITEM_CFG.uniqueTierScale));
    });
  }
}

// ------------------------------------------------------- local-scope fold --

/** One folded ITEM-OWN stat (a defense-header row): the base-budget seed
 *  with every LOCAL line multiplied through. `augmented` marks stats any
 *  local line touched (the UI tints those, PoE-style). */
export interface OwnStatFold {
  stat: string;
  value: number;
  augmented: boolean;
}

/** Fold the item's OWN stats: (seed + Σlocal flat)·(1 + Σlocal increased)
 *  ·Π(1 + local more), floored at 0. Stat-agnostic on purpose — a local
 *  flat can CREATE a stat the base doesn't carry (flat Energy Shield on a
 *  Warplate mints a hybrid), and a local increase over nothing folds to
 *  nothing. Items without local lines fold to exactly their seeds. */
export function foldOwnStats(base: ItemBaseDef, item: ItemInstance): OwnStatFold[] {
  const seed = new Map<string, number>();
  for (const m of defenseMods(base, item)) seed.set(m.stat, m.value);
  const flat = new Map<string, number>();
  const inc = new Map<string, number>();
  const more = new Map<string, number>();
  const touched = new Set<string>();
  eachItemLine(base, item, (line, v) => {
    if (!line.local) return;
    touched.add(line.stat);
    if (line.kind === 'flat') flat.set(line.stat, (flat.get(line.stat) ?? 0) + v);
    else if (line.kind === 'increased') inc.set(line.stat, (inc.get(line.stat) ?? 0) + v);
    else if (line.kind === 'more') more.set(line.stat, (1 + (more.get(line.stat) ?? 0)) * (1 + v) - 1);
  });
  // Registry order first (armor, evasion, ES, poise, …), created stats after.
  const order = [...new Set([
    ...Object.values(DEFENSE_KINDS).map(k => k.stat).filter(s => seed.has(s) || touched.has(s)),
    ...seed.keys(), ...touched.keys(),
  ])];
  const out: OwnStatFold[] = [];
  for (const stat of order) {
    const value = roundStatValue(Math.max(0,
      ((seed.get(stat) ?? 0) + (flat.get(stat) ?? 0))
      * (1 + (inc.get(stat) ?? 0)) * (1 + (more.get(stat) ?? 0))));
    if (value > 0) out.push({ stat, value, augmented: touched.has(stat) });
  }
  return out;
}

/** Every Modifier this item grants while worn — the folded item-own stats
 *  (base defenses × local lines), then every GLOBAL line. Pure derivation
 *  from the instance's stored rolls. */
export function compileItemMods(item: ItemInstance): Modifier[] {
  const base = ITEM_BASES[item.baseId];
  if (!base) return [];
  const out: Modifier[] = foldOwnStats(base, item)
    .map(f => ({ stat: f.stat, kind: 'flat' as const, value: f.value }));

  eachItemLine(base, item, (line, value) => {
    if (line.local) return; // already folded into the item-own stats above
    out.push({
      stat: line.stat, kind: line.kind, value,
      tags: line.tags, when: line.when, fromStat: line.fromStat, gauge: line.gauge,
    });
  });

  // SOCKETED VESTIGES: deterministic lines by the HOST's category ('default'
  // fallback) — the same Kessa reads differently in a chest than in gloves,
  // but identically in every chest. An activated EPITAPH (white base, exact
  // sequence — epitaphFor owns the whole contract) adds its word's lines ON
  // TOP of every vestige's own.
  if (item.sockets) {
    for (const vid of item.sockets) {
      if (!vid) continue;
      const v = VESTIGES[vid];
      const lines: VestigeLine[] = v?.effects[base.category] ?? v?.effects.default ?? [];
      for (const ln of lines) {
        out.push({ stat: ln.stat, kind: ln.kind, value: ln.value, tags: ln.tags, when: ln.when });
      }
    }
    const epi = epitaphFor(item.rarity, base.category, item.sockets);
    for (const ln of epi?.effects ?? []) {
      out.push({ stat: ln.stat, kind: ln.kind, value: ln.value, tags: ln.tags, when: ln.when });
    }
  }
  return out;
}

// ------------------------------------------------------------ describing ---

export interface ItemDescription {
  title: string;
  color: string;
  baseLine: string;
  reqLine: string;
  /** Item-own defense rows ('Armor 84'), local lines already folded in —
   *  `augmented` marks values a local line touched (UI tints them). */
  defense: { text: string; augmented: boolean }[];
  /** Superior + base implicit lines. */
  implicit: string[];
  /** Rolled affix lines with their tier tag ('T2', 'EX'). */
  affix: { text: string; tag: string }[];
  unique: string[];
  /** One entry per socket (glyph ◇ when empty; the vestige's line here). */
  sockets?: { glyph: string; color: string; name: string; line: string }[];
  /** The activated word (white base, exact sequence) — name + its lines. */
  epitaph?: { name: string; lines: string[]; flavor?: string };
  flavor?: string;
}

/** The tier tag for an affix roll: EXQUISITE tiers show 'EX'; numbered tiers
 *  count only the normally-rollable ladder (T1 = best rare-legal tier). A
 *  WHOLLY magic-exclusive family numbers M1.. instead — every tier is blue. */
function tierTag(def: AffixDef, tierIndex: number): string {
  if (def.tiers.every(t => t.magicOnly)) return `M${tierIndex + 1}`;
  const t = def.tiers[tierIndex];
  if (t?.magicOnly) return 'EX';
  let n = 0;
  for (let i = 0; i <= tierIndex; i++) if (!def.tiers[i].magicOnly) n++;
  return `T${n}`;
}

export function describeItem(item: ItemInstance): ItemDescription {
  const base = ITEM_BASES[item.baseId];
  const rarity = ITEM_RARITIES[item.rarity];
  const d: ItemDescription = {
    title: item.name,
    color: rarity.color,
    baseLine: base
      ? `${tieredBaseName(base, item.tier)} · ${base.category} · Tier ${item.tier} · ilvl ${item.ilvl}`
      : `(unknown base) · ilvl ${item.ilvl}`,
    reqLine: `Requires Level ${levelReqForTier(item.tier)}`,
    defense: [], implicit: [], affix: [], unique: [],
  };
  if (!base) return d;

  for (const f of foldOwnStats(base, item)) {
    d.defense.push({
      text: `${DEFENSE_LABEL_BY_STAT[f.stat] ?? statLabel(f.stat)} ${formatStatValue(f.stat, 'flat', f.value)}`,
      augmented: f.augmented,
    });
  }
  if (item.superior !== undefined) {
    d.implicit.push(`Superior (+${Math.round(baseBonusFor(item) * 100)}% base)`);
  }
  (base.implicits ?? []).forEach((line, i) => {
    const v = rangedLineValue(line, item.implicitRolls[i] ?? 0.5, item.tier, ITEM_CFG.implicitTierScale);
    d.implicit.push(line.text ? line.text.replace('{v}', String(v)) : formatModLine(line, v));
  });
  for (const a of item.affixes) {
    const def = ITEM_AFFIXES[a.id];
    const tierDef = def?.tiers[a.tier];
    if (!def || !tierDef) continue;
    def.lines.forEach((line, i) => {
      const roll = line.sharedRoll ? a.rolls[0] : a.rolls[i];
      const v = roundStatValue(lerpRange(tierDef.ranges[i], roll ?? 0.5));
      const tag = (a.crafted ? 'CRAFT' : tierTag(def, a.tier)) + (a.locked ? ' 🔒' : '');
      d.affix.push({ text: formatModLine(line, v), tag });
    });
  }
  if (item.uniqueId) {
    const u = UNIQUES[item.uniqueId];
    u?.lines.forEach((line, i) => {
      const v = rangedLineValue(line, item.uniqueRolls?.[i] ?? 0.5, item.tier, ITEM_CFG.uniqueTierScale);
      d.unique.push(line.text ? line.text.replace('{v}', String(v)) : formatModLine(line, v));
    });
    d.flavor = u?.flavor;
  }
  if (item.sockets) {
    d.sockets = item.sockets.map(vid => {
      if (!vid) return { glyph: '◇', color: '#5a5668', name: 'Empty socket', line: 'Empty — inlay a vestige' };
      const v = VESTIGES[vid];
      const lines: VestigeLine[] = v?.effects[base.category] ?? v?.effects.default ?? [];
      return {
        glyph: v?.glyph ?? '?', color: v?.color ?? '#888', name: v?.name ?? vid,
        line: lines.map(ln => formatModLine(ln, ln.value)).join(' · '),
      };
    });
    const epi = epitaphFor(item.rarity, base.category, item.sockets);
    if (epi) {
      d.epitaph = {
        name: epi.name,
        lines: epi.effects.map(ln => formatModLine(ln, ln.value)),
        flavor: epi.flavor,
      };
    }
  }
  return d;
}

// ------------------------------------------------------------- comparing ---

/** One row of an A-vs-B grant comparison (compareItemMods). */
export interface ModCompareRow {
  /** Full human line at the CANDIDATE's folded value ('loss' rows: the worn
   *  value — the line the swap gives up). */
  text: string;
  /** 'delta' = shared line whose value moves · 'same' = shared and equal ·
   *  'gain' = only the candidate grants it · 'loss' = only the worn piece does. */
  kind: 'delta' | 'same' | 'gain' | 'loss';
  /** 'delta' rows: signed change (candidate − worn) and its display label. */
  delta?: number;
  deltaText?: string;
}

/** Line-identity bucket: stat+kind+source+gauge+condition+tags — a
 *  conditional line must never fold into (or diff against) its unconditional
 *  cousin, and "+10 fire damage with melee skills" is not "+10 fire damage". */
const modSig = (m: Modifier): string =>
  [m.stat, m.kind, m.fromStat ?? '', m.gauge ?? '', m.when ?? '',
    [...(m.tags ?? [])].sort().join('+')].join('§');

/** Fold one item's grants into per-identity totals, the way the stat sheet
 *  folds them: flat/increased/link ADD, 'more' COMPOUNDS, override last-wins. */
function foldMods(mods: Modifier[]): Map<string, { line: ModLineDef; value: number }> {
  const out = new Map<string, { line: ModLineDef; value: number }>();
  for (const m of mods) {
    const k = modSig(m);
    const b = out.get(k);
    if (!b) {
      out.set(k, {
        line: { stat: m.stat, kind: m.kind, tags: m.tags, when: m.when, fromStat: m.fromStat, gauge: m.gauge },
        value: m.value,
      });
      continue;
    }
    b.value = m.kind === 'more' ? (1 + b.value) * (1 + m.value) - 1
      : m.kind === 'override' ? m.value
        : b.value + m.value;
  }
  return out;
}

/** Compare everything two items GRANT — derived from compileItemMods, the
 *  same derivation the worn stat sheet plays by, so the card can never
 *  disagree with the engine. Rows come back deltas first, then unchanged,
 *  then gains, then losses; values inside each group keep grant order.
 *  Presentation (colors, glyphs) stays the caller's business. */
export function compareItemMods(candidate: ItemInstance, worn: ItemInstance): ModCompareRow[] {
  const cand = foldMods(compileItemMods(candidate));
  const cur = foldMods(compileItemMods(worn));
  const rows: ModCompareRow[] = [];
  const EPS = 1e-9;
  for (const [k, a] of cand) {
    const b = cur.get(k);
    if (!b) {
      rows.push({ text: formatModLine(a.line, a.value), kind: 'gain' });
    } else if (Math.abs(a.value - b.value) <= EPS) {
      rows.push({ text: formatModLine(a.line, a.value), kind: 'same' });
    } else {
      const d = a.value - b.value;
      rows.push({
        text: formatModLine(a.line, a.value), kind: 'delta', delta: d,
        deltaText: `${d > 0 ? '+' : '−'}${formatStatValue(a.line.stat, a.line.kind, Math.abs(d))}`,
      });
    }
  }
  for (const [k, b] of cur) {
    if (!cand.has(k)) rows.push({ text: formatModLine(b.line, b.value), kind: 'loss' });
  }
  const rank: Record<ModCompareRow['kind'], number> = { delta: 0, same: 1, gain: 2, loss: 3 };
  return rows.sort((x, y) => rank[x.kind] - rank[y.kind]);
}

/** Bag footprint (1×1 fallback keeps unknown bases carryable, not stuck). */
export function itemGridSize(item: ItemInstance): { w: number; h: number } {
  const base = ITEM_BASES[item.baseId];
  return base ? { w: base.w, h: base.h } : { w: 1, h: 1 };
}

export function itemLevelReq(item: ItemInstance): number {
  return levelReqForTier(item.tier);
}

// --------------------------------------------------------------- rebuild ---

/** Restore a saved/corpse/wire item against the LIVE registries: unknown
 *  bases/uniques drop the item (null), unknown affixes drop the line, tier
 *  indices clamp — a data patch never crashes a load (character.ts rule). */
export function rebuildItem(saved: ItemInstance): ItemInstance | null {
  const base = ITEM_BASES[saved.baseId];
  if (!base) return null;
  if (saved.uniqueId && !UNIQUES[saved.uniqueId]) return null;
  const item: ItemInstance = {
    ...saved,
    affixes: (saved.affixes ?? []).filter(a => {
      const def = ITEM_AFFIXES[a.id];
      if (!def) return false;
      a.tier = Math.max(0, Math.min(def.tiers.length - 1, a.tier));
      return true;
    }),
    implicitRolls: saved.implicitRolls ?? [],
  };
  // Sockets: clamp to the (possibly retuned) cap; unknown vestiges empty out.
  if (item.sockets) {
    item.sockets = item.sockets
      .slice(0, Math.max(1, socketCap(base.category)))
      .map(v => (v && VESTIGES[v] ? v : null));
    if (item.sockets.length === 0) delete item.sockets;
  }
  bumpItemUidFloor(item.uid);
  return item;
}

// ------------------------------------------------------------ validation ---

/** Stats minted at runtime by other registries (status families, conversion
 *  lanes) — absent from STAT_DEFS at module load yet perfectly valid. */
const GENERATED_STAT = /^(apply|damageVs|minionApply|popPower|dotLeech|convert|addedMin|addedMax|proc|classSkill|sympathy)_/;

let validated = false;

/** One-shot dev sweep: every data reference resolves, every tier's ranges
 *  match its lines. Console warnings only — bad data degrades, never throws. */
function ensureValidated(): void {
  if (validated) return;
  validated = true;
  const warn = (msg: string): void => { console.warn(`[items] ${msg}`); };
  // LOCAL lines fold arithmetically into the item's own stats — filters and
  // exotic kinds have no meaning there (and attributes are never item-own).
  const lintLocal = (owner: string, line: ModLineDef): void => {
    if (!line.local) return;
    if (line.kind !== 'flat' && line.kind !== 'increased' && line.kind !== 'more') {
      warn(`${owner}: local lines fold flat/increased/more only (got '${line.kind}')`);
    }
    if (line.when || line.tags?.length || line.gauge || line.fromStat) {
      warn(`${owner}: local lines take no when/tags/gauge/fromStat filters`);
    }
    if (isAttributeId(line.stat)) warn(`${owner}: attribute '${line.stat}' cannot be local`);
  };
  for (const a of ITEM_AFFIX_LIST) {
    for (const line of a.lines) {
      lintLocal(`affix '${a.id}'`, line);
      if (isAttributeId(line.stat)) {
        // Attribute grants route through Actor.setAttributes (recalcSeat
        // splits them out of the sheet) — FLAT adds points, INCREASED feeds
        // the percent phase. Other kinds have no meaning there.
        if (line.kind !== 'flat' && line.kind !== 'increased') {
          warn(`affix '${a.id}': attribute '${line.stat}' supports flat/increased lines only (got '${line.kind}')`);
        }
      } else if (!STAT_DEFS[line.stat] && !GENERATED_STAT.test(line.stat)) {
        warn(`affix '${a.id}' references unknown stat '${line.stat}'`);
      }
    }
    for (const t of a.tiers) {
      if (t.ranges.length !== a.lines.length) {
        warn(`affix '${a.id}' tier ilvl ${t.ilvl}: ${t.ranges.length} ranges for ${a.lines.length} lines`);
      }
    }
  }
  for (const u of UNIQUE_LIST) {
    if (!ITEM_BASES[u.baseId]) warn(`unique '${u.id}' pinned to unknown base '${u.baseId}'`);
    for (const line of u.lines) {
      lintLocal(`unique '${u.id}'`, line);
      if (isAttributeId(line.stat)) {
        if (line.kind !== 'flat' && line.kind !== 'increased') {
          warn(`unique '${u.id}': attribute '${line.stat}' supports flat/increased lines only (got '${line.kind}')`);
        }
      } else if (!STAT_DEFS[line.stat] && !GENERATED_STAT.test(line.stat)) {
        warn(`unique '${u.id}' references unknown stat '${line.stat}'`);
      }
    }
  }
  for (const b of Object.values(ITEM_BASES)) {
    for (const k of Object.keys(b.defense ?? {})) {
      if (!DEFENSE_KINDS[k]) warn(`base '${b.id}' uses unknown defense kind '${k}'`);
    }
    for (const line of b.implicits ?? []) lintLocal(`base '${b.id}' implicit`, line);
  }
}

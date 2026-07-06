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
import {
  DEFENSE_KINDS, ITEM_CFG, ITEM_RARITIES, ITEM_RARITY_IDS,
  baseBonusFor, defenseBudget, formatModLine, lerpRange, levelReqForTier,
  roundStatValue, slotsForCategory, tierForIlvl, tieredBaseName,
  type AffixDef, type AffixRollState, type AffixTierDef, type ItemBaseDef,
  type ItemCategory, type ItemInstance, type ItemRarity, type RangedLineDef,
  type UniqueDef,
} from './items';
import { STAT_DEFS, type Modifier } from './stats';

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

function rollOneAffix(
  pool: AffixDef[], used: Set<string>, ilvl: number, rarity: ItemRarity, rng: RngFn,
): AffixRollState | null {
  const open = pool.filter(a => !used.has(a.family) && eligibleTiers(a, ilvl, rarity).length > 0);
  const def = pickWeighted(open, rng);
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
    const a = rollOneAffix(pools.prefix, used, ilvl, rarity, rng);
    if (a) out.push(a);
  }
  for (let i = 0; i < nSuf; i++) {
    const a = rollOneAffix(pools.suffix, used, ilvl, rarity, rng);
    if (a) out.push(a);
  }
  return out;
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
  if (unique) {
    item.uniqueId = unique.id;
    item.uniqueRolls = rollLineSet(unique.lines.length, rng);
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
 *  priced per kind, lifted by the base roll (+superior). */
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

/** Every Modifier this item grants while worn — base defenses, implicits,
 *  affixes, unique lines. Pure derivation from the instance's stored rolls. */
export function compileItemMods(item: ItemInstance): Modifier[] {
  const base = ITEM_BASES[item.baseId];
  if (!base) return [];
  const out: Modifier[] = defenseMods(base, item);

  (base.implicits ?? []).forEach((line, i) => {
    out.push({
      stat: line.stat, kind: line.kind,
      value: rangedLineValue(line, item.implicitRolls[i] ?? 0.5, item.tier, ITEM_CFG.implicitTierScale),
      tags: line.tags, when: line.when, fromStat: line.fromStat, gauge: line.gauge,
    });
  });

  for (const a of item.affixes) {
    const def = ITEM_AFFIXES[a.id];
    const tierDef = def?.tiers[a.tier];
    if (!def || !tierDef) continue;
    def.lines.forEach((line, i) => {
      const roll = line.sharedRoll ? a.rolls[0] : a.rolls[i];
      out.push({
        stat: line.stat, kind: line.kind,
        value: roundStatValue(lerpRange(tierDef.ranges[i], roll ?? 0.5)),
        tags: line.tags, when: line.when, fromStat: line.fromStat, gauge: line.gauge,
      });
    });
  }

  if (item.uniqueId) {
    const u = UNIQUES[item.uniqueId];
    u?.lines.forEach((line, i) => {
      out.push({
        stat: line.stat, kind: line.kind,
        value: rangedLineValue(line, item.uniqueRolls?.[i] ?? 0.5, item.tier, ITEM_CFG.uniqueTierScale),
        tags: line.tags, when: line.when, fromStat: line.fromStat, gauge: line.gauge,
      });
    });
  }
  return out;
}

// ------------------------------------------------------------ describing ---

export interface ItemDescription {
  title: string;
  color: string;
  baseLine: string;
  reqLine: string;
  /** Base defense values ('Armor 84'). */
  defense: string[];
  /** Superior + base implicit lines. */
  implicit: string[];
  /** Rolled affix lines with their tier tag ('T2', 'EX'). */
  affix: { text: string; tag: string }[];
  unique: string[];
  flavor?: string;
}

/** The tier tag for an affix roll: EXQUISITE tiers show 'EX'; numbered tiers
 *  count only the normally-rollable ladder (T1 = best rare-legal tier). */
function tierTag(def: AffixDef, tierIndex: number): string {
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

  for (const m of defenseMods(base, item)) {
    d.defense.push(`${DEFENSE_KINDS[Object.keys(DEFENSE_KINDS).find(k => DEFENSE_KINDS[k].stat === m.stat) ?? '']?.label ?? m.stat} ${m.value}`);
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
      d.affix.push({ text: formatModLine(line, v), tag: a.crafted ? 'CRAFT' : tierTag(def, a.tier) });
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
  return d;
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
  bumpItemUidFloor(item.uid);
  return item;
}

// ------------------------------------------------------------ validation ---

/** Stats minted at runtime by other registries (status families, conversion
 *  lanes) — absent from STAT_DEFS at module load yet perfectly valid. */
const GENERATED_STAT = /^(apply|damageVs|minionApply|popPower|dotLeech|convert|addedMin|addedMax)_/;

let validated = false;

/** One-shot dev sweep: every data reference resolves, every tier's ranges
 *  match its lines. Console warnings only — bad data degrades, never throws. */
function ensureValidated(): void {
  if (validated) return;
  validated = true;
  const warn = (msg: string): void => { console.warn(`[items] ${msg}`); };
  for (const a of ITEM_AFFIX_LIST) {
    for (const line of a.lines) {
      if (!STAT_DEFS[line.stat] && !GENERATED_STAT.test(line.stat)) {
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
      if (!STAT_DEFS[line.stat] && !GENERATED_STAT.test(line.stat)) {
        warn(`unique '${u.id}' references unknown stat '${line.stat}'`);
      }
    }
  }
  for (const b of Object.values(ITEM_BASES)) {
    for (const k of Object.keys(b.defense ?? {})) {
      if (!DEFENSE_KINDS[k]) warn(`base '${b.id}' uses unknown defense kind '${k}'`);
    }
  }
}

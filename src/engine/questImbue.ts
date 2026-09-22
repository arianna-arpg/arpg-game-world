import { Rng } from '../core/rng';
import { ITEM_BASES } from '../data/itembases';
import { ITEM_AFFIXES } from '../data/itemaffixes';
import { affixCapsFor, affixPoolsFor } from './itemgen';
import type { AffixRollState, ItemInstance } from './items';
import { seedLaneFrac } from './memories';

/** Saved at turn-in, independent of inventory, current level and later lore. */
export interface QuestImbue {
  questId: string;
  level: number;
  offers: Record<string, AffixRollState[]>;
}

export function mintQuestImbue(questId: string, seed: number, level: number, count: number): QuestImbue {
  const offers: QuestImbue['offers'] = {};
  for (const base of Object.values(ITEM_BASES)) {
    if (base.category === 'gem') continue;
    const rng = new Rng((seedLaneFrac(seed, `imbue:${questId}:${base.id}`) * 4294967296) >>> 0);
    const pools = affixPoolsFor(base);
    const caps = affixCapsFor(base, 'rare');
    const pool = [...pools.prefix, ...pools.suffix].filter(a =>
      (a.kind === 'prefix' ? caps.prefixes : caps.suffixes) > 0
      && a.tiers.some(t => !t.magicOnly && t.ilvl <= level));
    const picked: AffixRollState[] = [];
    const families = new Set<string>();
    while (pool.length && picked.length < count) {
      const def = pool.splice(Math.floor(rng.next() * pool.length), 1)[0];
      if (families.has(def.family)) continue;
      families.add(def.family);
      // Best normal tier available to this quest, with sealed rolls inside it.
      const tier = def.tiers.findIndex(t => !t.magicOnly && t.ilvl <= level);
      const first = rng.next();
      picked.push({ id: def.id, tier,
        rolls: def.lines.map((line, i) => i === 0 || line.sharedRoll ? first : rng.next()) });
    }
    offers[base.id] = picked;
  }
  return { questId, level, offers };
}

/** Eligibility is re-read at the click; previews never spend or reroll offers. */
export function imbueOptions(reward: QuestImbue, item: ItemInstance): AffixRollState[] {
  const base = ITEM_BASES[item.baseId];
  if (!base || base.category === 'gem' || item.rarity !== 'magic' || item.uniqueId || item.questId || item.locked) return [];
  const pools = affixPoolsFor(base), caps = affixCapsFor(base, 'rare');
  const legal = new Set([...pools.prefix, ...pools.suffix].map(d => d.id));
  return (reward.offers[base.id] ?? []).filter(a => {
    const def = ITEM_AFFIXES[a.id], tier = def?.tiers[a.tier];
    if (!def || !legal.has(a.id) || !tier || tier.magicOnly || tier.ilvl > reward.level) return false;
    if (item.affixes.some(x => ITEM_AFFIXES[x.id]?.family === def.family)) return false;
    const used = item.affixes.filter(x => ITEM_AFFIXES[x.id]?.kind === def.kind).length;
    return used < (def.kind === 'prefix' ? caps.prefixes : caps.suffixes);
  });
}

/** No minimum affix count: a one-line magic item becomes a two-line rare. */
export function imbuedItem(item: ItemInstance, affix: AffixRollState): ItemInstance {
  return { ...item, rarity: 'rare', name: `Tempered ${item.name}`,
    affixes: [...item.affixes, { ...affix, rolls: [...affix.rolls] }] };
}

/** Registry-tolerant load, preserving the actual saved offers rather than rerolling. */
export function restoreQuestImbues(raw: unknown): QuestImbue[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw.flatMap((r: QuestImbue) => {
    if (!r || typeof r.questId !== 'string' || seen.has(r.questId)
      || !Number.isInteger(r.level) || r.level < 1 || !r.offers || typeof r.offers !== 'object') return [];
    seen.add(r.questId);
    const offers: QuestImbue['offers'] = {};
    for (const [base, rows] of Object.entries(r.offers)) {
      if (!ITEM_BASES[base] || !Array.isArray(rows)) continue;
      offers[base] = rows.filter(a => {
        const d = a && ITEM_AFFIXES[a.id], t = d?.tiers[a.tier];
        return t && !t.magicOnly && t.ilvl <= r.level && Array.isArray(a.rolls)
          && a.rolls.length === d!.lines.length && a.rolls.every(v => Number.isFinite(v) && v >= 0 && v <= 1);
      }).map(a => ({ id: a.id, tier: a.tier, rolls: [...a.rolls] }));
    }
    return [{ questId: r.questId, level: r.level, offers }];
  });
}

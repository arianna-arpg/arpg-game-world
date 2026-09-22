import type { Rng } from '../core/rng';
import { ESSENCES, ESSENCE_IDS, type EssenceCost } from './essences';
import { bountyUniquePool, BOUNTY_BOARD_CFG, rollBountyPay, type BountyPay, type BountyPosting, type BountyRollHost } from './bountyboard';

type Lane = keyof typeof BOUNTY_BOARD_CFG.lanes.weights;
export type BountyRewardRecipe = {
  id: string;
  lane: Lane;
  weight: number;
  essence?: 'mixed' | 'coarse' | 'fine';
} & ({
  /** Normalized shares divide one budget between composable rewards. */
  shares: { essence?: number; xp?: number; unique?: number; craft?: number; legacy?: never };
} | {
  /** Established targeted rewards occupy a whole budget, exclusively. */
  shares: { legacy: number; essence?: never; xp?: never; unique?: never; craft?: never };
});

/** Relative economy estimates, not vendor prices. Item level stays fixed;
 * concentrating on a Unique improves rarity odds within that level's pool. */
export const BOUNTY_REWARD_CFG = {
  xpPerValue: 8,
  uniqueWeightPower: { mixed: 1, focused: 0.55 },
  /** Protected choices on each fresh slate, space and band lanes permitting.
   * Pins/standing offers can satisfy a choice but are never rewritten. */
  slateChoices: [
    { lane: 'craft', recipe: 'smith_writ' },
    { lane: 'essence', recipe: 'coarse_cache' },
  ] as const,
};

/** Open recipe table: category targeting remains available beside mixed pay. */
export const BOUNTY_REWARD_RECIPES: BountyRewardRecipe[] = [
  { id: 'essence_mix', lane: 'essence', weight: 3, shares: { essence: 1 }, essence: 'mixed' },
  { id: 'coarse_cache', lane: 'essence', weight: 1, shares: { essence: 1 }, essence: 'coarse' },
  { id: 'fine_cache', lane: 'essence', weight: 1, shares: { essence: 1 }, essence: 'fine' },
  { id: 'experience', lane: 'essence', weight: 1, shares: { xp: 1 } },
  { id: 'field_pay', lane: 'essence', weight: 2, shares: { xp: 1, essence: 1 }, essence: 'mixed' },
  { id: 'unique_cache', lane: 'unique', weight: 2, shares: { unique: 4, essence: 1 }, essence: 'mixed' },
  { id: 'unique_prize', lane: 'unique', weight: 2, shares: { unique: 1 } },
  { id: 'targeted_unique', lane: 'unique', weight: 2, shares: { legacy: 1 } },
  { id: 'equipment', lane: 'lot', weight: 1, shares: { legacy: 1 } },
  { id: 'memories', lane: 'pouch', weight: 1, shares: { legacy: 1 } },
  { id: 'smith_writ', lane: 'craft', weight: 1, shares: { craft: 3, essence: 2 }, essence: 'coarse' },
];

/** Exact denomination exchange: no upward rounding and no lost remainder. */
export function bountyEssenceMix(value: number, level: number, style: BountyRewardRecipe['essence'], rng: Rng): EssenceCost[] {
  let left = Math.max(0, Math.floor(value));
  const eligible = ESSENCE_IDS.filter((_, i) => level >= (BOUNTY_BOARD_CFG.pay.tierAt[i] ?? Infinity));
  const cheapest = ESSENCE_IDS.reduce((a, b) => ESSENCES[a].mortalWorth <= ESSENCES[b].mortalWorth ? a : b);
  const counts = new Map<typeof cheapest, number>();
  while (left > 0) {
    const pool = eligible.filter(id => ESSENCES[id].mortalWorth <= left);
    const id = style === 'coarse' || !pool.length ? cheapest : style === 'fine'
      ? pool.reduce((a, b) => ESSENCES[a].mortalWorth >= ESSENCES[b].mortalWorth ? a : b) : rng.pick(pool);
    counts.set(id, (counts.get(id) ?? 0) + 1);
    left -= ESSENCES[id].mortalWorth;
  }
  return ESSENCE_IDS.filter(id => counts.has(id)).map(essence => ({ essence, count: counts.get(essence)! }));
}

export function rollBudgetBountyPay(host: Pick<BountyRollHost, 'pickGemId'>, rng: Rng, level: number,
  weights: Record<Lane, number> = BOUNTY_BOARD_CFG.lanes.weights, recipeId?: string): BountyPay {
  const value = Math.max(1, Math.round(BOUNTY_BOARD_CFG.pay.base + BOUNTY_BOARD_CFG.pay.perLevel * level));
  // Normalize recipe weights within each lane so extra recipes don't inflate it.
  const recipes = BOUNTY_REWARD_RECIPES.filter(r => r.weight > 0 && (recipeId ? r.id === recipeId : weights[r.lane] > 0));
  if (!recipes.length) return { level, essence: bountyEssenceMix(value, level, 'mixed', rng) };
  const recipe = rng.weighted(recipes.map(r => ({ ...r, weight: r.weight * (recipeId ? 1 : weights[r.lane])
    / recipes.filter(x => x.lane === r.lane).reduce((n, x) => n + x.weight, 0) })));
  const total = Object.values(recipe.shares).reduce((n, v) => n + Math.max(0, v), 0);
  const pay: BountyPay = { level, budget: { value, recipe: recipe.id } };
  if (!(total > 0)) return { ...pay, essence: bountyEssenceMix(value, level, 'mixed', rng) };
  if (recipe.shares.legacy) {
    // These established targeted lanes consume a whole budget. Their own
    // category/count/complexity dials remain the single source of truth.
    return { ...rollBountyPay(host, rng, level, { essence: 0, pouch: 0, lot: 0, unique: 0, craft: 0, [recipe.lane]: 1 }), ...pay };
  }
  let left = value;
  if (recipe.shares.craft) {
    const spend = Math.floor(value * recipe.shares.craft / total);
    const writ = rollBountyPay(host, rng, level, { essence: 0, pouch: 0, lot: 0, unique: 0, craft: 1 }).craft;
    if (writ && spend > 0) { pay.craft = writ; left -= spend; }
  }
  if (recipe.shares.unique) {
    const spend = Math.floor(value * recipe.shares.unique / total);
    const focused = recipe.shares.unique === total;
    const pool = bountyUniquePool(level).map(u => ({ ...u, weight: Math.pow(u.weight,
      focused ? BOUNTY_REWARD_CFG.uniqueWeightPower.focused : BOUNTY_REWARD_CFG.uniqueWeightPower.mixed) }));
    if (pool.length && spend > 0) {
      pay.unique = { id: rng.weighted(pool).id, random: true, essenceValue: spend, ...(focused ? { focused: true } : {}) };
      left -= spend;
    } // Missing pools refund their share to essence, never a lower-grade item.
  }
  if (recipe.shares.xp) {
    const spend = Math.min(left, Math.floor(value * recipe.shares.xp / total));
    pay.xp = spend * BOUNTY_REWARD_CFG.xpPerValue;
    left -= spend;
  }
  if (left > 0) pay.essence = bountyEssenceMix(left, level, recipe.essence ?? 'mixed', rng);
  return pay;
}

/** Assign guaranteed reward choices across randomly chosen new postings.
 * Targets keep their own frozen level; no specific easy route owns the writ. */
export function ensureBountyRewardChoices(offers: BountyPosting[], preserved: ReadonlySet<string>,
  host: Pick<BountyRollHost, 'pickGemId'>, rng: Rng, weights: Record<Lane, number>): void {
  const choices = BOUNTY_REWARD_CFG.slateChoices.filter(c => weights[c.lane] > 0);
  const matches = (p: BountyPosting, lane: 'craft' | 'essence'): boolean => lane === 'craft'
    ? !!p.pay.craft : !!p.pay.essence?.length && !p.pay.xp && !p.pay.craft && !p.pay.unique && !p.pay.lot && !p.pay.pouch && !p.pay.gem;
  const protectedIds = new Set(preserved);
  for (const choice of choices) {
    const matching = offers.filter(p => matches(p, choice.lane));
    const existing = matching.length ? rng.pick(matching) : undefined;
    if (existing) protectedIds.add(existing.id);
  }
  for (const choice of choices) {
    if (offers.some(p => matches(p, choice.lane))) continue;
    const pool = offers.filter(p => !p.locked && !protectedIds.has(p.id));
    if (!pool.length) continue;
    const p = rng.pick(pool);
    p.pay = rollBudgetBountyPay(host, rng, p.pay.level ?? 1, weights, choice.recipe);
    protectedIds.add(p.id);
  }
}

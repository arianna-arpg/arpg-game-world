// ---------------------------------------------------------------------------
// BOROUGHS — the town-side half of the Borough package: LASTLIGHT'S POPULATION.
//
// Villagers saved at a borough emigrate to Lastlight and the run's population
// counter grows (it lives on the BoroughField overlay and rides the world
// save). Population is designed as an open ECONOMIC INPUT: any system may read
// `world.sim.boroughField?.population` and scale itself by a curve declared
// HERE — the first consumer is Brandt's shelf (a fuller town attracts finer
// wares), and future consumers (scouting parties, town-build gates, new
// settlements) should follow the same shape: one exported curve per consumer,
// tuned in this file, never inline in the engine.
//
// The in-zone event's own numbers (folk, muster, arming, assault) live on the
// package def (packages/defs/borough.ts) — this file is only what the TOWN
// reads, kept engine-importable without touching the package layer.
// ---------------------------------------------------------------------------

import type { ItemRarity } from '../engine/items';
import { VENDOR_ITEM_CFG } from './essences';

export const POPULATION_CFG = {
  /** Lastlight's founding souls (Brandt, Mireille, Aldric, Weslan, Soraya,
   *  and the keeper of the light) — the DISPLAY floor the refugee count sits
   *  on. Perk curves read the refugee count itself, not this. */
  base: 6,

  /** BRANDT'S PROSPERITY CURVE — how the shelf richens as the town fills.
   *  Weights are relative (they sit beside VENDOR_ITEM_CFG.rarityWeights'
   *  commons), so growth shifts the MIX rather than inflating the shelf. */
  vendor: {
    /** Roll weight added per refugee, by rarity. */
    perPop: { magic: 0.9, rare: 0.6 } as Partial<Record<ItemRarity, number>>,
    /** Legends reach the counter only once the town is truly a town: below
     *  this population uniques keep their authored weight (0 — found, not
     *  bought); at and past it, each further soul adds uniquePerPop. */
    uniqueAt: 10,
    uniquePerPop: 0.2,
    /** Ceilings per rarity so a metropolis never drowns the commons. */
    caps: { magic: 70, rare: 40, unique: 6 } as Partial<Record<ItemRarity, number>>,
  },
};

/** Brandt's live rarity table: the authored VENDOR_ITEM_CFG.rarityWeights
 *  lifted by the prosperity curve at the given refugee population. Pure —
 *  buildVendorStock passes the result straight into rollItem. */
export function boroughVendorWeights(population: number): Partial<Record<ItemRarity, number>> {
  const base = VENDOR_ITEM_CFG.rarityWeights;
  if (population <= 0) return base;
  const v = POPULATION_CFG.vendor;
  const out: Partial<Record<ItemRarity, number>> = { ...base };
  for (const [rarity, per] of Object.entries(v.perPop) as [ItemRarity, number][]) {
    const cap = v.caps[rarity] ?? Infinity;
    out[rarity] = Math.min(cap, (out[rarity] ?? 0) + per * population);
  }
  const past = population - v.uniqueAt;
  if (past >= 0) {
    out.unique = Math.min(v.caps.unique ?? Infinity, (out.unique ?? 0) + v.uniquePerPop * (past + 1));
  }
  return out;
}

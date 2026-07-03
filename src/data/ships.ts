// ---------------------------------------------------------------------------
// SHIPS — the Voyage system's meta-progression, as data.
//
// Every account sails SOMETHING (the tier-0 dinghy is free); better hulls are
// bought in the Vault with account credits (the roguelite meta-currency) and
// persist across runs — the naval half of the town-feature ladder. A ship is
// pure LEVERS on the Voyage: hull speed, spyglass reach (how far the sea
// streams/reveals around you), and landing seamanship (how fast you make
// landfall). Adding a tier = one entry here + one FEATURE flag + one Vault
// row; the Voyage reads `shipOf(account)` and nothing else.
//
// This is the springboard the roadmap builds on: ship CRAFTING, hull slots,
// mercenary crews, an Immortal-mode flagship — all future rows on this table.
// ---------------------------------------------------------------------------

import { FEATURE, type Account } from '../meta/account';

export interface ShipDef {
  id: string;
  name: string;
  /** Ladder position (highest OWNED tier sails). Tier 0 = the free dinghy. */
  tier: number;
  /** Account feature flag that grants this hull (tier 0 needs none). */
  flag?: string;
  /** Boat move-speed multiplier (stacks on VOYAGE_CFG.boatSpeedMul). */
  speedMul: number;
  /** Spyglass: stream + island-reveal radius multiplier — a taller mast sees
   *  further, so better ships CHART more of the sea per league sailed. */
  spyglassMul: number;
  /** Landing-dwell multiplier (lower = a practiced crew beaches faster). */
  landingMul: number;
  /** Render scale of the hull (and a slightly prouder sail). */
  hullScale: number;
  /** Hull timber tint. */
  color: string;
}

/** Ordered ascending by tier; shipOf picks the highest owned. */
export const SHIPS: readonly ShipDef[] = [
  { id: 'dinghy',     name: 'Weathered Dinghy', tier: 0,
    speedMul: 1,    spyglassMul: 1,    landingMul: 1,    hullScale: 1,    color: '#6a4a28' },
  { id: 'sloop',      name: 'Coastal Sloop',    tier: 1, flag: FEATURE.SHIP_SLOOP,
    speedMul: 1.15, spyglassMul: 1.25, landingMul: 0.85, hullScale: 1.15, color: '#7a5a32' },
  { id: 'brigantine', name: 'Brigantine',       tier: 2, flag: FEATURE.SHIP_BRIGANTINE,
    speedMul: 1.32, spyglassMul: 1.55, landingMul: 0.7,  hullScale: 1.3,  color: '#8a6a3c' },
  { id: 'galleon',    name: 'Storm Galleon',    tier: 3, flag: FEATURE.SHIP_GALLEON,
    speedMul: 1.5,  spyglassMul: 1.9,  landingMul: 0.55, hullScale: 1.5,  color: '#9a7a46' },
];

/** The account's best owned hull (the free dinghy when nothing is bought). */
export function shipOf(account: Account | null | undefined): ShipDef {
  let best = SHIPS[0];
  if (!account) return best;
  for (const s of SHIPS) {
    if (s.tier > best.tier && (!s.flag || account.features.has(s.flag))) best = s;
  }
  return best;
}

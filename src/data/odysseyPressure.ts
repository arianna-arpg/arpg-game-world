/** Shared contract for a faction mechanic. Each row owns its unlock and pacing;
 * multiple rows may belong to one faction and unlock at different tiers. */
export interface OdysseyPressureDef {
  id: string; faction: string;
  /** Eliminated factions required. Tier zero is always dormant. */
  startsAfter: number;
  /** Indexed by eliminated factions; index zero is unused while dormant. */
  everySec: number[];
  preparedInterval: number;
}

/** Hold the final authored value when a larger roster permits further tiers. */
export function odysseyTierValue(values: readonly number[], tier: number): number {
  return values[Math.min(values.length - 1, Math.max(0, Math.floor(tier)))];
}

export function odysseyPressureInterval(def: OdysseyPressureDef, tier: number, prepared: boolean): number {
  return odysseyTierValue(def.everySec, tier) * (prepared ? def.preparedInterval : 1);
}

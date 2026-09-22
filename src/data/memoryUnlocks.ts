// Account discovery and secondary access are separate, tunable experiments.
// Registry membership supplies the catalog; no skill/support roster lives here.
export type MemoryKind = 'skill' | 'support';
export type MemoryUnlockTier = 'discovery' | 'secondary';
export type MemorySecondaryMechanic = 'tree' | 'commission' | 'prestige';

export interface MemoryUnlockDef {
  id: string;
  tier: MemoryUnlockTier;
  label: string;
  description: string;
  cost: number;
  /** Per-entry weights, not category shares. Equal weights = one uniform pool. */
  weights: Record<MemoryKind, number>;
}

export const MEMORY_UNLOCKS: MemoryUnlockDef[] = [
  { id: 'memory_discovery', tier: 'discovery', label: 'Discover a Memory', cost: 30,
    description: 'Unlock one random skill or support you have not unlocked yet. It joins your find and selection pools permanently. Every eligible Memory has the same chance; no duplicates.',
    weights: { skill: 1, support: 1 } },
  { id: 'memory_secondary', tier: 'secondary', label: 'Awaken a Skill', cost: 90,
    description: 'After your account reaches the second Odyssey victory, awaken one random skill already in your find pool. Awakening opens its skill tree and commissioning access. Earlier legendary finds awaken at that milestone. Already awakened skills cannot repeat.',
    weights: { skill: 1, support: 0 } },
];

export const MEMORY_UNLOCK_CFG = {
  /** Retained for comparison; random draws replace the old bundle shelf by default. */
  legacyGemBundles: false,
  /** Temporary debugging shortcut. Remove from the player economy after experiments. */
  showDebugCodex: true,
  debugCodexBypassesSecondary: true,
  /** 'drop' uses the authored loot weights; 'uniform' ignores rarity/level weighting. */
  weighting: 'uniform' as 'uniform' | 'drop',
  /** Optional exclusions/overrides for subsequent pool experiments. kind:id keys. */
  excluded: [] as string[],
  weightOverrides: {} as Record<string, number>,
  secondary: {
    mechanics: { tree: true, commission: true, prestige: true } as Record<MemorySecondaryMechanic, boolean>,
    /** Only skills have rarity today. Supports retain their existing commission rules. */
    kinds: ['skill'] as MemoryKind[],
    legendaryFinds: true,
    vault: true,
  },
};

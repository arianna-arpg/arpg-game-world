import type { ZoneDef } from './zones';

export type ContainerKind = 'chest' | 'gemCache';
export interface ContainerLootChoice { table: string; weight: number }
export interface ContainerLootRule {
  id: string;
  biomes?: string[];
  tilesets?: string[];
  tags?: string[];
  minBounty?: number;
  add: Partial<Record<ContainerKind, ContainerLootChoice[]>>;
}
/** Added weights change which list is selected, never multiply the number of rewards. */
export const CONTAINER_LOOT = {
  pools: {
    chest: [{ table: 'chest_traveller', weight: 5 }, { table: 'chest_armory', weight: 3 }, { table: 'chest_reliquary', weight: 2 }],
    gemCache: [{ table: 'cache_memory', weight: 1 }],
  } satisfies Record<ContainerKind, ContainerLootChoice[]>,
  rules: [
    { id: 'woodland', biomes: ['grove', 'forest', 'gloamwood', 'jungle'], add: { chest: [{ table: 'chest_forager', weight: 8 }] } },
    { id: 'burial', biomes: ['grave', 'crypt', 'ruins'], add: { chest: [{ table: 'chest_reliquary', weight: 9 }] } },
    { id: 'rich_ground', minBounty: 1.5, add: { chest: [{ table: 'chest_jewels', weight: 8 }], gemCache: [{ table: 'cache_faceted', weight: 2 }] } },
    { id: 'remembering', tags: ['remembering'], add: { chest: [{ table: 'chest_reliquary', weight: 12 }], gemCache: [{ table: 'cache_faceted', weight: 4 }] } },
  ] as ContainerLootRule[],
};
export function containerLootChoices(kind: ContainerKind, zone: ZoneDef): ContainerLootChoice[] {
  const override = zone.containerLoot?.[kind];
  if (override) return [{ table: override, weight: 1 }];
  const choices: ContainerLootChoice[] = [...CONTAINER_LOOT.pools[kind]];
  for (const rule of CONTAINER_LOOT.rules) {
    if (rule.biomes && !rule.biomes.includes(zone.biome ?? '')) continue;
    if (rule.tilesets && !rule.tilesets.includes(zone.tileset ?? '')) continue;
    if (rule.tags && !rule.tags.some(tag => zone.containerLootTags?.includes(tag))) continue;
    if (rule.minBounty !== undefined && (zone.bounty ?? 1) < rule.minBounty) continue;
    choices.push(...(rule.add[kind] ?? []));
  }
  return choices;
}
export function selectContainerLoot(kind: ContainerKind, zone: ZoneDef, rng: () => number = Math.random): string {
  const choices = containerLootChoices(kind, zone).filter(row => row.weight > 0);
  let roll = rng() * choices.reduce((sum, row) => sum + row.weight, 0);
  for (const row of choices) { roll -= row.weight; if (roll <= 0) return row.table; }
  return choices.at(-1)?.table ?? CONTAINER_LOOT.pools[kind][0].table;
}

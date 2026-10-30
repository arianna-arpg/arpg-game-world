import { Rng } from '../core/rng';
import { FOREST_TREES, FOREST_UNDERSTORY, type BiomeDecoration, type ForestTreeMix } from '../data/biomeDecoration';
import { TILESETS, pickTilesetForBiome, type TilesetDef } from '../data/tilesets';
import type { StampSpec, ZoneDef } from '../data/zones';
import { BIOMES } from '../world/biomes';
import { localeSeed } from '../world/locales';
import { isDecorationStamp } from './levelgen';

/** One recipe bake for both discoveries and legacy regions. No generation draws. */
export function bakeBiomeDecoration(tileset: TilesetDef, layout: StampSpec[], biome: string | undefined,
  params: Record<string, unknown>, density = 0.65): BiomeDecoration {
  const trees = params.forestTrees as ForestTreeMix[] | undefined
    ?? (tileset.forceLayout === 'forest' || (biome && BIOMES[biome]?.allowedLayouts?.forest) ? FOREST_TREES : undefined);
  return {
    density,
    layout: structuredClone([...(trees?.length ? FOREST_UNDERSTORY : []), ...layout.filter(s => isDecorationStamp(s.kind))]),
    ...(trees?.length ? { trees: structuredClone(trees) } : {}),
  };
}

function recoverDecoration(source: ZoneDef): BiomeDecoration | undefined {
  // Old children did not carry variantName/layoutParams; prefer their saved root.
  // A retired/missing tileset can fall back to the saved biome on a private stream.
  const tileset = (source.tileset ? TILESETS[source.tileset] : undefined)
    ?? (source.biome ? TILESETS[pickTilesetForBiome(source.biome,
      new Rng(localeSeed(`${source.complex?.root ?? source.id}/legacy-decoration`)), source.geo?.biomeDepth,
      source.dimension, source.geo?.climate) ?? ''] : undefined);
  if (!tileset) return undefined;
  const variant = tileset.variants?.find(v => v.name === source.variantName);
  return bakeBiomeDecoration(tileset, [...(tileset.common ?? []), ...(variant?.layout ?? tileset.layout)], source.biome ?? tileset.biome,
    { ...(source.biome ? BIOMES[source.biome]?.layoutParams : undefined), ...tileset.layoutParams,
      ...variant?.layoutParams, ...source.layoutParams });
}

/** Fill only missing decoration records. Never rebuild plans/graphs or touch
 * activities, access, memories, identities or existing density overrides.
 * rootId scopes the same migration to an already-running session's next visit. */
export function migrateAdventureDecoration(zones: Record<string, ZoneDef>, rootId?: string): number {
  const recipes = new Map<string, BiomeDecoration | undefined>();
  let changed = 0;
  for (const z of Object.values(zones)) {
    if (!z.locale || !z.complex || z.localeDecoration !== undefined || (rootId && z.complex.root !== rootId)) continue;
    const root = zones[z.complex.root];
    const source = root?.locale && root.complex?.root === z.complex.root ? root : z;
    if (!recipes.has(source.id)) recipes.set(source.id, source.localeDecoration ?? recoverDecoration(source));
    const recipe = recipes.get(source.id);
    if (!recipe) continue;
    z.localeDecoration = { ...structuredClone(recipe), density: z.sky === 'sheltered' ? 0.3 : 0.65 };
    changed++;
  }
  return changed;
}

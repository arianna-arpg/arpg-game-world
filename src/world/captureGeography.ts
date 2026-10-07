/** Capture after native content registration and explicit world geography binding.
 * This function does not bind a world, move anchors or derive a new capital. */
import { BIOMES, BIOME_FIELD, BIOME_FIELD_BANDS, BIOME_FLOORS, BIOME_FIELD_CFG, OCEAN_BIOME, MARINE_MINT, PORT_MINT } from './biomes';
import { CONTINENT_CFG } from './continents';
import { captureNativeClimateSource } from './climate';
import { captureDimensionDefinitions } from './dimensions';
import { TILESETS, TILESETS_BY_BIOME, REALM_TILESETS_BY_BIOME } from '../data/tilesets';
import { copyNativeGeographyData, hydrateNativeGeographySource, type NativeGeographySource } from './geographySource';

export function captureNativeGeographySource(seed: number): Readonly<NativeGeographySource> {
  // Copy registry containers before Object.entries can discard unsupported own
  // descriptors, symbols or inherited state. The climate owner does the same
  // before copying its private effective dimension overrides.
  const biomes = copyNativeGeographyData(BIOMES), tilesets = copyNativeGeographyData(TILESETS);
  const shared = copyNativeGeographyData(TILESETS_BY_BIOME), realms = copyNativeGeographyData(REALM_TILESETS_BY_BIOME);
  const dimensions = captureDimensionDefinitions(copyNativeGeographyData);
  return hydrateNativeGeographySource({ schema:1,algorithm:'native-geography-v1',seed,
    continent:CONTINENT_CFG,climate:captureNativeClimateSource(),biomes:Object.entries(biomes),
    field:{table:BIOME_FIELD,bands:BIOME_FIELD_BANDS,floors:BIOME_FLOORS,geometry:BIOME_FIELD_CFG,
      oceanBiome:OCEAN_BIOME,marineMint:MARINE_MINT,portMint:PORT_MINT},
    dimensions:Object.entries(dimensions),tilesets:Object.entries(tilesets),
    pools:{shared:Object.entries(shared),realms:Object.entries(realms).map(([realm,pools])=>[realm,Object.entries(pools)])},
  }).source;
}

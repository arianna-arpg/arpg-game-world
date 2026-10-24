/** Capture after native content registration and explicit world geography binding.
 * This function does not bind a world, move anchors or derive a new capital. */
import { BIOMES, BIOME_FIELD, BIOME_FIELD_BANDS, BIOME_FLOORS, BIOME_FIELD_CFG, OCEAN_BIOME, MARINE_MINT, PORT_MINT } from './biomes';
import { CONTINENT_CFG } from './continents';
import { captureNativeClimateSource } from './climate';
import { captureDimensionDefinitions } from './dimensions';
import { TILESETS, TILESETS_BY_BIOME, REALM_TILESETS_BY_BIOME } from '../data/tilesets';
import { snapshotNativeGeographyData, hydrateNativeGeographySource, type NativeGeographySource } from './geographySource';

// Rows are pure assembly of our immutable registry snapshots. Live registry
// descriptors and every child are still checked by snapshotNativeGeographyData
// on every capture; a changed snapshot receives new rows. Hydration retains its
// full prototype guard, semantic validation and private per-reader state.
const capturedRegistryRows = new WeakMap<object, unknown[]>();
function registryRows<T>(snapshot: Record<string, T>): [string, T][] {
  const known = capturedRegistryRows.get(snapshot);
  if (known) return known as [string, T][];
  const rows = snapshotNativeGeographyData(Object.entries(snapshot));
  capturedRegistryRows.set(snapshot, rows);
  return rows;
}

// Keep at most one complete captured source. Comparison sees only our owned
// frozen copies; every live descriptor and child was checked before this point.
let previousCapture: { snapshot: unknown; source: Readonly<NativeGeographySource> } | undefined;
function sameSnapshot(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Reflect.ownKeys(a), prior = Reflect.ownKeys(b);
  if (keys.length !== prior.length) return false;
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] !== prior[i] || !sameSnapshot(Object.getOwnPropertyDescriptor(a, keys[i])!.value, Object.getOwnPropertyDescriptor(b, prior[i])!.value)) return false;
  }
  return true;
}

export function captureNativeGeographySource(seed: number): Readonly<NativeGeographySource> {
  // Copy registry containers before Object.entries can discard unsupported own
  // descriptors, symbols or inherited state. The climate owner does the same
  // before copying its private effective dimension overrides.
  const biomes = snapshotNativeGeographyData(BIOMES), tilesets = snapshotNativeGeographyData(TILESETS);
  const shared = snapshotNativeGeographyData(TILESETS_BY_BIOME), realms = snapshotNativeGeographyData(REALM_TILESETS_BY_BIOME);
  const dimensions = captureDimensionDefinitions(snapshotNativeGeographyData);
  const snapshot = snapshotNativeGeographyData({ schema:1 as const,algorithm:'native-geography-v1' as const,seed,
    continent:CONTINENT_CFG,climate:captureNativeClimateSource(),biomes:registryRows(biomes),
    field:{table:BIOME_FIELD,bands:BIOME_FIELD_BANDS,floors:BIOME_FLOORS,geometry:BIOME_FIELD_CFG,
      oceanBiome:OCEAN_BIOME,marineMint:MARINE_MINT,portMint:PORT_MINT},
    dimensions:registryRows(dimensions),tilesets:registryRows(tilesets),
    pools:{shared:registryRows(shared),realms:registryRows(realms).map(([realm,pools])=>[realm,registryRows(pools)])},
  });
  const previous = previousCapture, matched = !!previous && sameSnapshot(snapshot, previous.snapshot);
  const hydrated = hydrateNativeGeographySource(matched ? previous!.source : snapshot);
  // A cold restored source has different immutable nodes from the live registry
  // snapshot. Prove that pair once, then compare later live snapshots against
  // their own prior tree. A guarded hydration fallback needs a fresh proof.
  previousCapture = hydrated.identity.length * 2 <= 2 * 1024 * 1024
    && (matched && hydrated.source === previous!.source || sameSnapshot(snapshot, hydrated.source))
    ? { snapshot, source: hydrated.source } : undefined;
  return hydrated.source;
}

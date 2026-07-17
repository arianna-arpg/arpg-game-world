# Dimensions — sealed parallel worlds (`world/dimensions.ts`)

A dimension is a registry row (`registerDimension`): its own biome palette,
level pressure, climate axes, event tempo, entry mechanism, sky exposure and
courses — everything else rides the one generation infrastructure. The
surface is dimension zero; the Underworld and the Aetherial are rows; a
limbo or mirror-world is a row away.

## The seal (the load-bearing invariants)

**Dimensions are sealed world-states.** The marked gate edge
(`ZoneExitDef.crossDim`, minted ONLY by `World.enterDimension` via
`ZoneSpec.gateCross`) is the one lawful road between two dimensions. Every
edge-mint path enforces it:

- `placeZoneAt` back-edge + `linkBack` reciprocal — refuse + warn on a
  dimension mismatch.
- `weaveConnections`, `nearestLinkable`, `linkBackTo`, `connectFloatingZone`,
  `nearestNode` — all same-dimension only.
- `isIllegalCrossDim` seals anything that slips through at the portal
  (label: *"a sealed rift"*), and the **loadZone heal** now strips unmarked
  cross-dimension edges permanently (old saves self-heal into absence, not
  into dead portals).

**Roadless gate hubs** (`DimensionEntry.road: false` — the Firmament): the
hub's edge set is exactly its minted fan (`GATE_FANOUT`), forever. One
predicate — `isRoadlessGateHub()` — is consulted by the weaver, the linkers,
the floating-zone anchor picker and the load heal (which trims accreted
saves back to the fan and drops partner reciprocals). The weave was the last
linker missing the rule; that was the "Firmament exit leading back to the
Firmament" loop.

**The realm palette** (`TilesetDef.realm`): a tileset may belong to a
dimension's own biome pools while staying invisible to every surface roll
(`frontier: false`). `pickTilesetForBiome(biome, rng, depth?, realm?)`
unions the surface pool with the realm pool for dimension mints — hell keeps
riding shared frontier tilesets (its rift-biome ground also mints on the
surface under demon warps); the Aetherial's four faces are realm-locked.
**One flag, one meaning**: `frontier` gates the surface field, `realm`
grants a dimension's field. Before this split, realm-locking the aether
faces starved `dimensionBiomeAt`'s pick and every aetherial mint fell back
to the inherited corridor tileset — the whole heaven minted as
wasteland/rift ("marked as Firmament, but leads to the Underworld's rift").

**Boot validation** (`validate.ts`): every dimension's palette biome, gate
biome, and course biome must resolve at least one tileset through ITS pool —
a coverage hole now fails loudly at boot instead of minting hell silently.

**Sky exposure** (`DimensionDef.sky`): what a dimension's zones derive in
`skyOf()` when their def doesn't say — `'sheltered'` (default; the
underworld has a roof of world) or `'open'` (the Aetherial IS the sky:
weather, wind, strikes and the radiance scalar all reach it). Cave pockets
derive sheltered off `caveDepth` regardless.

**Vertical hygiene**: ground that HANGS (`ZoneDef.below`) and off-surface
ground never host a Descent delver's shaft (`placeDescentDelver` — a
mineshaft through a cloud is nonsense, classified by what the zone IS, not
by an allowlist).

## The gate lifecycle

`enterDimension(dimId)` mint-onces the gate zone anchored at the surface
origin's coordinate (the chain's first record), fanning `GATE_FANOUT`
frontiers; roadless dims mint no cross-edge in either direction and refuse
waypoints (`DimensionDef.waypoints: false` — heaven is crossed, never
teleported into). Re-entry reuses the minted gate. The `over` tie
(`DimensionDef.over`) resolves what hangs beneath every realm zone — falls
and the understory both read it.

## The gate on all of it

`balance/probe_dimensions.ts` — registry-driven (every registered dimension
with an entry runs the same battery): the ascent arc (shelf biome, Crossing
name, no delver), gate biome honesty, whole-web palette membership over a
3-ring crawl, the roadless hub fan + inbound ledger, the roaded gate's ONE
marked crossing, synthetic save heals, a global unmarked-edge scan, and the
determinism the fabric actually promises (seeded gate + pure palette field).
Run it after ANY worldgen/linker/dimension change.

# The Climate Field — the biome heat map as structural geography

`src/world/climate.ts` (pure leaf) + the affinity-weighted pick in
`src/world/biomes.ts` (`fieldBiomePick`). The biome field used to roll each
Voronoi cell from flat `BIOME_FIELD` weights; it now rolls from
**weight × climate affinity**, where the climate is a stack of named scalar
AXES sampled at the cell's site. Deserts coalesce where it runs hot and dry,
tundra claims the cold steppes, coastal biomes hug real shores, and hazard
biomes bloom with distance from home. Same machinery, three tiers:

- **Surface**: `biomeAt(coord, fieldSeed)` — the world map's source of truth.
- **Dimensions**: `dimensionBiomeAt(dimId, …)` runs the SAME pick over the
  dimension's palette under its own axis overrides (`DimensionDef.climate`) —
  the Underworld runs hot/arid so volcanic country pools in its hottest
  reaches while gravelands keep the cooler marches.
- **Voyage islands**: `islandAtCell` folds each `VoyageIslandDef.climate`
  gate into the island pick at that island's own waters — ember atolls in
  warm seas, sirens in the frigid ones.

Everything below is data. No literal ids, no engine edits to extend.

## Axes

`CLIMATE_AXES` registry (`registerClimateAxis`). An axis = a 0..1 field built
from composable layers:

| layer | contribution |
|---|---|
| `noise` | smooth 2-lattice value noise, ±`amp`, feature size `cell` |
| `radial` | 0 inside `innerRadius` rising to +`amp` over `span`, from home |
| `coastal` | ocean-adjacency probe → up to +`amp` near/on the sea |
| `landmass` | stable per-continent hash bias ±`spread` (home pinned 0) |
| `const` | flat push (dimension overrides mostly ride this) |

Default axes: `temperature`, `moisture` (both noise + landmass flavor;
moisture also coastal), `wildness` (radial-from-home + noise — the danger
geography twin of the level field), `maritime` (pure coastal). Radial layers
anchor on the town's canonical coord via `setClimateOrigin` (called once in
the WorldSim constructor — static data, identical on host and clients).

The `landmass` layer is what makes VOYAGES matter: every continent carries a
coherent hash-flavored signature (one runs scorched, another drowned), so a
far landfall reads as a different world, not the same mix. The home landmass
is pinned neutral.

## Bands and affinity

`CLIMATE_BANDS` — named envelopes PER AXIS (`registerClimateBand`), the
shared vocabulary: `frigid/cold/mild/warm/hot/scorching`,
`arid/dry/damp/wet/drowned`, `settled/frontier/deepwild`,
`inland/shorebound`. Envelope math is `engine/presence.ts`'s `LevelEnvelope`
evaluated on the axis' 0..1 value (`presenceMul` is unit-agnostic).

`BiomeInfo.climate` declares a biome's geography as one line:

```ts
desert: { climate: { temperature: 'warm', moisture: 'dry' }, ... }
forest: { climate: { temperature: 'mild', moisture: 'damp' }, ... }
```

Envelopes multiply across axes. A cell whose climate zeroes EVERY candidate
falls back to the raw weights — the world never starves; `validateBiomeClimate`
(+ the voyage-island sweep in `data/validate.ts`) flags unknown axes/bands at
boot instead.

**Weights are conditioned-equilibrium tuned**: a biome whose gate holds over
part of the world carries a HIGHER seed weight to keep its global share —
where its climate holds it DOMINATES (coherent regions, not confetti), and it
simply doesn't exist elsewhere. `grave` stays unconditioned on purpose (the
universal filler that guarantees every cell keeps a candidate).

## What zones carry

`placeZoneAt` bakes `geo.climate` (the axes at the minted coord, rounded)
next to `geo.biomeDepth` via the `ZoneSpec.climateFor` sampler
(`World.climateFor`, dimension-aware — the biomeFor closure pattern).
Generators read both through `layoutParam`/`def.geo`: the forest recipe
scales canopy coverage with `biomeDepth` (the region's heart is a
near-sealed roof); a future generator can key anything off the axes.

## Tuning recipe

Distribution QA is a console sweep (the shipped tune came from it):

```js
const B = await import('/src/world/biomes.ts');
const seed = __game.world().sim.biomeField.fieldSeed;
const counts = {};
for (let y = -9000; y <= 9000; y += 150)
  for (let x = -9000; x <= 9000; x += 150) {
    const b = B.biomeAt({ x, y }, seed); counts[b] = (counts[b] ?? 0) + 1;
  }
```

Lessons already banked: strict conjunctions starve (`hot`∧`arid` left desert
at 0.5% of land — loosened to `warm`∧`dry`); split shared belts ecologically
instead of stacking gates (tundra = cold+dry steppe, taiga = cold+wet
forest). Remember the far field dominates a wide sweep by area — check a
near-home ring separately when tuning the settled belt.

## Adding things

- **New biome**: `BIOMES` row (+ `climate`) + `BIOME_FIELD` seed + a tileset
  carrying `biome:` — the existing checklist, plus one climate line.
- **New axis**: `registerClimateAxis` — then any biome/island/dimension can
  reference it (a package could register `corruption` and pump it).
- **New band**: `registerClimateBand(axis, name, envelope)`.
- **New dimension**: `registerDimension` with `climate` overrides — its
  palette self-organizes under its own weather.
- **New island kind**: `registerVoyageIsland` with a `climate` gate.

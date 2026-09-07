# THE ATLAS FABRIC — the world map as shown ground, and the features zones inherit

**Status: v1 built 2026-09-07 on the `worldmap-atlas` branch.** Every number is
a DIAL (unblessed). Charter with the open forks: `docs/design/world-atlas.md`.
Probe: `npx tsx balance/probe_atlas.ts` (fast lane). Live-walked on
`arpg-dev-worldmap` (:5289, the worktree's own dev server).

The map used to *tell*: a 40×40 lattice of faint biome rectangles under a node
graph, river threads on top. The atlas *shows*: the same foreordained fields
(continents → climate and elevation → biome → rivers) painted as a relief
chart, and the notable places on those fields — summits, lodes, lake basins —
computed whole from the seed, drawn on the chart, and **inherited by the zones
minted on them**. One seed, one finder, two consumers: what the map draws is
what the world grows.

## The pieces

| Piece | Module | One line |
|---|---|---|
| THE CHART's laws | `world/atlas.ts` (`ATLAS_CFG`, `atlasShade`, `contourBand`, `climateWords`) | the pixel law + every dial, pure and node-safe |
| THE FEATURES | `world/atlas.ts` (`registerMapFeature`, `featuresInRect`, `featuresAt`, `foldFeatureHits`, `featureHarvestOf`) | the kind registry, the finders, the mint fold |
| THE DATA | `data/atlasFeatures.ts` (`ATLAS_GLYPHS`, the three kind rows) | which glyph a biome wears; peak / lode / lake |
| THE PAINTER | `ui/atlasPaint.ts` (`atlasChart`, `registerGlyphPainter`) | the progressive raster + the vector dressing |
| THE PANEL | `ui/panels.ts` (`paintedChart`, `updateMapHere`) | the `<image>` under the graph, labels, chips, the cursor read |
| THE MINT | `engine/worldgen.ts` (placeZoneAt) | folds `featuresAt(target)` into `ZoneDef.geo` + the roll lists |
| THE READERS | `engine/levelgen.ts` ('elevation' gen field), `engine/world.ts` (`bootHarvest`), the zone pane | read the def, never the registry |
| THE SEED | `world/sim.ts` (`setAtlasSeed` beside `setReliefSeed`) | the one installed truth |

## The chart

`ui/atlasPaint.ts` builds ONE raster per (dimension, box, layers, visible
set, warp signature) key and hands the panel a data URL placed as a single
pointer-transparent `<image>` in node units under the node graph — the
interactivity contract (`ui/mapConfig.ts`) is untouched: only zone geometry
answers the cursor, labels ride the over-group like every badge.

**The pipeline** (each phase budgeted by `ATLAS_CFG.raster.budgetMs`; the
old raster stands until the new one is whole — the progressive law):

1. **Sample** the fields on a pixel lattice (`raster.lattice` px): biome
   (the sim's *composed* field — warps honored with attribution, as the old
   wash did), terrain kind (land / ocean / bridge) and elevation. Ground
   beyond THE VEIL is never sampled.
2. **Shore**: a chamfer distance transform over the lattice — every water
   cell knows its distance to land (the shelf), every land cell to water.
3. **Shade** every pixel through `atlasShade` — THE PIXEL LAW:
   - flat land keeps its biome's `mapColor` **exactly** (probe B1);
   - hillshade from the elevation gradient, lit from the north-west
     (`shade.light`, `shade.gain`, `shade.ambient`, `shade.maxLift`) — a
     face turned to the light lifts, one turned away sinks;
   - a hypsometric lift (`hypso.gain`) — highlands read high at any zoom,
     exactly 1.0 at elevation 0.5;
   - alpine rock then snow above `alpine.from` / `snow.from`;
   - the sea deepens off its shelf (`sea.shelf`, `sea.shallow` → `sea.deep`)
     with a foam fringe at the coast;
   - contour bands (`contour.interval`, darkened by `contour.alpha`), paper
     grain, and THE CRISP EDGE — where the lattice's 2×2 neighbourhood
     disagrees on biome or terrain, the pixel asks the fields exactly.
4. **Vector dressing** on the same canvas: lake basins first, then the
   rivers as tapered threads (`rivers.width` spring → mouth, smoothed
   through segment midpoints), then biome DRESSING glyphs (`ATLAS_GLYPHS`
   per biome → a registered painter; one shared lattice, each biome's
   spacing thinning it by probability; never denser than
   `glyphs.minSpacingPx`), then the feature marks. Names come back as label
   rows the panel prints as italic SVG text with a dark halo.
5. **Encode** to a PNG data URL.

**THE VEIL.** A coarse mask (`reveal.cell`) is stamped by every *visible*
node (plus berths): full within `reveal.radius`, fading over
`reveal.feather`, void beyond. This is the old wash's envelope law as a soft
edge, and it keeps the forechart honest — terrain is seed truth, never node
positions, so a veiled ahead-minted zone is never betrayed by the ground it
stands on. The mask also gates every river segment, glyph, mark and label.

**THE SEAM WARP** (`seams`): the biome/terrain *sample* reads a coordinate
wandered by a smooth noise (±`warp` units) so Voronoi seams and coastlines
bend organically instead of ruling straight. Presentation only — below node
grain; rivers, features and elevation read the true coordinate, and every
mint samples the true field.

**THE ZOOM WINDOW** (`raster.zoomWindowFrom`, `zoomWindowPad`): zoomed past
the threshold, the painter renders the *view* (with a margin) at full
resolution instead of the whole charted country, snapped coarsely so small
pans re-use the raster; zoom and pan kick the painter at once.

**Non-surface dimensions** paint their own biome palette
(`World.dimensionBiomeAtMap`) flat — no relief, no rivers, no features.

**Chips + settings.** `Settings.mapChart` (`MAP_CHART_MODES`: 'painted' |
'classic'; Options → Map Chart) — classic is the pre-atlas wash, kept for QA
and taste. Under 'painted' the biome-field layer's wash and river threads
stand down (their chip too) and the atlas chips take their place: Relief,
Rivers, Features, Dressing (`ATLAS_LAYER_CHIPS`, ids `atlas:*`).

**THE CURSOR READ** (`#map-here`): the ground under the pointer, from the
same fields the chart paints — biome · elevation · the climate bands' own
words (`climateWords`: the band that claims the value hardest, ties to the
narrowest) · any feature within reach. Fog-honest: only near visible nodes.

## The features

A kind is one `MapFeatureKindDef` row (`registerMapFeature`, data in
`data/atlasFeatures.ts`):

| field | meaning |
|---|---|
| `find` | how instances are FOUND — `peaks` (local maxima of the elevation axis on a jittered lattice: at/above `minElevation`, higher than all eight neighbouring sites), `strewn` (a lattice deal: `chance`, land only, `gates` = plain bands over climate axes), `lakes` (a traced river that ended INLAND — not at the sea, not at the reach bound — sized by its run) |
| `reach` | node units: a zone minted within this of the seat inherits |
| `inherit` | `landmarks` / `compositions` (rolls appended after the zone's own), `layoutParams` (merged between the course's and the spec's), `harvest` (`bonus` count rolled after the zone's own draws, `always` skips the stand roll), `relief` (`lift` + `dome` on the zone's own height field) |
| `names` | "the {first} {second}" off the cell hashes — stable per seed |
| `glyph` / `icon` / `color` / `size` / `read` | the chart mark, the pane icon, the pane's second line |

Instances are `MapFeature { id: '<kind>:<a>_<b>', seat, name, size, value }`;
the id encodes the finder cell (lattice kinds) or the rounded seat (lakes),
so a def's baked ids re-resolve to their names on any later read
(`featureNameOf`).

**Debut rows** — peak (summit: `lone_mountain` roll + a relief lift of
0.16 / dome 0.3), lode (ore country, elevation ≥ 0.5: harvest `always` +
`bonus` 2–4), lake (basin: `great_lake` 0.75 / `lake` 0.5).

## The mint fold — THE FRONTIER LAW

`placeZoneAt` calls `featuresAt(target)` only for a **random-frontier surface
mint** (`spec.fieldBiome && !spec.dimension` — the course fabric's
discipline). Hits fold into:

- `ZoneDef.geo.features` (the ids) and `geo.relief` (the summed lift/dome),
  beside `geo.biomeDepth` / `geo.climate` — the def carries the truth;
- the landmark and composition roll lists, appended AFTER the zone's own and
  the course's rows (tail draws — every feature-less mint's stream is
  untouched; probe C11 pins byte-identity with the fabric uninstalled);
- `layoutParams`, merged below the mint spec's.

Directed mints (quests, events, realms, caves) never look. No installed
seed (a headless rig that never calls `setAtlasSeed`) means no features.

**The readers** read the DEF: levelgen's `'elevation'` gen field adds
`geo.relief.lift` and domes by `geo.relief.dome` (absent = byte-identical —
the summit's crag stamps find the heights they ask for); `World.bootHarvest`
reads `featureHarvestOf(def.geo.features)` after the zone's own two draws;
the zone pane names each feature with its kind's `read` line.

## Adding things

- **A feature kind**: one `registerMapFeature` row in `data/atlasFeatures.ts`
  (a finder, a reach, an inherit block, names). Nothing in the engine names
  a kind. A new finder shape is one case in `cellFeature` / `featuresInRect`.
- **A biome's dressing**: one `ATLAS_GLYPHS` row (glyph id, spacing, size).
- **A glyph painter**: `registerGlyphPainter(id, fn)` in `ui/atlasPaint.ts`.
- **A chart dial**: `ATLAS_CFG`.

## Known gaps (see the charter's forks)

- Features are macro truth like the biome wash: no survey is needed to see
  a summit inside the veil. Whether summits/lodes should be *found* (a
  survey, a walk) is her call.
- Lakes are rare (a traced river seldom dies inland under the coastal
  falloff) — a dial question on `RELIEF_CFG` as much as on the finder.
- The lode grants MORE of the country's own harvest rows; a dedicated ore
  family (a new `HarvestNodeDef` admitted by feature) is charted, not built.
- Directed mints (quests) do not inherit — by law; an opt-in flag is a
  one-line fork.
- No world editor yet: the chart is a read surface plus the cursor read.
  Planting a feature by hand is the charter's M2.

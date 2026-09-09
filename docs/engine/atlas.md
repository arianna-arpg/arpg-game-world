# THE ATLAS FABRIC — the world map as shown ground, and the features zones inherit

**Status: v1 built 2026-09-07, v1.1 (THE KNOWLEDGE LAW, THE DEV LENS, THE
STANDING CHART) 2026-09-08, on the `worldmap-atlas` branch.** Every number is
a DIAL (unblessed). Charter with the open forks: `docs/design/world-atlas.md`.
Probe: `npx tsx balance/probe_atlas.ts` (fast lane). Live-walked on
`arpg-dev-worldmap` (:5289, the worktree's own dev server; `?dev` for the lens).

The map used to *tell*: a 40×40 lattice of faint biome rectangles under a node
graph, river threads on top. The atlas *shows*: the same foreordained fields
(continents → climate and elevation → biome → rivers) painted as a relief
chart, and the notable places on those fields — summits, lodes, lake basins —
computed whole from the seed, drawn on the chart, and **inherited by the zones
minted on them**. One seed, one finder, two consumers: what the map draws is
what the world grows. And the chart is **the player's knowledge alone**.

## The pieces

| Piece | Module | One line |
|---|---|---|
| THE CHART's laws | `world/atlas.ts` (`ATLAS_CFG`, `atlasShade`, `contourBand`, `climateWords`) | the pixel law + every dial, pure and node-safe |
| THE FEATURES | `world/atlas.ts` (`registerMapFeature`, `featuresInRect`, `featuresAt`, `foldFeatureHits`, `featureHarvestOf`) | the kind registry, the finders, the mint fold |
| THE DATA | `data/atlasFeatures.ts` (`ATLAS_GLYPHS`, the three kind rows) | which glyph a biome wears; peak / lode / lake |
| THE PAINTER | `ui/atlasPaint.ts` (`atlasChart`, `atlasRaster`, `atlasKeep`, `atlasStats`, `registerGlyphPainter`) | progressive rasters, an LRU of finished ones |
| THE PANEL | `ui/panels.ts` (`syncMapLive`, `syncAtlas`, `atlasInputs`, `showZoneCard`, `updateMapHere`) | THE STANDING CHART: everything live synced in place |
| THE KNOWLEDGE LAW | `engine/worldgen.ts` (`ZoneSpec.veiled`, placeZoneAt) + `engine/world.ts` (`visible`) | every mint born veiled; visibility = knowledge |
| THE DEV LENS | `ui/mapLens.ts` + `dev/tabs/atlas.ts` | the omniscient, render-only development view |
| THE MINT | `engine/worldgen.ts` (placeZoneAt) | folds `featuresAt(target)` into `ZoneDef.geo` + the roll lists |
| THE READERS | `engine/levelgen.ts` ('elevation' gen field), `engine/world.ts` (`bootHarvest`), the zone pane | read the def, never the registry |
| THE SEED | `world/sim.ts` (`setAtlasSeed` beside `setReliefSeed`) | the one installed truth |

## THE KNOWLEDGE LAW (her ruling 2026-09-08)

> The visible world map is due to the player and the player's knowledge
> alone. Occasions occur well outside the scope of visibility; the player
> knows of them by running into them, seeing them directly, or hearing a
> rumor.

- **Every graph mint is born VEILED.** `placeZoneAt` stamps `veiled: true`
  on every def unless the spec says `veiled: false` (ground the player stands
  on the moment it exists). A distant event's mint — a crusade hold, a demon
  epicenter, a caravan's far end — no longer pops onto the chart or
  stretches its fit. Old saves keep their unveiled zones (grandfathered).
- **A knowledge act lifts the veil, nothing else does:** entry (`loadZone`
  lifts underfoot and its ring), the one-ring preview off WALKED ground
  (`World.visible` is STRUCTURAL about it — a mint beside you is seen the
  moment it exists; the forechart's invariant pass then clears the flag for
  good), a survey pulse, an omen reveal (the world's rumor), an accepted
  quest (its ground and its anchor are TOLD), a won siege, a sighted port, a
  floating zone met on approach. `World.visible(z)` is the ONE fog seam:
  `!concealed && (!veiled || beside walked ground)`.
- **The chart reads known ground alone.** The painter's reveal set, the
  node graph, the roads (both ends), the map's fit, and — through THE VEIL
  CLIP (`#map-veil-clip`, the same discs the painter's veil uses) — every
  overlay wash (weather, territory, the classic biome wash) draw only
  around known nodes. A front's far extent no longer stretches the fit.
  Markers with `fog: 'always'` (a quest target the giver named) still
  pierce, by their own design.
- **Probe pins:** D1–D7 — a directed mint is born veiled and unseen; beside
  walked ground it is seen at once; a knowledge act lifts it; `veiled:
  false` opts out; and over a lived sim world THE KNOWLEDGE INVARIANT holds
  (every shown minted zone is walked, beside walked ground, or surveyed —
  7 shown of 251 in the rig).

## THE DEV LENS (`ui/mapLens.ts`, the `?dev` Atlas tab)

The all-revealing view is exactly as valuable for development as the honest
one is for play, so it lives as a LENS the map renders through — never as
world state (nothing it shows is stamped on a def, saved, or sent over the
wire; the world's veils stay put — the probe of that is the tab's own read:
"346 veiled" while every node is drawn).

- **Omniscient chart:** every minted node drawn and named (concealed and
  veiled alike, scouted-style), the whole terrain painted with no veil,
  washes unclipped, far overlay extents back in the fit.
- **Cursor read:** a fixed-height strip under the layer chips prints the
  ground under the pointer — biome · elevation · the climate bands' own
  words · features in reach (`updateMapHere`). Off by default: the honest
  chart carries the same read per ZONE in the side box (below).
- **Verbs + the read:** rebuild the chart (drop every cached raster), reset
  the lens; zones minted / shown / veiled / walked / surveyed, the cached
  rasters (px · build ms), the job in flight. Persisted per browser
  (localStorage, the ultimates-lab idiom); the shipped page never reads the
  key, so the lens ships OFF by construction.

## THE STANDING CHART (the panel's performance law)

The map panel used to rebuild its whole html — and so its SVG — whenever
anything in that html changed: the hovered zone, the zoom %, the viewBox,
the side box's text, the chart raster. Each rebuild re-parsed a ~1 MB data
URL and re-drew every node, and a hover flickered the UI twice. Now:

- **The html carries NO transient state.** No viewBox, no zoom %, no hover
  card state, no side-box text, no raster, no labels. It changes only when
  the KNOWN graph does (a charted zone, a layer chip, a pin, the current
  zone). `setPanelHtml` is a string compare; a changed string is the only
  rebuild.
- **Everything live is synced IN PLACE** by `syncMapLive` after every
  refresh, rebuilt or not: the viewBox and zoom label, the hovered card
  (`showZoneCard`), the side box (`zoneBoxHtml`, replaced only when its text
  differs — scroll preserved), and the atlas layer.
- **The atlas layer** is two pointer-transparent `<image>`s inside the SVG
  (`#atlas-base`, `#atlas-window`) plus a `#atlas-labels` group. `syncAtlas`
  asks the painter for the BASE raster (the whole known country) and, zoomed
  past `raster.zoomWindowFrom`, the zoom WINDOW (the view × `zoomWindowPad`,
  snapped coarsely); it sets `href`/rect attributes only when they differ.
  The base always stands; while a window builds, the last window stays where
  it still helps and the base covers the rest — panning never shows blank
  ground. Zoom and pan call `syncAtlas` directly (never a refresh); a build in
  flight re-arms its own 45 ms tick (`scheduleAtlasTick`).
- **The painter** (`atlasPaint.ts`) keeps an LRU of finished rasters
  (`raster.cacheEntries`, keyed by dimension · box · layers · known set ·
  lens · warps); one job builds at a time, in the order asked (base before
  window); `atlasKeep` drops a job for a raster nobody wants any more.
  Progressive phases: sample the lattice (fogged ground never sampled) →
  chamfer shore distances → shade every pixel (`atlasShade`, THE CRISP
  EDGE re-sampling only where the 2×2 lattice disagrees, contour bands,
  grain, the veil alpha) → vector dressing (lakes, rivers, glyphs, marks)
  → encode. `atlasStats` is the dev tab's read.

## The chart (the look)

`atlasShade` — THE PIXEL LAW (probe B): flat land keeps its biome's
`mapColor` **exactly**; hillshade from the elevation gradient lit from the
north-west (`shade`); a hypsometric lift (`hypso`, exactly 1.0 at 0.5);
alpine rock then snow above `alpine.from` / `snow.from`; the sea deepens off
its shelf (`sea`) with a foam fringe; contour bands (`contour`); paper grain.
THE SEAM WARP (`seams`) wanders the biome/terrain *sample* by a smooth noise
so Voronoi seams and coastlines bend organically — presentation only, below
node grain. THE VEIL (`reveal`): full within `radius` of a known node, fading
over `feather`, void beyond. Rivers as tapered threads; lake basins; biome
DRESSING glyphs (`ATLAS_GLYPHS` → registered painters, one shared lattice,
never denser than `glyphs.minSpacingPx`); feature marks + italic labels.
Non-surface dimensions paint their own palette flat.

**Chips + settings.** `Settings.mapChart` ('painted' | 'classic'; Options →
Map Chart). Under 'painted' the biome-field layer's wash and river threads
stand down and the atlas chips take their place: Relief, Rivers, Features,
Dressing (`ATLAS_LAYER_CHIPS`).

**THE GROUND ROW.** The side box shows a zone's lay of the land as a
condition row — `⛰ elevation 0.81 · mild · dry — the lay of the land` — from
the def's baked `geo.climate` (authored ground samples the field once);
`climateWords` picks per axis the band that claims the value hardest, ties
to the narrowest. Registered as a zone-info source in `world/atlas.ts`, so
the panel needed no edit; the features it stands on follow as rows.

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
(`featureNameOf`). Features follow THE VEIL: a mark or label draws only
where the chart is known (the painter gates both on the reveal mask).

**Debut rows** — peak (summit: `lone_mountain` roll + a relief lift of
0.16 / dome 0.3), lode (ore country, elevation ≥ 0.5: harvest `always` +
`bonus` 2–4), lake (basin: `great_lake` 0.75 / `lake` 0.5).

## The mint fold — THE FRONTIER LAW

`placeZoneAt` calls `featuresAt(target)` only for a **random-frontier surface
mint** (`spec.fieldBiome && (spec.dimension ?? 'surface') === 'surface'` — the course fabric's
discipline). Hits fold into:

- `ZoneDef.geo.features` (the ids) and `geo.relief` (the summed lift/dome),
  beside `geo.biomeDepth` / `geo.climate` — the def carries the truth;
- the landmark and composition roll lists, appended AFTER the zone's own and
  the course's rows (tail draws — every feature-less mint's stream is
  untouched; probe C11 pins byte-identity with the fabric uninstalled);
- `layoutParams`, merged below the mint spec's.

Directed mints (quests, events, realms, caves) never look. No installed
seed (a headless rig that never calls `setAtlasSeed`) means no features.

New mints also retain `geo.atlas`: the sampled coordinate/seed, feature identity
and presentation, and resolved harvest bounty. `bakeAtlasContext` copies the
same hits as the fold. See [atlas contracts](../worldgen/atlas-contracts.md) for
save/co-op behavior and the boundary between influences and promised destinations.

**The readers** read the DEF: levelgen's `'elevation'` gen field adds
`geo.relief.lift` and domes by `geo.relief.dome` (absent = byte-identical —
the summit's crag stamps find the heights they ask for); `World.bootHarvest`
reads `zoneFeatureHarvest(def.geo)` after the zone's own two draws;
the zone pane uses the retained feature names and `read` lines. Old saves without
`geo.atlas` retain registry-based lookup through their feature ids.

## Adding things

- **A feature kind**: one `registerMapFeature` row in `data/atlasFeatures.ts`
  (a finder, a reach, an inherit block, names). Nothing in the engine names
  a kind. A new finder shape is one case in `cellFeature` / `featuresInRect`.
- **A biome's dressing**: one `ATLAS_GLYPHS` row (glyph id, spacing, size).
- **A glyph painter**: `registerGlyphPainter(id, fn)` in `ui/atlasPaint.ts`.
- **A chart dial**: `ATLAS_CFG`.
- **A knowledge act** (a new way the player learns of ground): lift
  `z.veiled` and add to `world.surveyed` at the act — never on a mint.

## QA notes

- The run save is mirrored in the browser's localStorage AND the dev server's
  `saves/` (disk-first at boot; the page writes the run back on unload via a
  beacon). To reset a QA world: unload the page first (navigate away), THEN
  copy the save files in, then load — a copy made while the page stands is
  overwritten the moment it navigates.
- The Browser pane's rAF may not tick; drive `__game.ui.refreshMap()` from
  the console to advance a chart build there.

## Known gaps (see the charter's forks)

- Features are macro truth like the biome wash inside the veil; whether a
  lode should be *found* (a survey, a walk) rather than seen is her call.
- Lakes are rare (a traced river seldom dies inland under the coastal
  falloff) — a dial question on `RELIEF_CFG` as much as on the finder.
- The lode grants MORE of the country's own harvest rows; a dedicated ore
  family is charted, not built.
- Directed mints (quests) do not inherit — by law; an opt-in flag is a
  one-line fork.
- The player-side world editor (planting a feature as an act) is charted,
  not built; the dev half (the lens) is.

# THE WORLD ATLAS — a shown world map that feeds the ground it shows (charter v1, as built)

**Status: M0 + M1 BUILT 2026-09-07** on the `worldmap-atlas` branch (a
sibling worktree at `D:\Games\Claude\arpg-worldmap`), at her ask: "overhaul
almost exclusively the VISUALS of our world map … a Rimworld-esque planet map
… genuinely interactable world editor-esque visual so that we can truly SHOW
rather than TELLING … biomes, elevation, terrain, rivers … and a zone
generating on or near those features would inherit said features … PoE2's
Atlas combined with Rimworld." Everything marked **DIAL** is a build-time
lever and every number is unblessed. The fabric doc is
`docs/engine/atlas.md`; the probe is `balance/probe_atlas.ts`.

> **THE LEAD FINDINGS.**
>
> 1. **The world already had every truth the map needed — it only drew one
>    faint tenth of it.** Continents, seven climate axes with a ridged
>    elevation layer, the jittered biome Voronoi, traced rivers, named seas
>    with port spots, a danger field: all pure functions of the seed
>    (THE FOREORDAINED TENET). The map showed a 40-cell rectangle wash with a
>    hillshade nudge and river threads. Showing was a painter, not a new
>    world.
> 2. **The feedback loop already had one leg.** Every random-frontier mint
>    bakes `geo.biomeDepth` + `geo.climate`; tilesets claim faces by
>    `geoAffinity`; the riverland recipe is forced by the course fabric;
>    lairs seat by climate. What was missing was the vocabulary of discrete
>    PLACES (a summit, an ore country, a basin) that the map can mark AND
>    the mint can inherit — one finder serving both, so drawn == inherited.
> 3. **Harvest nodes had no world-level lever** (`HARVEST_CFG.count` was
>    flat per zone). The lode is the first: ore country as a place.

## 1. What is built

### M0 — THE CHART (`ui/atlasPaint.ts`, laws in `world/atlas.ts`)
A progressively built raster under the node graph: hillshade lit from the
north-west, hypsometric lift, alpine rock and a snowline, a chamfered sea
shelf with foam, contour bands, paper grain, organic seams (a
presentation-only domain warp on the sample), rivers as tapered threads,
lake basins, per-biome dressing glyphs (forty-odd biome rows: crowns, firs,
peaks, dunes, reeds, crosses, shards, waves…), feature marks + name labels.
THE VEIL: paints only around visible nodes with a soft rim — the old
envelope law, forechart-honest. THE ZOOM WINDOW re-renders the view crisp
past 160%. A `Settings.mapChart` toggle keeps the classic wash.
THE CURSOR READ prints the ground under the pointer: biome · elevation ·
the climate bands' own words · the features within reach.

### M1 — THE FEATURE FABRIC (`world/atlas.ts` + `data/atlasFeatures.ts`)
`registerMapFeature` kind rows: a FINDER (peaks = local maxima of the
elevation axis; strewn = lattice deals with climate gates; lakes = a traced
river's inland end), a REACH, an INHERIT block (landmark/composition rolls,
recipe knobs, a harvest bounty, a relief lift), names, the pane's read.
`placeZoneAt` folds `featuresAt(target)` into `ZoneDef.geo.features` +
`geo.relief` and appends the rolls AFTER the zone's own — THE FRONTIER LAW
(random-frontier surface mints only) and THE BYTE-IDENTITY LAW (a
feature-less mint is identical with the fabric uninstalled) hold by probe.
Readers read the def: levelgen's elevation field lifts/domes under a summit
(its crag stamps find their heights), `bootHarvest` rolls the lode's
bounty, the pane names the features.

Debuts: **peak** (summit → `lone_mountain` 60% + lift 0.16 / dome 0.3),
**lode** (elevation ≥ 0.5, 42% of 1300-unit cells → harvest ALWAYS, +2–4
nodes), **lake** (→ `great_lake` 75% / `lake` 50%).

## 2. The laws (probe-pinned)

- **DRAWN == INHERITED** — one finder, one memo, two consumers.
- **THE SEED IS THE PLAN** — no rng in a finder; a fresh process names the
  same summits.
- **THE INSTALLED TRUTH** — `setAtlasSeed` at sim boot beside the relief
  seed; no seed, no features.
- **THE FRONTIER LAW** — directed mints inherit nothing.
- **THE BYTE-IDENTITY LAW** — every zone off every feature is unchanged.
- **THE PIXEL LAW** — flat = the biome tint exactly; lit faces lift; snow
  pales; the sea deepens off its shelf; relief off = the tint.
- **THE VEIL** — nothing beyond knowledge paints; terrain is seed truth,
  never node positions.

## 3. FORKS FOR HER WORD (cards — DO NOT BUILD unruled)

**Card 1 — What is a feature: seen or found?** Today a summit inside the
veil is drawn like the biome wash (macro truth). Alternatives: (a) as now;
(b) FOUND — a mark appears only once a zone within reach is *visited* (the
name arrives with the walk); (c) SURVEYED — a survey spire / harbor chart
reveals features in its pulse. Recommendation: (a) for terrain-scale kinds
(summits, lakes — you can see a mountain from afar) and (b) for hidden
kinds (lodes: ore is found, not seen). One `MapFeatureKindDef.reveal` word.

**Card 2 — THE WORLD EDITOR (M2).** "Interactable world editor-esque": the
ask's second half. Two shapes: (a) a DEV lane — a `?dev` Atlas tab that
plants a feature at a coordinate (a keyed row the finders fold, like a
biome warp) for QA and authoring, never persisted; (b) a PLAYER lane —
planting is an ACT (the transience doctrine: permanent scars are
registered, player-authored): a survey rite, a claim stake, a dwarven
delving that MAKES a lode — persisted in worldstate, drawn as a claim,
inherited by every later mint within reach. Recommendation: (a) first
(cheap, the Map Forge's exact idiom), (b) as a quest/station grammar once
the kinds are blessed. Fork inside (b): can a planted feature *override*
the seed's truth (a lode where the elevation says lowland)?

**Card 3 — THE ATLAS GRAMMAR (M3, the PoE2 half).** Features as
MODIFIERS: a region's features compose a visible "what this ground does"
line — summit = +elevation stamps, ore = harvest bounty, basin = lakes,
river = riverland… and, PoE2-style, *chosen* pressures: a player-invested
lever (a vestige, a map device, a Vault rung) that raises a region's
feature density / bounty / danger in exchange for rewards. Recommendation:
charter only after Cards 1–2; the seat is `FeatureInherit` (any new lever
is a field there).

**Card 4 — THE ORE FAMILY.** The lode grants more of the country's OWN
harvest rows. A dedicated ore node family (`HarvestNodeDef.features` — a
row admitted by feature id rather than biome) makes the lode *speak*: raw
lode, a payout essence, a debris face. One row + one doodad visual.
Recommendation: build with Card 1's lode-is-found ruling.

**Card 5 — Directed mints.** Quest/event/expedition mints never inherit
(the frontier law). A `ZoneSpec.inheritFeatures: true` opt-in would let an
Odyssey set-piece or a bounty expedition stand ON a summit deliberately.
Recommendation: opt-in, default off.

**Card 6 — THE LOOK.** Dials to bless by eye on the walk: relief gain and
ambient, hypsometric lift, snowline, sea shelf width and tones, contour
interval, seam warp amplitude, glyph spacing/size per biome, feature mark
sizes, label font and reveal floor, image opacity, the veil radius +
feather, and whether roads/nodes should dim over the painted chart.
Recommendation: walk it on `arpg-dev-worldmap` with the Relief/Rivers/
Features/Dressing chips, then bless in `ATLAS_CFG` / `ATLAS_GLYPHS`.

**Card 7 — Feature density.** Across 8 seeds in an 8400² window: ~7
summits, ~5 lodes, <1 lake per seed. Lakes are rare because traced rivers
seldom die inland under the coastal falloff; summits want a wider lattice
if they read as confetti, narrower if the ranges read empty. Recommendation:
bless after the walk; the lake question may be a `RELIEF_CFG.trace` dial.

**Card 8 — More kinds (the open registry).** Candidates that are one data
row each once a finder exists: *springs* (a river's source — the spring
landmark / a hermit lair), *gorges* (a river crossing high ground — the
canyon landmark), *headlands* (coast on high ground — cliff coast), *fords*
(a river's low crossing — the causeway), *fens* (low + wet — marsh
landmarks), *calderas* (volcanic peaks), *ley nodes* (a wildness-gated
strewn deal — the leyline objective's home). Each is a finder + an inherit
block; none needs engine work.

## 4. Dials (every one unblessed)

`ATLAS_CFG`: raster (maxPx 720, lattice 2, budget 22 ms, opacity 0.94,
zoom window 1.6× / pad 1.5), reveal (300 + 280 feather, cell 40), shade
(light NW, gain 1300, ambient 0.48, max lift 1.34), hypso 0.3, snow 0.8→0.93,
alpine 0.66→0.82, sea shelf 240, contour 0.07 / 0.14, grain 0.035, seams
warp 34 / cell 210, rivers 1.3→4.2 px, labels font 9, glyph floors.
`data/atlasFeatures.ts`: peak lattice 520 / floor 0.72 / reach 240; lode
lattice 1300 / chance 0.42 / elevation ≥ 0.5 / reach 230 / bounty 2–4; lake
minRun 6 / radius 34–70 / reach 200; every name pool; the dressing table.

## 5. Risks + notes

- The chart is a ~0.5–1 MB data URL rebuilt when the charted set changes;
  the build is progressive (~0.4 s of CPU spread over ticks) and the old
  chart stands meanwhile. The HTML compare on the half-second refresh is a
  string equality over that URL — cheap.
- Zone layouts ON a feature draw extra rng at the tail (their landmark
  rolls) — new zones only; saved zones keep their defs.
- A `geo.features` id resolves through the registry: renaming a kind id
  orphans saved ids (they simply stop naming; nothing breaks).
- The seam warp means the painted biome edge can sit up to ~34 units off
  the sampled truth — below node grain (78–86 units per step) by design.

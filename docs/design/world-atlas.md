# THE WORLD ATLAS — a shown world map that feeds the ground it shows (charter v1.1, as built)

**Status: M0 + M1 BUILT 2026-09-07; M1.5 (THE KNOWLEDGE LAW · THE DEV LENS ·
THE STANDING CHART) BUILT 2026-09-08 on her walk** — on the `worldmap-atlas`
branch (a sibling worktree at `D:\Games\Claude\arpg-worldmap`). Her ask:
"overhaul almost exclusively the VISUALS of our world map … a Rimworld-esque
planet map … genuinely interactable world editor-esque visual so that we can
truly SHOW rather than TELLING … and a zone generating on or near those
features would inherit said features … PoE2's Atlas combined with Rimworld."
Her walk (2026-09-08): "very, VERY close to what I was envisioning" — then
three rulings, all built (§3). Everything marked **DIAL** is a build-time
lever and every number is unblessed. The fabric doc is `docs/engine/atlas.md`;
the probe is `balance/probe_atlas.ts`.

> **THE LEAD FINDINGS.**
>
> 1. **The world already had every truth the map needed — it only drew one
>    faint tenth of it.** Continents, seven climate axes with a ridged
>    elevation layer, the jittered biome Voronoi, traced rivers, named seas
>    with port spots, a danger field: all pure functions of the seed
>    (THE FOREORDAINED TENET). Showing was a painter, not a new world.
> 2. **The feedback loop already had one leg.** Every random-frontier mint
>    bakes `geo.biomeDepth` + `geo.climate`; tilesets claim faces by
>    `geoAffinity`; the riverland recipe is forced by the course fabric;
>    lairs seat by climate. What was missing was the vocabulary of discrete
>    PLACES the map can mark AND the mint can inherit — one finder serving
>    both, so drawn == inherited.
> 3. **The map's knowledge leaked at the mint, not at the seam.** Every
>    unveil in the engine was already a knowledge act (entry, the one-ring
>    preview, a survey, an omen, an accepted quest, a won siege, a sighted
>    port). The leak was that zones minted by distant EVENTS were born
>    unveiled — so a crusade or a caravan far away redrew the chart and
>    stretched its fit. One stamp at the mint chokepoint closed it.
> 4. **The panel's flicker and its re-draw-on-every-move were one bug.** Its
>    html carried transient state (hover, zoom %, viewBox, the side box, the
>    raster), so every change rebuilt the whole SVG. Taking every live thing
>    out of the html and syncing it in place made hover, zoom, pan and chart
>    ticks free.

## 1. What is built

### M0 — THE CHART (`ui/atlasPaint.ts`, laws in `world/atlas.ts`)
A progressively built raster under the node graph: hillshade lit from the
north-west, hypsometric lift, alpine rock and a snowline, a chamfered sea
shelf with foam, contour bands, paper grain, organic seams (a
presentation-only domain warp on the sample), rivers as tapered threads,
lake basins, per-biome dressing glyphs (forty-odd biome rows), feature marks
+ name labels. THE VEIL: paints only around KNOWN nodes with a soft rim.
THE ZOOM WINDOW overlays the base crisp past 160%. `Settings.mapChart` keeps
the classic wash. The side box carries THE GROUND ROW (elevation · climate
words) and the zone's features.

### M1 — THE FEATURE FABRIC (`world/atlas.ts` + `data/atlasFeatures.ts`)
`registerMapFeature` kind rows: a FINDER (peaks = local maxima of the
elevation axis; strewn = lattice deals with climate gates; lakes = a traced
river's inland end), a REACH, an INHERIT block (landmark/composition rolls,
recipe knobs, a harvest bounty, a relief lift), names, the pane's read.
`placeZoneAt` folds `featuresAt(target)` into `ZoneDef.geo.features` +
`geo.relief` and appends the rolls AFTER the zone's own — THE FRONTIER LAW
(random-frontier surface mints only) and THE BYTE-IDENTITY LAW (a
feature-less mint is identical with the fabric uninstalled) hold by probe.
Readers read the def: levelgen's elevation field lifts/domes under a summit,
`bootHarvest` rolls the lode's bounty, the pane names the features.
Debuts: **peak**, **lode**, **lake**.

### M1.5 — her walk's three rulings (2026-09-08)
- **THE KNOWLEDGE LAW** — "the visible world map is due to the player and
  the player's knowledge alone." Every graph mint is born VEILED
  (`ZoneSpec.veiled`, stamped at `placeZoneAt`); `World.visible` is
  `!concealed && (!veiled || beside walked ground)`; a knowledge act lifts
  the veil, nothing else; the chart, THE VEIL CLIP on every overlay wash,
  and the map's fit read known ground alone. Probe D1–D7 incl. THE
  KNOWLEDGE INVARIANT over a lived sim world (7 shown of 251).
- **THE DEV LENS** — "the current iteration is perfectly ideal for dev
  tools." `ui/mapLens.ts` + the `?dev` Atlas tab: omniscient chart (every
  node named, whole terrain, unclipped washes, far extents) and the cursor
  read strip; render-only (the world's veils stay put), persisted per
  browser, ships OFF. The per-zone ground read lives in the side box for
  the honest chart.
- **THE STANDING CHART** — "zooming or panning re-registers the entire
  worldmass … the zone markers re-draw with every move." The panel's html
  carries no transient state; `syncMapLive`/`syncAtlas` update the viewBox,
  zoom label, hover card, side box, rasters and labels IN PLACE; the painter
  keeps an LRU of finished rasters with the BASE always standing under the
  zoom WINDOW; zoom and pan touch the atlas layer alone. Verified: the SVG
  element survives hover, zoom, and thirty chart ticks unchanged.

## 2. The laws (probe-pinned)

- **DRAWN == INHERITED** — one finder, one memo, two consumers.
- **THE SEED IS THE PLAN** — no rng in a finder.
- **THE INSTALLED TRUTH** — `setAtlasSeed` at sim boot beside the relief seed.
- **THE FRONTIER LAW** — directed mints inherit nothing.
- **THE BYTE-IDENTITY LAW** — every zone off every feature is unchanged.
- **THE PIXEL LAW** — flat = the biome tint exactly; lit faces lift; snow
  pales; the sea deepens off its shelf; relief off = the tint.
- **THE VEIL** — nothing beyond knowledge paints; terrain is seed truth,
  never node positions.
- **THE KNOWLEDGE LAW** — born veiled; lifted only by a knowledge act; the
  chart reads known ground alone; the invariant over a lived world.

## 3. FORKS FOR HER WORD (cards — DO NOT BUILD unruled)

**Card 1 — Features: seen or found?** RULED IN PART: a feature follows the
veil (drawn only inside known ground). Still open: whether a summit inside
the veil is SEEN (as now — you see a mountain from afar) while a lode must
be FOUND (a survey, a walk, an omen) before it draws. Recommendation:
terrain kinds seen, lodes found; one `MapFeatureKindDef.reveal` word.

**Card 2 — THE WORLD EDITOR.** The DEV half is BUILT (the lens). The PLAYER
half is the fork: planting is an ACT (the transience doctrine: permanent
scars are registered, player-authored) — a survey rite, a claim stake, a
delving that MAKES a lode — persisted in worldstate, drawn as a claim,
inherited by every later mint within reach. Fork inside: may a planted
feature override the seed's truth (a lode where the elevation says
lowland)? Recommendation: a quest/station grammar once the kinds are blessed.

**Card 3 — THE ATLAS GRAMMAR (the PoE2 half).** Features as MODIFIERS: a
region's features compose a visible "what this ground does" line, and
player-invested PRESSURES (a vestige, a map device, a Vault rung) raise a
region's feature density / bounty / danger for reward. Seat: `FeatureInherit`.
Recommendation: charter after Cards 1–2.

**Card 4 — THE ORE FAMILY.** A dedicated ore node family admitted by feature
id (`HarvestNodeDef.features`) so the lode *speaks*. Recommendation: build
with Card 1's lode-is-found ruling.

**Card 5 — Directed mints.** A `ZoneSpec.inheritFeatures: true` opt-in for an
Odyssey set-piece or a bounty expedition to stand ON a summit deliberately.
Recommendation: opt-in, default off.

**Card 6 — THE LOOK.** Dials to bless by eye: relief gain 1300 and ambient
0.48, hypso 0.3, snowline 0.8, sea shelf 240, contour 0.07, seam warp 34,
glyph spacing/size per biome, mark sizes, label font, opacity 0.94, THE VEIL
240 + 240 (tightened from 300 + 280 on the knowledge ruling), whether roads
and nodes should dim over the painted chart, and how large the name cards
may grow at high zoom.

**Card 7 — Feature density.** ~7 summits, ~5 lodes, <1 lake per 8400² seed;
lakes are rare because traced rivers seldom die inland.

**Card 8 — More kinds (one row each).** Springs, gorges, headlands, fords,
fens, calderas, ley nodes.

**Card 9 — News as knowledge.** The law says the player learns of far
events by rumor. Today the omens whisper and reveal (the findability
guarantee) and the notice feed announces; whether a notice should ALSO
mark the chart (a rumor row = `surveyed` grade) or only speak is her call.
Recommendation: a notice that names a place marks it as hearsay (a dashed
scouted node), never as walked ground.

**Card 10 — The starter web.** Authored ground (the town, the crossroads,
the starter web) is known from the first breath. Whether the tutorial's
world should also begin veiled beyond the town is open.

## 4. Dials (every one unblessed)

`ATLAS_CFG`: raster (maxPx 720, lattice 2, budget 22 ms, opacity 0.94, zoom
window 1.6× / pad 1.5, cache 8), reveal (240 + 240 feather, cell 40), shade
(light NW, gain 1300, ambient 0.48, max lift 1.34), hypso 0.3, snow
0.8→0.93, alpine 0.66→0.82, sea shelf 240, contour 0.07 / 0.14, grain 0.035,
seams warp 34 / cell 210, rivers 1.3→4.2 px, labels font 9, glyph floors.
`data/atlasFeatures.ts`: peak lattice 520 / floor 0.72 / reach 240; lode
lattice 1300 / chance 0.42 / elevation ≥ 0.5 / reach 230 / bounty 2–4; lake
minRun 6 / radius 34–70 / reach 200; every name pool; the dressing table.

## 5. Risks + notes

- The base raster is a ~1 MB data URL rebuilt when the known set changes;
  builds are progressive (~0.4 s of painter time over 45 ms ticks) and the
  old raster stands meanwhile. A zoom window adds one more raster; the LRU
  keeps eight.
- Zone layouts ON a feature draw extra rng at the tail (their landmark
  rolls) — new zones only; saved zones keep their defs.
- Old saves: zones already unveiled stay unveiled (grandfathered); from the
  next mint on, the law holds.
- A `geo.features` id resolves through the registry: renaming a kind id
  orphans saved ids (they stop naming; nothing breaks).
- The seam warp means the painted biome edge can sit up to ~34 units off
  the sampled truth — below node grain by design.
- QA: the run save mirrors into the browser's localStorage and is written
  back on page unload — reset a QA world by unloading the page first, then
  copying save files in, then loading.

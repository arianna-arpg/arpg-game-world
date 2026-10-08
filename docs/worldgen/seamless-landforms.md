# Seamless regional landforms

The active `codex/seamless-world-foundation` terrain now embeds navigational districts into continuous country. This is the terrain portion of the uncommitted generation expansion in the primary `main` checkout, adapted to streamed world addresses. It does not activate that expansion's bounded zone graphs or claim complete content parity.

## Shared source and physical behavior

`engine/adventureDistricts.ts` and `engine/explorationDistricts.ts` retain the eleven original district-builder bodies. The native locale registry and seamless source capture use those same functions. No copy of the original geometry algorithm lives in the sampler.

The new expedition descriptor captures 21 physical templates: arcades, terraces, ossuary spokes, cloisters, braided thickets, pools, ridge spurs, canals, settlement blocks, crypt wings and a grove ring. A second grove differing mostly by orientation was excluded from the shipped repertoire. Natural templates receive irregular outer envelopes; built precincts retain their deliberate walls. Four exterior approaches connect to existing native stands, without cutting a universal cross through their interiors.

Six geographic recipes choose these shapes for country precincts, desert precincts, woodland passages, wetland crossings, frozen ridges and elevated passes. They use the current seamless climate/biome fields. This does not add every native biome to the base substrate or complete the native Mountain biome integration.

Every admitted shape occupies several streamed chunks but has one deterministic geographic identity. Ground, walls, water and bridges feed the existing renderer, movement, sight and projectile material rules. Native crag, sandstone, hedgewall and drystone semantics are preserved. Water retains native wading/swimming and path costs; dry crossings offer an alternative. No combat rule is replaced. The route proof checks radius-15 clearance; actual movement still uses the existing native region-boundary collision behavior.

## Admission and persistence

- The saved terrain policy owns the complete raster sources, material eligibility and exclusions. Continue does not rebake from current registries. Descriptors without `landforms` retain their previous terrain; these additions are enabled for new expeditions.
- A 2,880-unit candidate lattice is generation bookkeeping, not a region, zone, map tile or streaming chunk. Signed 64-bit addresses remain distinct beyond JavaScript's safe integer range.
- Each candidate has at most four deterministic seats. Acceptance uses complete footprints, never clipped pixels, discovery order or loaded pages. Neighboring eligible cells use different motifs within a recipe; sparse admitted sites can still repeat. Rotation and reflection are not counted as new content.
- Existing country sites and the complete opening-town/journey reservation take precedence. Shores are retained. Explicit interior material policy permits reshaping small base outcrops, while the whole outer bypass must already be traversable.
- A 120-unit dry apron surrounds every source. Later native features and scenery reserve the complete footprint. Ordinary mire patches cannot cover either passages or bypasses; mire remains localized elsewhere.
- The cache is bounded at 128 candidates. Source validation bounds work, rejects malformed cells and disconnected floor, and checks material eligibility. The generator supplies the same terrain to cold collision and resident pages. Player terrain changes remain a later layer.

## Verification

Run `npm run check`, `npm run genqa`, and `npm run probe -- worldmass_landforms --retries 0`. Adjacent checks include `worldmass_terrainpatches`, `worldmass_nativecountry`, `worldmass_climate`, and `worldmass_nativeingress`.

The landform probe exercises all 21 sources, body-clear approaches, the complete outer bypass, actual native player movement, multi-chunk sampling, opposite query order, cache eviction, far signed coordinates, excluded shores/sites/opening paths and cold Continue. Its structural critic normalizes scale and all eight rotations/reflections before comparing ground/water/barrier occupancy. The closest shipped pair differs in 11.52% of its 32×32 samples; this is a finite corpus check, not a promise of unlimited uniqueness.

The fixed default-world survey covers 1,200 candidate cells across seeds 42, 713 and 991. It finds 61 admitted regional footprints across all six recipes. Whole-footprint reservations deliberately make regional terrain much sparser than its raw candidate chance. Future density tuning must retain navigation and source compatibility.

For built-client acceptance, build with `HOLLOW_WAKE_STORAGE_SCOPE=preview:seamless-landforms-qa`, `HOLLOW_WAKE_WORLDMASS=1` and `npx vite build --outDir .claude/landforms.local.work/dist`, then run `npx electron balance/landforms-ui.cjs`. This uses an isolated profile, finds naturally admitted terrain, renders four families and exercises durable Continue. Reports and the source contact sheet are written beneath `balance/reports/landforms-*`.

## Remaining integration

The source chat's 27 locale programs, 135 layout variants, 30 regional graph forms, bounty-gated passages and their native objective/turn-in ownership still need integration through real zone owners. The shared builders here are preparation for those programs, not inhabited towns or complete crypt adventures.

Keep the hierarchy target: world mass → geographic biome regions → actual native zones → streamed chunks. The candidate lattice above must never become a substitute hierarchy. Native zone/event map zoom, world weather footprints, full native area activation and population/controller persistence remain on that existing integration path. Older saved worlds need an explicit migration policy before acquiring new terrain in unvisited country.

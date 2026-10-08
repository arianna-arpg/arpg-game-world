# Seamless regional landforms

The active `codex/seamless-world-foundation` terrain now embeds navigational districts into continuous country. This is the terrain portion of the uncommitted generation expansion in the primary `main` checkout, adapted to streamed world addresses. It does not activate that expansion's bounded zone graphs or claim complete content parity.

## Shared source and physical behavior

`engine/adventureDistricts.ts` and `engine/explorationDistricts.ts` retain the eleven original district-builder bodies. The native locale registry and seamless source capture use those same functions. No copy of the original geometry algorithm lives in the sampler.

The new expedition descriptor captures 21 physical templates: arcades, terraces, ossuary spokes, cloisters, braided thickets, pools, ridge spurs, canals, settlement blocks, crypt wings and a grove ring. A second grove differing mostly by orientation was excluded from the shipped repertoire. Natural templates receive irregular outer envelopes; built precincts retain their deliberate walls. Four exterior approaches connect to existing native stands, without cutting a universal cross through their interiors.

Six geographic recipes choose these shapes for country precincts, desert precincts, woodland passages, wetland crossings, frozen ridges and elevated passes. They use the current seamless climate/biome fields. This does not add every native biome to the base substrate or complete the native Mountain biome integration.

Every admitted shape occupies several streamed chunks but has one deterministic geographic identity. Ground, walls, water and bridges feed the existing renderer, movement, sight and projectile material rules. Native crag, sandstone, hedgewall and drystone semantics are preserved. Water retains native wading/swimming and path costs; dry crossings offer an alternative. No combat rule is replaced. The route proof checks radius-15 clearance; actual movement still uses the existing native region-boundary collision behavior.

## Admission and persistence

- The saved terrain policy owns the complete raster sources, material eligibility and exclusions. Continue does not rebake from current registries. New habitat/dressing composition uses checkpoint schema 12 so older clients refuse generation they cannot reproduce. Historical descriptors keep their existing schema. Descriptors without `landforms` retain their previous terrain; these additions are enabled for new expeditions.
- A 2,880-unit candidate lattice is generation bookkeeping, not a region, zone, map tile or streaming chunk. Signed 64-bit addresses remain distinct beyond JavaScript's safe integer range.
- Each candidate has at most four deterministic seats. Acceptance uses complete footprints, never clipped pixels, discovery order or loaded pages. Neighboring eligible cells use different motifs within a recipe; sparse admitted sites can still repeat. Rotation and reflection are not counted as new content.
- Existing authored country sites and the complete opening-town/journey reservation take precedence. New descriptors explicitly mark ordinary biome habitat packs with `landformHabitat`; those population footprints can share regional terrain, without weakening ordinary mire-patch reservations. Recipes with authored surfaces or site content cannot use the opt-in. Shores are retained. Explicit interior material policy permits reshaping small base outcrops, while the whole outer bypass must already be traversable.
- A 120-unit dry apron surrounds every source. Later native features and ordinary blocking scenery reserve the complete footprint. Optional `ecology.landformDressing` adds native rubble, bones, leaf litter, scree, wisps and snowdrifts through the existing scenery owner. Source definitions and palettes are saved; full decoration circles plus a 30-unit feather margin fit dry source cells and the recipe's current allowed surfaces. Water, walls and bridge decks stay clear at admission. Native undead-rising and snow-burrow affordances are retained; these are not newly authored quests or reward sites. Ordinary mire patches cannot cover either passages or bypasses; mire remains localized elsewhere.
- Habitat birth checks the complete native body against terrain and existing bodies, with bounded, draw-free reseating inside the original habitat or formation radius. Ordinary native spawning, formations, wounds, casualties, territory, rewards and Continue retain their owners. No terrain is carved to force a pack into a narrow site.
- The cache is bounded at 128 candidates. Overlapping seats reuse substrate reads within one candidate; the temporary memo is discarded after the decision. Address bounds derive from actual spacing and chunk size, including 30-unit address chunks. Source validation bounds work, rejects malformed cells and disconnected floor, and checks material eligibility. The generator supplies the same terrain to cold collision and resident pages. Player terrain changes remain a later layer.

## Verification

Run `npm run check`, `npm run genqa`, and the probes `worldmass_landforms`, `worldmass_landformhabitats`, `worldmass_landformdressing`, and `worldmass_landformintegrity`. Adjacent checks include `worldmass_terrainpatches`, `worldmass_nativecountry`, `worldmass_climate`, and `worldmass_nativeingress`.

The landform probe exercises all 21 sources, body-clear approaches, the complete outer bypass, actual native player movement, multi-chunk sampling, opposite query order, cache eviction, far signed coordinates, excluded shores/sites/opening paths and cold Continue. Its structural critic normalizes scale and all eight rotations/reflections before comparing ground/water/barrier occupancy. The closest shipped pair differs in 11.52% of its 32×32 samples; this is a finite corpus check, not a promise of unlimited uniqueness.

The fixed default-world survey covers 1,200 candidate cells across seeds 42, 713 and 991. With ordinary habitats composed into terrain it finds 192 admitted regional footprints across all six recipes, compared with 61 for the historical all-place exclusion. The admitted rectangles cover approximately 2.96% of the surveyed area; density remains spatially uneven. Whole-footprint reservations deliberately make regional terrain much sparser than its raw candidate chance. Future density tuning must retain navigation and source compatibility.

The habitat course seats 84 native bodies across all 21 sources and exercises actual character serialization, wounds, casualties and atomic formations. Dressing checks all five climates, independent circle clearance, ordinary ecology equivalence, removal, eviction and Continue. Integrity checks retain captured terrain/provenance signatures, every source at small signed chunks and bounded temporary reuse. A representative rejected candidate fell from 5,364 to 1,484 substrate reads; cold admission remains synchronous and is not yet guaranteed to fit a frame budget.

For built-client acceptance, build with `HOLLOW_WAKE_STORAGE_SCOPE=preview:seamless-landforms-qa`, `HOLLOW_WAKE_WORLDMASS=1` and `npx vite build --outDir .claude/landforms.local.work/dist`, then run `npx electron balance/landforms-ui.cjs`. This uses an isolated profile, finds naturally admitted terrain, renders four families and exercises durable Continue. Reports and the source contact sheet are written beneath `balance/reports/landforms-*`.

## Multi-screen regional extents

The optional saved `landforms.regional` policy adds twenty sources with physical
bodies of 3,300, 6,000 and 6,600 units. The regionalExtentSchema checkpoint is 13;
older clients refuse it. The original 21 small source cells remain byte-identical,
and policies without the new member retain historical placement. Fresh worlds
keep small formations between larger ones. The 9,600-unit candidate lattice is
placement bookkeeping, not a zone or biome-region identity.

The reusable capture input accepts extents from 2,160 to 6,960 units in 60-unit
steps; the three shipped scales are data choices, not separate algorithms.
The same native builders run at larger physical dimensions, with 30-unit cells
and unchanged 100–120-unit paths. The repertoire includes branching Y/cloister
layouts, flower pools, ossuary chambers, ridge branches, braids, canals, terraces
and crypt wings. An irregular 120-unit dry collar connects four exterior ports.
It remains a bounded rounded formation, not arbitrary stitched continental
geometry. Climate fields and biome identity continue across it; material choices
come from the saved geographic recipe.

A regional formation explicitly owns local ground and hydrology inside its
outline. This is necessary because demanding a pristine, site-free six-screen
rectangle rejected nearly all candidates. Its interior can replace ordinary
noise lakes and micro-outcrops. A 25-point inland selection rule rejects broad-water
placements; it is not an exact coastline-preservation proof. Every exterior port
checks three actual substrate contact cells. The transparent exterior remains
ordinary terrain. Native source-owned substrates currently refuse this additional
layer rather than silently changing their authored geography.

Existing protected country-site circles remain completely transparent. Their
exterior dry collars join the parent through bounded 90-unit spurs, with a maximum
1,800-unit new spur and 32 repair passes. The opening reservation still excludes
whole formations. At most 12% of source water/barrier cells may change. Preserved
terminal distances must remain within 72–135% of the parent distance, plus 180 units
of tolerance. If a proof terminal falls inside a site, it moves along the original
dry route to a surviving nearby stand before comparison. Invalid geometry is
refused as a whole. No saved terrain edits or late resident objects decide it.

Nested pools are complete pinned small native motifs. Parent foundations are
saved separately, so site composition happens first and the pool can then move
into another original broad court. A 30-unit margin protects adjacent parent
paths; child rectangles cannot fit narrow corridors. The Y carries one pool
formation; the largest ossuary can carry two. Required children must all fit, or
the candidate refuses. Continue reuses pinned parent and child geometry.

Each candidate has at most four deterministic seats and 38 substrate reads per
seat. Site enumeration is deduplicated geographic planning, capped at 8,192
candidate visits and 32 protected sites. Sixteen regional decisions are cached;
small-terrain admission reserves accepted larger formations. Native habitat
seating, dressing, ordinary mire exclusions and streamed/cold collision use the
same final source. Cache eviction and reverse query order regenerate identical
plans, including at far signed addresses.

The regional extent probe independently checks body-width connectivity, exact
children, more than 30 streamed chunks, protected circles, source validation,
far coordinates, eviction and schema 13 cold Continue. Its 300-location survey
across seeds 42/713/991 finds 39 formations, including 19 large and 4 nested examples,
across 7 builders and all 6 geographic recipes;302 protected-circle intersections
retain their original substrate. Cold planning is bounded but synchronous:
measured 95 th-percentile costs were roughly 100–160 ms, with maxima around 235 ms
under concurrent verification. Worker scheduling/frame-budget work remains.

Built-client verification uses `balance/regional-extents-ui.cjs` after the same
isolated build as above. It finds natural large nested terrain and flower pools,
renders six positions along one connected multi-screen route, and exercises
native occupants, decoration and durable Continue. These are route-position
views; they do not constitute a full automated combat playthrough.

## Seeded regional composition

RegionalTerrainComposition is the schema-14 continuation of this foundation.
New expeditions save an optional `landforms.regional.composition` policy. At each
eligible seat, the default gives seeded construction an 85% choice and keeps
familiar native formations as the other option. Actual admission proportions
can differ because both branches still have physical/site checks.

The saved rules construct 4–10 connected courts with a random growth tree and
0–3 additional links. Extent varies from 3,300–6,600 units; 90–150-unit dry paths
keep their physical width across scales. Different chamber sizes, bent links,
water/solid shoulders and irregular boundaries alter the realized ground.
The source retains its graph as a diagnostic trace, never as replacement native
zone ownership. Dry preferred routes are connected; native water remains a
traversable alternative with its usual swimming/path costs. Four real exterior
contacts remain, without a universal dry ring that would erase the route choices.
Only owned sample cells contribute to the generated branch's bounded inland
selection rule; a lake in an unowned gap does not veto a neighboring arm.
Fully enclosed transparent source pockets become lake or solid interiors so
unreachable noise-ground content cannot appear inside them.

Complete pinned native pools and groves can occupy broad courts. Source and
post-site fitting both preserve every motif cell and its dry margin. Seeded
spatial ranking removes the old preference for the formation center. Required
children still cause whole-candidate refusal if no valid court survives. These
large nested motifs remain uncommon; the smaller ordinary terrain repertoire
also composes through the exterior gaps.

Exact reservation uses the union of original source cells and final painted
cells, plus a 120-unit margin. Protected site holes therefore remain reserved,
but unrelated exterior gaps between arms can hold complete small formations and
ordinary content. Painted-cell lookup agrees with collision/streaming; inspection
of the full envelope is a separate planning operation. Circle and rectangle
reservation both include exact boundary tangencies.

Generated formations opt into bounded local outline growth around a site that
intersects their original footprint or apron. Every supplied protected circle
is masked before any growth. Dry collars may expand into original transparency,
then existing bounded repair and route comparisons determine whether the result
is valid. Added area has its own cap of 12% of the source square; the existing
12% obstacle-change cap still applies separately. Unrelated sites cause no
isolated collar, frame/contact cells remain transparent, and circles are never
painted over. Familiar/historical sources keep their prior composition rules.

Construction consumes a separate deterministic stream and saved versioned rules;
chunk order, cache eviction and player discovery do not affect it. Schema 14
prevents older clients from interpreting these rules incorrectly. Descriptors
without composition retain exact historical cells, placements, terrain and schema
13 Continue behavior. Future algorithm changes must preserve this version or
explicitly introduce another version; a saved seed alone is not a migration.

The terrainvariation probe compares 256 source seeds after normalizing rotation,
reflection and scale, reconstructs actual dry raster adjacency, and independently
checks radius-15 connectivity for every source. It also verifies real protected
sites, nested native sources, released exterior pockets, signed coordinates,
cache eviction, streamed/cold equivalence, configuration validation and Continue.
The fixed 192-cell default-country square plus one targeted regression location
across seeds 42/713/991 admits 19 generated formations and 2 familiar formations,
with 12 graph signatures across 5 geographic recipes. All 63 actual original
source/site intersections remain protected. Both retained native children share
the targeted formation at seed 42, candidate (-7,-3); the broad square contained
none, so nesting remains sparse. A flat-country layering course finds 133 sample
hits on complete small formations inside large envelopes, not 133 distinct
formations. Cold survey p95 was approximately 178–199 ms under concurrent
verification, with maxima around 225 ms; planning is still synchronous.

The regionalexpansion probe tests local detours, protection/order independence,
contact/budget refusal and an exact pre-change historical digest. Infeasible
minimum loop counts refuse instead of silently simplifying the requested graph. A 32-bit source
seed and a finite corpus do not guarantee infinite non-repetition.

Built-client acceptance uses `balance/terrain-variation-ui.cjs` after building
with `HOLLOW_WAKE_STORAGE_SCOPE=preview:seamless-terrain-variation-qa`,
`HOLLOW_WAKE_WORLDMASS=1`, and
`npx vite build --outDir .claude/terrain-variation.local.work/dist`.
It finds actual admitted graph variations, a nested motif and a familiar source,
checks native inhabitants/dressing, renders six streamed route positions, and
compares exact terrain after a cold durable Continue. Reports live under
`balance/reports/terrain-variation-*`. Route views are not an automated combat
playthrough. Cold planning is still synchronous; frame scheduling remains work.

## Remaining integration

The source chat's 27 locale programs, 135 layout variants, 30 regional graph forms, bounty-gated passages and their native objective/turn-in ownership still need integration through real zone owners. The shared builders here are preparation for those programs, not inhabited towns or complete crypt adventures.

Keep the hierarchy target: world mass → geographic biome regions → actual native zones → streamed chunks. The candidate lattice above must never become a substitute hierarchy. Native zone/event map zoom, world weather footprints, full native area activation and population/controller persistence remain on that existing integration path. Older saved worlds need an explicit migration policy before acquiring new terrain in unvisited country.

## RegionalLayers: irregular courts and nested native discoveries

Fresh expeditions use schema 15 when saved court morphology or regional
discoveries are present. Schema-14 descriptors keep their exact circular courts,
random cursors, terrain bytes and owners. Explicit circle-only morphology also
retains historical graph, shoulder and child placement. Older clients refuse the
new schema rather than silently regenerating different geography.

The saved court vocabulary includes circles, ellipses, beveled halls, kites,
scalloped courts, clefts, irregular polygons and crosses. Angle, aspect, depth,
lobe count and polygon vertices vary per court using an independent stream.
All contours retain a connected central floor inside the original court bounds;
the graph still owns multi-screen connectivity. The original native formation
catalogue remains a separate generation choice.

For noncircular compositions, complete native motifs reserve their actual
occupied cells and a 120-unit dry feather. Transparent source-image corners no
longer demand blank square courts. Original floor, protected-site composition,
sibling feather separation, final connectivity and route-distance checks still
apply; no child is clipped or reduced. Historical and all-circle sources retain
their original rectangular admission. In the same 192-source sample this raised
complete nested motifs from 12 to 73 while preserving every native cell.

The optional terrain.regionalDiscoveries policy runs after protected sites and
complete nested terrain are composed. It chooses up to four courts, independently
rolls content and positions, and admits only complete sites on final ground floor
with at least a 90-unit dry bypass. It never carves terrain to force admission.
Sibling footprints retain their saved separation, and a content choice appears
at most once per formation. Stable owners include formation and court ancestry;
a site wholly within a child motif's envelope also records that motif.

The default vocabulary contains eight asymmetric cache arrangements, all five
native shrines, four native altar fields and three native puzzle activities.
It reuses existing registered scenery and complete native interaction rules.
Rewards and puzzle/field levels follow the saved geographic progression.
Bounties, discovery cues, scenery exclusion, native persistence and worker
objective/procession reservations consume the same combined place query.
Ordinary terrain admission deliberately uses the earlier ordinary-place query
to avoid a terrain/content dependency cycle. The discovery cache holds at most
64 formations; no result depends on residency or query order.

This is terrain and content composition within the seamless landmass, not a
replacement for native biome regions, zones or their event/map ownership. The
remaining native hierarchy integration described above is still required.
Cache chests use the existing resident chest persistence; this pass does not
add whole-world chest paging. Finite variety surveys cannot guarantee unlimited
non-repetition, and synchronous cold terrain planning remains a performance
limitation.

Verification adds `worldmass_regionallayers` and the isolated
`balance/regional-layers-ui.cjs` course. Build with
`HOLLOW_WAKE_STORAGE_SCOPE=preview:seamless-regional-layers-qa`,
`HOLLOW_WAKE_WORLDMASS=1`, and
`npx vite build --outDir .claude/regional-layers.local.work/dist`.
The client course opens a real cache, consumes a native shrine, hits and solves
a native puzzle, and checks partial/solved cold Continue and spent-owner revisits.

RegionalLayers acceptance: 192 normalized source layouts were distinct; 256
historical sources and 64 circle-only sources remained exact. Holding terrain
fixed while varying 32 discovery rolls produced 96 different positions. A finite
226-location default-world survey yielded 19 generated formations, 33 discoveries
from 14 payloads, all six native activity categories, all eight court families,
five complete child motifs and one discovery inside a child. Every final dry
player stand and route terminal was checked after protected-site composition.
The broader validation passed 35 targeted probes, all three type checks, 25 smoke
simulation episodes and built-client native interactions plus cold Continue.
Generation QA reported 0 failures and four previously known geometry warnings
across 869 cases and three seeds.

## RegionalWeave: winding routes and connected landscape shoulders

The saved `composition.weave` policy requires checkpoint schema 16; independent
newer feature policies retain their higher schema. Schema14 and schema 15 policies
continue to reproduce their original source bytes. The original factories stay
unchanged, while `wovenRegionalTerrainGrammar()` opts new worlds into the second
court vocabulary and separate path, court-placement and transition streams.

Four new court families—fan, hammerhead, fork and terrace—join the existing eight.
Their seeded proportions and orientations vary independently. Modest court drift
and occasional smaller courts expose more connecting terrain while retaining
broad courts for complete native motifs. Every court stays within pairwise radius
caps and leaves room for exterior shoulders. The source graph still chooses its
connected tree and optional cycles; the new contours do not replace that topology.

Each graph edge chooses a direct, meandering, switchback, elbow or sweeping route.
Steering uses exact shared endpoints, bounded lateral displacement and monotone
longitudinal progress. Raster admission independently reconstructs room adjacency
and rejects unintended intersections, including intersections with entry throats.
A 32-source player-radius 15 proof measured actual shortest dry routes outside all
court envelopes: meanders had a median route/chord ratio of 1.144, switchbacks 1.163,
and the longest sampled meander required 1,315 units against a 568-unit gap. Gentler
sweeps and elbows remain intentionally different experiences. Water keeps its
native traversal rules, so these measurements concern dry routes, not universal
hard-wall mazes.

Connected outer shoulders grow through a coherent field over source coordinates.
They inherit nearby wall/water material, vary in width, taper before finite source
bounds, and preserve original cells and complete entry approaches. Enclosed
transparent pockets are resolved before protected sites and complete child terrain
are composed. This introduces irregular physical outlines without rectangular
fills or isolated collision specks. It does not add alpha-blended biome rendering
or change the protected native sites' own authored shapes.

The permanent `worldmass_regionalweave` course checks 128 normalized unique source
layouts and outlines, all 12 court families, 19 complete native children, 930 exposed
links, actual player-body routes, malformed policies, signed coordinates, cache
reconstruction and exact Continue. A 32-case extreme-policy course admitted 20
safe sources and refused 12 within the bounded attempt budget. A 24-seed transition
course preserves every original cell while adding 62,464 connected shoulder cells.
A 128-location climate-country survey found 10 woven formations, 18 discoveries,
four geographic recipes and all five path styles, while protecting 12,789 site
cells. That survey contained no nested child motifs; nesting remains sparse and
is tested separately with a directed real-world witness. Seed 42, run
regional-weave-proof, candidate (5,-7) retains a complete stepping-pools motif
and a native ossuary cache inside it. The actual runtime publishes the cache
at geographic level 24 with a clear interaction stand.

A 192-source review found 31 complete native children versus 73 with the earlier
layered policy: exposing longer winding routes trades some broad interior area
for traversal variety. Complete-child rules are never relaxed to improve a count.
Expanded segment bounds avoid irrelevant distance checks during route painting;
all 192 source hashes stayed exact while measured total construction time fell
about 27%. Cold country planning still runs synchronously; the finite survey's
p95 after that optimization was about 170 ms and its maximum 199 ms under
concurrent validation.

Built-client acceptance uses `balance/regional-weave-ui.cjs`, the storage scope
`preview:seamless-regional-weave-qa`, `HOLLOW_WAKE_WORLDMASS=1`, and an isolated
build at `.claude/regional-weave.local.work/dist`. It clones the current descriptor
and omits any separate nativeRegional policy to isolate schema 16. Five candidate
checks found ten court families and all five path styles. Six route views, native
walking, a level 22 cache, exact cold Continue and spent-owner revisits passed.
Reports and the contact sheet are in `balance/reports/regional-weave-*`.
These are controlled arrival and interaction courses, not a full combat campaign.

RegionalWeave acceptance also passes 21 targeted terrain, content and worker
probes (including the historical layer course and the new 12-course weave proof),
all three type checks, 25 smoke simulation episodes and the rebuilt isolated
client course. Generation QA reports 0 failures and the same four known warnings
across 869 cases and three seeds. A separate proposed-commit copy verifies the
schema 16 phase independently of concurrent nativeRegional integration.

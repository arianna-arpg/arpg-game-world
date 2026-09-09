# Geographic adventure: cliffs, region size, and node density

New expeditions use geography version 2. The atlas and ordinary surface
exploration share finite escarpments: the wall drawn on the map blocks roads,
its central gap admits a crossing, and nearby zones inherit an oriented terrain
contract. Biome regions independently roll a radius multiplier; region area
and the spacing between playable nodes are separate authoring choices.

## Atlas to playable ground

`src/world/escarpments.ts` samples the existing elevation field. A seeded
lattice supplies candidate seats; minimum elevation and gradient select steep
ground. The gradient supplies the high side, its tangent supplies a finite
wall, and land checks reject ocean seats and endpoints. Query bounds do not
change a feature's identity or position. Climate invalidation clears the cache.

The atlas paints this same segment, with a gap at the pass and hatching on
the downhill face. Reveal is checked along the wall, so a known portion can
appear while its distant pass remains hidden. Destination catchment is a
separate radius around the pass, rather than the wall's whole influence band.

An ordinary frontier near an unbroken face receives a cliff-foothills locale
and a blocked cardinal edge. That edge contains solid cliff terrain and offers
no exit. Road creation, reconnects, proximity linking, and settling honor the
barrier. Crossing the wall is possible at the drawn pass or around its finite
ends. The pass becomes one named, persistent cliff-ascent destination; later
approaches reconnect to that same node. A long exploration step crossing the
pass also enters the climb, even if its endpoint overshoots the catchment.

The ascent joins a lower ledge, switchbacks, a summit court, and an explorable
shelter. Nonwalkable exposed space uses the existing fall policy (18% maximum
life physical damage, potentially lethal). This is navigable 2D terrain with
fall hazards, not a continuous 3D slope or a new climbing movement system.
Local terrain uses the dominant cardinal direction of an oblique atlas face.

Explicit layouts, ids, special arenas, ports, pockets, floating destinations,
zone kinds, and other dimensions retain their authored placement contracts.
No-weave ordinary surface mints may inherit a foothill wall, but do not claim
the canonical pass destination. Cliffs are the first shared barrier family;
continent/coastline generation itself is unchanged.

## Reusable local topology

The locale contract in `src/world/locales.ts` adds:

- Named district `ports` and link `fromPort` / `toPort` sockets.
- `external: false` for districts that external portal corridors must avoid.
- Per-cardinal-side `approaches` with optional bends and a target district.
- `portalMode` for authored entrance or nearest eligible district fallback.
- Registered background terrain and an optional oriented solid rim.

These are general locale features. They let a road enter the lower ledge or
summit without cutting a shortcut through the middle of the ascent. The
switchback builder accepts `pathWidth`, odd `turns` (3..9), and rotation.
Orientation rotates district footprints, sockets, bends, and approaches
together. Programs, variants, district geometry, and terrain remain data.
River-course intersections retain a river and explicit crossing regions.

The full compiled locale and `ZoneDef.geo.escarpment` record the generation
inputs and geographic source. Saves and co-op carry both. Geography-bound
nodes stay at their sampled atlas seat while other nodes may settle around
them. Existing compiled plans remain stable when program tables grow; an
incompatible builder change still needs a migration or a new builder id.

## Biome area and density

`BiomeInfo.regionScale` is a seeded radius range for multiplicatively weighted
Voronoi ownership. Each site keeps its biome/climate roll and its own center,
but larger multipliers compete for more ground and create curved boundaries.
Occurrence weight, climate eligibility, radius, and node spacing are distinct.
The ocean mask remains authoritative.

| Biome | Radius range | Node spacing |
| --- | --- | --- |
| Default | 0.75..1.30 | Existing biome/default spacing |
| Desert | 1.15..1.80 | 124 |
| Jungle | 0.70..1.35 | 54 |
| Mountains | 0.85..1.55 | 88 |

The bounded ownership search is exact for the configured jitter, minimum and
maximum radius. Changing those global bounds requires revisiting the search
radius. Interior depth compares the winning distance against the nearest
*different* biome found in that neighborhood; same-biome cells merge into one
interior. Depth saturates at one when no opposing biome is nearby; it is a
local interior metric, not an exact global distance-to-boundary calculation.

`biomeFrontierTarget` uses destination-biome spacing to scale ordinary surface
steps. Discovery, minting, frontier level previews, and biome transition
previews share it. Existing special Field boundary projections and explicit
quest/pocket distances retain their own rules. This complements the standing
node-spacing/settling system rather than replacing it.

The controlled real-mint probe creates **10 desert nodes versus 22 jungle
nodes over 1,400 map units**, including graph settling. This is a one-dimensional
equal-distance experiment, not a universal two-dimensional density ratio.
Whole-world counts also depend on climate, water, routes, and biome boundaries.

## Versioning and extension

`buildManifest` stamps `geographyVersion: 2` for new expeditions.
Unversioned/legacy saves reconcile to version 1: original biome ownership,
original depth and frontier steps, and no newly imposed escarpments.
`WorldSim` installs the run's version before constructing its biome field.
This locks the algorithm choice, not a snapshot of all future biome registry
edits. Future incompatible geography changes require a version/migration plan.

Tune `ESCARPMENT_CFG` for frequency, elevation/rise, segment lengths, pass
width, influence reach, rim width, and the associated locale/river vocabulary.
Clear its cache after changing live configuration. Add locale variants or
builders for alternative climbs; additional barrier families can reuse the
saved terrain contract and socket/approach system. Biomes can set their own
radius range without changing occurrence weight or node spacing.

## Verification

`balance/probe_geography.ts` covers version replay, real region acreage,
controlled node density, segment/pass road tests, all four sealed rims,
all four ascent orientations across three seeds, winding route length,
fall-region policy, cave presence, real pass discovery/reconnection, dimension
isolation, and save/co-op preservation. It is enrolled in the fast probe gate.
The atlas probe includes version-2 line features and checks reach beyond their
finite endpoints. Generation QA enumerates both new locale programs.

The underground-span growth fixture retains its hundred-node floor and now
checks growth at every expansion, allowing nine batches for the changed biome
spacing. The authored-map guard fixture distinguishes base generation from
ambient patrols and verifies both exact shrine posts.

The inn speech fixture seeds the engine die as well as the manifest so its
30-second movement witness is reproducible across runs.

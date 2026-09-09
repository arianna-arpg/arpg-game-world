# Atlas features and playable places

The atlas update (`b19493e`), integrated from `origin/main` at `d316506`, and
regional journey stages now share the generation workspace. The intended hierarchy remains world geography →
regional connections → zone context → playable routes and sites. The atlas is
the geographic authority; adding an independent world-feature generator would
break the connection between the chart and exploration.

## Implemented in this integration

`placeZoneAt` samples `featuresAt(target)` once for a random surface frontier.
The same hits supply both the existing roll/recipe fold and a new
`ZoneDef.geo.atlas` context:

- the world field seed and original geographic sample coordinate;
- each feature's stable id, kind, name, seat, distance and influence reach;
- its map-panel label, icon and explanation as inherited at mint;
- the combined harvest bounty, including an explicit `null` when absent.

The existing `geo.features` ids remain for compatibility. Relief, layout knobs
and discovery rolls remain on their existing zone fields. Atlas roll arrays
and nested recipe parameters are copied when folded, so mutable definition data
does not leak into already minted zones.

Harvest boot and the feature rows in the zone panel prefer the retained context.
Older saves with only feature ids retain the previous registry lookup. New
discoveries see updated feature definitions; replacing a registry row clears its
finder cache. This is retention of **zone inheritance**, not a versioned snapshot
of every world field, landmark builder or mod in the entire run.

The actual save writer and restore sanitizer retain this context. Co-op zone
messages now carry the whole `geo` record, deep copied at each end; messages
without geography clear the client's previous record. This is current-zone
geography transport, not a new mechanism for revealing undiscovered destinations.
Visited/surveyed checks still gate the atlas's zone-panel rows.

An explicit `dimension: 'surface'` now behaves like an omitted dimension for
atlas inheritance. Directed mints and other dimensions retain their exclusion.
No installed atlas seed or no feature hit adds no atlas context.

## Composition with regional journeys

River geography still supplies the course and its local orientation. Progress
along that course selects headwaters, constricted reaches or lower reaches;
those stages change crossing counts, channel width and island opportunities.
An atlas feature may influence the same zone without erasing its journey.

Recipe precedence, from strongest to weakest:

1. Explicit mint specification.
2. Atlas feature parameters.
3. Course parameters, including the selected regional stage.
4. Rolled tileset variant, tileset, biome.

Layout-generator choice still follows explicit mint → stage → course → tileset
→ biome. Atlas features currently supply influences, not generator selection.
New atlas parameter rows must preserve geographic course orientation; adding a
generic parameter override is not a substitute for agreeing on shared borders.

## Three different promises

| Map representation | Meaning | Present status |
| --- | --- | --- |
| Biome dressing glyph | A visual cue for the regional palette | Implemented; not a promise of an individual object |
| Geographic influence | A feature affects zones sampled within its reach | Implemented: relief, resource bonuses, landmark/composition rolls and recipe knobs |
| Named destination | One persistent place with required local content and access | Next contract; not implemented by this change |

A summit's crag roll and a lake basin's lake rolls remain probabilistic, and
placement has its own constraints. Their atlas ids are evidence of **inherited
influence**, not proof that a required structure was successfully built. A
guaranteed citadel must not be implemented merely by changing a roll to 100%.

## Next: discovered destinations and authored expeditions

Build this as a consumer of the existing atlas and authored-map registries:

1. **Definition.** A feature kind can offer destination recipes: an authored map,
   a procedural locale program, or a composition of authored districts and
   generated connections. Eligibility, weights, visibility and footprint live in
   data. The engine should never branch on a particular citadel id.
2. **Identity and ownership.** A destination id derives from the world seed,
   feature instance and recipe version. One durable record owns its local zone
   or zone group. Nearby frontier zones become approaches or connections; they
   must not each clone the same citadel. Choosing the nearest *currently minted*
   node would make the result depend on exploration order and is insufficient.
3. **Geographic fit.** The destination declares required river crossings,
   shoreline/elevation relationships and connection seats. The local generator
   receives those constraints. A curated map that cannot satisfy them must be
   rejected or adapted through a named, attributable rule.
4. **Knowledge.** Geography can exist before the player knows it. Discovery,
   scouting and rumors reveal according to the existing knowledge law; generating
   a destination alone must not expose it on the chart.
5. **Realization.** The result reports required sites and routes actually placed,
   including any repairs. QA checks reachable approaches, required objects and
   both ends of connections, with bounded retries and a deliberate failure
   policy. Only successful realization fulfills a destination promise.

This allows an expedition discovered through ordinary exploration to contain a
curated keep, generated approaches, optional caves and persistent consequences,
using the same world rules as the surrounding wilderness.

## Spatial and compatibility limits

The current graph nudges and settles display nodes after sampling geography.
The retained `atlas.sample` makes that discrepancy observable; this change does
not lock graph nodes to their geographic coordinates. The atlas also deliberately
warps biome borders slightly for presentation. Exact river entry/exit matching,
stable geographic footprints and render placement require a shared spatial
contract before the stronger "every visible mark is locally guaranteed" claim.

The zone context preserves names and bounty from mint, but the atlas's field
painter still reads live definitions. A mod changing the world plan mid-run
therefore needs a separate version/migration policy. Existing saved zones are
not silently reminted or retroactively given the new context.

## Verification

`probe_atlasinheritance` exercises a real seeded atlas lode, combined river-stage
minting, surface and directed-mint boundaries, discovery visibility, actual
harvest reload after a registry edit, nested data isolation, the real save/restore
path and host/client geography transfer and clearing. It requires its seeded
feature to exist; the witness cannot silently skip.

Generation QA over 697 cases × 3 seeds reports zero failures. Investigation of
the original five spacing warnings found a real partial-weld defect: the ground
join pass could union two components after placing only an interrupted seam,
preventing a later valid connection. It now claims a join only when the sampled
seam was completed. The 4 px water seam is repaired around the salt pillar that
blocked the direct join. The new `probe_groundjoins` fails on the old union rule
and passes on the fix, with actual body connectivity, solid exclusion and
determinism assertions.

Four spacing warnings remain: lava at 22 px near the entry clearing and
snowdrifts at 2, 3 and 23 px near ice formations. These are still warnings, not
waived guarantees or proof of flawless rendering. `genqa --verbose` now prints
the exact seam, body positions, nearby obstacles and portal distance for further
inspection. No assertions or warning thresholds were weakened.
Balance smoke exited successfully with the existing provisional magician
time-to-kill flag. Production build and the desktop game smoke test passed; the
desktop test needed a retry outside the restricted environment after its GPU
subprocess could not start there. Visual playtesting of the atlas remains separate.

The ownership guard now reconstructs two-parent merges, attributes inherited
changes to their commits, and checks all staged departures. Its fixture tests
cover normal/numeric edits, clean merges, foreign additions, conflict resolutions,
leftover markers, multiple-parent refusal, inherited deletion and spaced paths.
The actual merge passes without an exception or an ownership claim on incoming
committed content.

Final verification after the seam repair: `npm run check`, all 180 fast green
probes, all five ownership-guard fixture tests, the production build and desktop
game smoke passed. The four slow and four excluded probe suites were not part of
the fast regression run.

See also [hierarchical generation](hierarchical-generation.md),
[the atlas engine](../engine/atlas.md), and [the atlas design charter](../design/world-atlas.md).

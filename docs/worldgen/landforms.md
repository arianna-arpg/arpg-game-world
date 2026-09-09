# Discoverable landforms and recurring natural activity

Surface exploration now claims eleven additional atlas destination families:
ponds, inland lakes, highland tarns, headwaters, fords, river gorges, lower-river
islands, valleys, hills, dry canyons, and volcanoes. Existing terminal river
basins also claim the lake-shores program. These extend the ordinary atlas
finder and destination ownership path; they do not create a second zone graph.

`src/data/landformFeatures.ts` owns distribution, elevation/moisture gates,
names, catchments, glyphs, and locale references. Inland water does not depend
on the rare event of an existing river terminating inland. River sites remain
on the traced river, with headwaters through lower reaches selected from
non-overlapping arc-length bands. Their `interpolate` option prevents multiple
sites collapsing onto one vertex on a short river. Older authored river sites
retain their existing vertex selection and saved identities.

`src/data/landformLocales.ts` registers eleven programs, fourteen variants in
total. Standing water has island-path and encircling-shores alternatives. The
river families vary channel width, bends, and district builders. Dry terrain
uses valleys, narrow stone ribs, switchbacks, overlooks, and cavern branches.
The basin builder accepts a registered `LocaleDistrict.region`, bank width,
and island size; material, collision, drawing, and traversal use the existing
region registry. Shared links and portal approaches are resolved afterward.
The basin's central discovery seat is dry, even with island size zero.

Plans and geographic attribution use the existing saved `locale`,
`destination`, and `geo.atlas` records. Existing visited layouts are retained;
new discoveries use the added tables. No save-version reset is required.

## Recurring activity

`registerFeatureCycle` in `src/world/featureActivity.ts` is the extensible
clock contract. An atlas kind optionally names an `activity`. Each cycle has
ordered phases with ids, labels, durations, map colors, regional weather, an
optional hazardous core, and map flow marks. Phase selection is a pure function
of the feature seat, field seed, and saved world time. It works before discovery,
across large time steps, and after resume without replaying transition events.

The first cycle, in `src/data/featureActivities.ts`, is volcanism:

| Phase | Duration | Effects |
| --- | --- | --- |
| Dormant | 480 seconds | Mountain mark and dry caldera locale |
| Unrest | 45 seconds | Local ash and a warning/countdown in zone information |
| Erupting | 100 seconds | Expanding map flow marks, ash within 640 map units, lava within a 230-unit core |
| Cooling | 150 seconds | Lingering ash; lava enters the shared drying path |

Cycles repeat with a seeded offset per mountain. Durations, radii, intensities,
lava amounts and trail geometry are data. New cycle definitions affect live
activity; compiled locale geometry remains unchanged. A feature is not an
overlay-owned temporary zone and is never removed when its eruption ends.

The overlay only samples activity-bearing feature kinds, with a bounded spatial
cache. It contributes clipped world-map paint and the existing event-weather
source. Towns, ports, sheltered zones, and other dimensions are excluded from
the volcanic sky. The regular strongest-weather rule still arbitrates overlaps.

`WeatherDressRow.trail` adds connected, overlapping pieces to the existing
temporary-ground placement system. Lava uses the registered hazardous lava
material, respects placement/portal/player clearances, stops when blocked, and
shares the existing global piece cap. Ending the front marks every piece for
drying. Returning to the area after dormancy does not change the saved layout.

The map flow lines indicate the active mountain's outflows. They are schematic:
they do not simulate downhill fluid transport, permanent erosion, or exact
shared lava boundaries between independently generated zones. In-zone trails
are seeded local terrain, with actual lava contact and the existing mitigation
rules. Ash uses the existing stationary event-front footprint and particle
system; it is not an independently advected plume simulation. Player-triggered
eruptions and permanent volcanic scars remain separate future extensions.

## World-map scale

`MAP_CFG.viewport.startSide` defines the starting square (520 map units).
100% always means that scope, including after reopening or resuming a run.
The maximum zoom is 100%; the minimum is the ratio between that starting
scope and the known map's longest extent. Larger maps therefore unlock smaller
percentages without losing the close view. Panning uses this same square;
growth preserves the current center where the map bounds allow it. Dimension
changes reset the center. The high-resolution atlas window uses actual visible
scope rather than the displayed percentage.

## Verification

`probe_landforms` checks all eleven families through real destination minting,
finder consistency, phase recurrence and resume, weather coverage and shelter
policy, knowledge-filtered map paint, connected lava placement and real cleanup
reconciliation, and zoom limits across a 100,000-unit map.

The existing locale probe and genqa automatically cover the new programs,
including deterministic generation, final-grid navigation, actual waterways,
cave entrances, and the existing save/co-op serialization contracts.

The full regression pass required remeasuring two encounter fixture seeds:
the prior objective fixture now contains a resident that correctly outranks
its guest, and the crown encounter's random stream moved with the starter
graph. Their assertions and the crown's 26-attempt budget are retained.
The undergrowth coverage fixture walks at least nine batches and until 100
surface nodes are covered, capped at 32 batches; it still rejects any batch
without progress. Named destinations merge multiple approaches, so a fixed
batch count no longer represents the same coverage. The measured run reaches
100 nodes in 15 batches; a diagnostic 32-batch walk reached 229 without stalling.

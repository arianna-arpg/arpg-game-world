# Exploration diversity: foundation and implementation direction

The aim is a wider vocabulary of player decisions: where to go, what to risk,
what to investigate, how to approach a fight, and when to return. A seed changing
the wall outline is insufficient evidence of a different expedition.

## Repository and integration state

This work starts on `codex/generation-diversity`, based on `codex/system-audit`
at `4df9cd4`, in its own worktree. The optimization branch is preserved as the
base; the main checkout and other sessions' files are independent.

At the initial inspection, local main had seven commits absent from system-audit,
and system-audit had four absent from main. Main's newer storey/interaction work
must be integrated deliberately before merging the combined work. The remote is
`https://github.com/arianna-arpg/arpg-game-world.git`. These are local-ref observations,
not a claim that remote refs were freshly fetched. Unique-item session activity
was reported by the user, not established through a process or session audit.

## Existing systems to extend

| System | Current capability | Useful extension point |
| --- | --- | --- |
| `src/engine/levelgen.ts` | Open layout registry; merged layout parameters; composition pre/post passes; portal and navigability repair | Shared route contracts, traceable generation stages, bounded repair budgets |
| `src/engine/interiorGen.ts` | Scatter/BSP rooms; spanning-tree connections plus loop candidates; doors; graph-depth room roles; traps | Connection strategies and district roles on the existing room pipeline |
| `src/engine/layoutRecipes.ts` | Winding, spiral, riverland, karst, metropolis, forest, cathedral and other recipes | Reusable subregion builders and connection policies |
| `src/engine/genkit.ts` | Grid-aligned masks, set operations, paths, region/liquid painting | Geometry realization, independent of progression intent |
| `src/engine/massif.ts` | Open country around large barriers, courts, tenants, connected weave | Basin/court networks, multiple approaches, regional passage budgets |
| `src/engine/authoredMaps.ts` | Registered authored maps, markers, fixtures, directed mints | Handcrafted anchors inside generated journeys |
| Compositions, structures, landmarks, annexes | Shared sites, themed placement, secrets, nested spaces | Regional content and optional discoveries using existing registries |
| `src/engine/worldgen.ts` | Zone graph, biome/tileset/variant selection, exits and world connectivity | Distribution of layout families across a run, coherent neighboring regions |
| `balance/genqa.ts` | Registry census, reproducibility, portal/reachability/coherence checks across authored cases | Exploration observations and later family-specific acceptance bounds |

The project already has graph generation. A second monolithic graph generator
would duplicate it. The interior's current connectivity is chosen largely from
room proximity; roles are assigned after carving from that intended edge set.
L-shaped corridor intersections can create connections beyond the intended graph.
New strategy guarantees must therefore be checked against realized terrain, too.

## Reference lessons

These are design interpretations, not claims that Hollow Wake should reproduce
another game's implementation.

- Grinding Gear Games describes indoor generation as connected rooms, contrasted
  with outdoor terrain assembled from tiles and room contributions. Their bug
  account also illustrates why correct individual pieces do not guarantee correct
  composition. Apply the lesson to explicit connection contracts and final terrain
  verification. [GGG's procedural generation bug explanation](https://www.pathofexile.com/forum/view-thread/1998012).
- Path of Exile's original map design includes modifiers that change area size
  and maze complexity. Expose meaningful structural parameters as ordinary data
  that content and modifiers can compose. [GGG's map design diary](https://www.pathofexile.com/forum/view-thread/55194).
- Diablo IV's environment team describes reusable tilesets and transition scenes
  combining sets within a dungeon. Apply this to regional sequences and authored
  thresholds, with different spaces serving different activities.
  [Blizzard's March 2022 update](https://news.blizzard.com/en-us/article/23788294/diablo-iv-quarterly-updatemarch-2022).
- Grim Dawn describes a largely static world with randomized elements, including
  routes blocked differently between sessions. Recognizable geography and variable
  access can coexist; complete geometric randomization is only one tool.
  [Grim Dawn exploration guide](https://www.grimdawn.com/guide/gameplay/exploration/).

## Implemented first increment: observe the finished terrain

`balance/layoutmetrics.ts` is a pure observer. `balance/explorationreport.ts`
records its measurements through the existing genqa matrix, without changing
generation data, consuming random numbers, or running in the game.

From this worktree:

```sh
npm run genqa -- --exploration balance/reports/exploration.json
npm run genqa -- --filter layout:dungeon --seeds 5 --exploration balance/reports/dungeons.json --route-slack 4 --narrow-clearance 2
npm run probe -- layoutmetrics
```

The normal QA verdict remains the verdict. An exploration report can accompany
a failed sweep and includes its failure/warning totals. Generation exceptions
are recorded as errors. Missing grids are explicitly unavailable. Per-sample
identity includes the case, definition, recipe, seed, entry, exits and POIs;
report identity includes the Git revision and working-tree status. Uncommitted
source is identified as such; the report does not archive that source diff.

| Measurement | Meaning |
| --- | --- |
| Coverage | Walkable cells / all grid cells |
| Components | Separate four-connected walkable regions, including unreachable pockets |
| Reachable fraction | Share of walkable terrain connected to the exact entry cell |
| Exit/POI distance | Shortest four-neighbor distance in pixels; null when unreachable |
| Exit/POI detour | Shortest distance / Manhattan cell distance; open diagonal travel scores 1 |
| Farthest distance | Maximum shortest-path distance from entry on its component |
| Narrow fraction | Reachable cells within the configured Manhattan clearance of blocked ground, including the grid exterior |
| Off-route fraction | Reachable cells outside the union of all entry-to-exit routes within the configured extra-step allowance |
| Terrain hash | Exact SHA-256 of dimensions and walkability bytes; excludes visual and encounter identity |

Route slack counts extra path steps, so entering a two-cell side branch and
returning costs four. The observer keeps **all** qualifying shortest routes,
not an arbitrarily chosen BFS parent chain. Larger slack decreases off-route
area. More exits can likewise decrease it. There is no universal "good" score:
an open field, a winding descent and a dense city should have different profiles.

### Scope limits

These are terrain-only, point-body, open-door measurements. They exclude object
collision, actor clearance, door state, ellipse/bounds clipping, traversal between
tiers, costs from hazards and changing terrain. A grid may exist only because a
structure was placed in an otherwise object-driven outdoor layout. Measured does
not therefore mean full live navigation coverage. No-grid cases are not empty
or fully open maps. Ordinary four-neighbor cell cycles are not meaningful counts
of alternate exploration loops; the report deliberately does not label them so.

Off-route ground can be empty floor in a wide room. It is not a count of rewards,
secrets or interesting choices. Identical terrain hashes across variants can be
intentional; different hashes do not prove different gameplay. Use the report
to locate examples for inspection, then assess routes and content together.

Complexity is linear in grid cells per exit, plus the POI/target count. Working
storage is linear in grid cells; no all-pairs paths, recursive flood, or runtime
cache is introduced. QA's existing per-case timing includes observer overhead
when reporting is enabled and must not be treated as a generator-only benchmark.
Reports belong in the ignored `balance/reports/` directory.

### First observed sample (three seeds, optimization branch base)

The full sweep produced 1,959 generation samples: 807 grid measurements, 1,152
unavailable cases and zero errors. There were 372 distinct exact terrain masks
among the measured samples. Cross-case duplication includes shared geometry
and is not a repetition defect count. Static QA cases account for the difference
between generation samples and the 655-case headline.

Representative default recipe ranges in this small sample:

| Recipe | Open coverage | First-exit detour | Off-route reachable ground |
| --- | --- | --- | --- |
| Winding | 12–13% | 1.42–1.69× | 9–22% |
| Dungeon | 15–19% | 1.33–1.56× | 27–50% |
| Edifice | 53–60% | 1.19–1.94× | 48–76% |
| Labyrinth | 60–61% | 2.39–3.61× | 67–79% |
| Massif | 82–89% | 1.03–1.17× | 57–68% |

These samples demonstrate existing differences and the observer's usefulness;
they are not calibrated acceptance thresholds or population-wide conclusions.
Default plains/forest cases were unavailable to this terrain-only observer.

Validation passed: `npm run check`, `npm run probe -- layoutmetrics`, and the
full `npm run genqa` matrix with reporting enabled. The sweep's three nonfatal
spacing warnings (riverland/flame lava, radial/plains water, frost-hollow
snowdrift) were each reproduced on the unchanged `codex/system-audit` base.

## Implementation sequence

### 1. Connect intention to observed navigation

Add an optional generation trace with stable node/edge IDs, chosen strategies,
source definition IDs, role assignments and repair reasons. Preserve the existing
default RNG order. Give new planning stages independent seeded streams so adding
decoration does not redeal the route. Reuse the current grid and object collision
queries to add an offline effective-navigation observer for outdoor layouts.
Keep its actor radius, doors and traversal policy explicit in report metadata.

Acceptance: default generation stays byte-identical; every reported relation
names its source; the effective observer catches a body-blocked passage the raw
terrain observer cannot see; no extra in-game per-frame work.

### 2. Extend the existing connection pipeline with registered strategies

Keep the current minimum-distance tree plus loop extras as the default strategy.
Add a public strategy contract with validated node references and deterministic
output, then realize it through existing carvers, doors, roles and trap placement.
The first distinct strategies should be:

| Strategy family | Exploration decision | Required structural evidence |
| --- | --- | --- |
| Spine with excursions | Continue toward the goal or investigate a substantial branch | Bounded critical-route length; optional branches with depth and purpose |
| Hub and wings | Choose an expedition and return with new access or rewards | Recognizable hub; separated wings; bounded return travel |
| Braided approaches | Choose between routes with different exposure and encounters | Independent realized approaches that survive carving and dressing |
| Loop with a return shortcut | Commit to a long outward journey, then unlock a short return | Shortcut changes travel cost materially; reachable unlock interaction |

Parameters should cover branch count/depth, return cost, route width, loop budget,
goal depth and shortcut policy. A generic payload/role table assigns encounters,
resources and discoveries. Avoid separate per-biome engine branches.

Acceptance: the strategies produce distinguishable **realized** navigation under
the same geometry palette. Test narrow and small arenas, multiple entry sides,
unusual exit counts, overlapping corridors, unreachable role seats and hostile
decoration. Reject or explicitly report unmet intent; never quietly flatten it
into a connected but structurally different map.

### 3. Compose districts and authored anchors

A regional plan should describe places and their relationships before choosing
their local geometry: ravine → exposed crossing → ruined courtyard → crypt;
market district beside canals; open basins connected through mountain passes.
Districts select registered builders, palettes and role pools. Connections carry
width, elevation, visibility and traversal requirements. Reuse composition sites,
structure plans, masks and authored-map pieces rather than duplicating stamping.

Acceptance: mixed regions remain legible; seams preserve intended connections;
landmarks are reachable at the promised progression point; regeneration, co-op
and saves resolve the same identities.

### 4. Broaden geographic and progression families

Build on the preceding contracts: tributary valleys, basin chains, escarpment
terraces, bridge archipelagos, breached fortifications, street districts,
parallel mine galleries, nested ruins and landmark-led wilderness. Each must
change navigation or activity structure as well as appearance. Add access-state
variation through existing door, annex, traversal and objective mechanisms.
Verify prerequisite graphs so keys, switches and objectives cannot depend on
the access they unlock. Model ordinary walking and optional mobility separately.

### 5. Curate diversity across a run

Compare distributions by biome, tileset, strategy and world depth; add a seed
gallery through the existing dev map tools. Select families through weighted
data with context requirements and a configurable recent-history penalty, after
save/co-op identity and seed rules have been specified. Keep authored identity:
a city should not randomly become a cave just to satisfy a diversity score.

Gate new content against its own structural contracts and performance budgets,
not a single global score. Track repair frequency and movement/combat tests
alongside exploration profiles. A thousand slightly altered shapes must not
count as a thousand different exploration structures.

## Landing discipline

Keep changes focused and use the ownership gate before each commit. This first
increment touches QA and documentation only. Run `npm run check`, the metrics
probe and `npm run genqa`; gameplay/data increments add their relevant probes,
balance smoke and performance checks. Fetch and review current branch divergence
before final integration, merge main in an isolated checkout, resolve concurrent
changes with their owners' intent intact, and rerun the combined checks. Push and
merge when that integration is ready; no final integration is claimed here.

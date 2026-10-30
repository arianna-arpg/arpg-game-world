# Exploration population and destination audit

Status, 2026-10-09: the derived-cache / settled-query dormancy defect is fixed.
WildernessPaths now adds native-sized ordinary groups, nearby site reservations
and occasional real destination links; see [wilderness-paths.md](wilderness-paths.md).
Native population density, complete content parity, and a continuing wilderness
road network are **not complete**. These are acceptance requirements for seamless
integration, not optional polish after declaring the mode equivalent to main.

## Reproduced starvation

Seed 99, real AI plus World updates, invulnerable/untargetable hero, no player
kills: fourteen controlled arrivals, 3,200 units apart, twenty simulation seconds
at each stop. These are distant arrival stress tests, not a claim about walking
speed or measured player encounter cadence.

Before the fix, 58 surviving owned enemies occupied 60 live population slots
(including other owners), while 36 slots remained reserved for unvisited opening
activities. No owned enemies slept. The last five stops had no nearby enemies.
The decisive lease was World.bombardKey.actors: a derived query cache retained a
previous actor array after World replaced its active list. The dependency scanner
correctly followed that strong reference and refused to unload all its enemies.

The cache now uses weak identity while retaining its length and monster-mint
revision checks. It still detects newly minted guns and same-length actor-list
replacement. Actual pending attacks/controllers keep their normal leases.

A second veto came from continuously refreshed tellNextAt, aiRescanAt and
aiTempoUntil deadlines. Exact native capture can preserve these settled visual,
target-query and movement-duty-cycle clocks. Native tells must match the complete
factory/brain-variant source. Engagement, committed movement/casts, status/resource
clocks, unknown future deadlines, opaque components and foreign references still
veto dormancy. No actor state, health, loot or elapsed deadline is cleared to make
an enemy eligible.

The new probe executes 18 trips with actual AI and World ticks: **360 surviving
identities**, at most **24 active population slots**, **16–21 nearby enemies** at
every destination, no kills, then JSON cold Continue and return. This controlled
plain-ground ordinary-native course isolates the regression. It is not evidence
that every complex native controller can already sleep.

The default-content follow-up with the cache and tell fixes reached 133 retained
natives, 81 sleepers, and 7 nearby enemies at the final stop, instead of the old
58/0/0 result. It still retained worm, tether, conduit, bond, live-timer and other
controller dependencies. The additional idle-AI clock fix is covered by the
controlled live course. **Unlimited default-content travel has not been proved.**
Whole native controller ownership/persistence remains necessary before raising
content density can be considered a complete solution to long-distance starvation.

## Density is a real gap

Reproduce the native reference with `npx tsx balance/exploration-density.ts`.
It calls the actual shared native spawnPacks operation, with the real native
factory, presence, rarity, natural pack sizes, formations and open 1,900 x 1,300
reference geometry. There are 24 seeds at each of levels 1, 12 and 24 in each of
five biomes: 360 native births. This is ambient population only, without the
additional event/objective/structure populations of a complete main area.

| Biome | Level 1 bodies / million units² | Level 12 | Level 24 |
|---|---:|---:|---:|
| Downs | 14.09 | 14.15 | 15.64 |
| Forest | 13.07 | 10.88 | 11.81 |
| Marsh | 15.50 | 12.06 | 12.35 |
| Desert | 14.04 | 14.56 | 15.28 |
| Tundra | 17.66 | 15.49 | 17.59 |

The pre-WildernessPaths ordinary seamless recipe had period 1,100, chance 0.7, and three
bodies: **1.736 bodies / million units² before placement exclusions**. Formation
replacements and separate activity/site populations add encounters, so this is
not a measurement of total rendered world density. Nonetheless, neither the
ordinary recipe nor the complete live content has demonstrated main parity.
Increasing a lifetime-sized cap or multiplying this placeholder recipe alone
cannot reproduce native species grouping, wildlife, rarity, controller events
and their meaningful rewards.

The reference is shared native code whose original implementation is compared
in probe_nativeambient. This audit is not a separate checkout of every historical
main release, and the open rectangular fixture does not substitute for matching
walkable geometry in the final comparison.

## Required integration acceptance

Track these with the ongoing native source/session and complete-owner work in
[native-area-graph-preparation.md](native-area-graph-preparation.md). Extraction
of native birth methods, counts of available source definitions, or decorative
placement are insufficient to pass these requirements.

1. **Native ambient population:** use the actual source's resolved native packs,
   natural groups, wildlife, presence/rarity and formations. Compare source-equivalent
   geometry, level, seed and controller state against main. Preserve its complete
   population budget; do not silently replace it with three mixed bodies.
2. **Travel stability:** run real AI, World, controller and save-page updates during
   no-kill traversal well beyond the population budget, including slow walking,
   direct distant arrivals, reversal and cold Continue. Count newly encountered
   identities, nearby combatants, live/paged owners and refusal reasons. A cap must
   bound resident simulation, not the lifetime number of encountered monsters.
   Return must preserve exact survivors, wounds, consumed rewards and dead enemies.
3. **Perceived density:** measure time/distance between encounters on traversable
   routes, including the opening ten minutes, across biomes and multiple seeds.
   Require at least 90% of source-equivalent main encounter density and no more
   than 1.25x its 90th-percentile empty travel distance. Retain intentional quiet
   locations; do not achieve averages by concentrating all enemies in one crowd.
   These are proposed release gates, not measurements already achieved here.
4. **Useful exploration:** each admitted destination must have its real activity,
   entry/exit, inhabitants, success/failure and one-shot reward/persistence owner.
   Cover native structures, puzzles, objectives, caves and other original content
   categories. Do not count an inert shell as a functioning destination or add a
   second crafting system merely because the comparison game has crafting.
5. **Regional direction and variation:** preserve geographic identity and full
   terrain geometry, intersperse activities with readable travel space, and compare
   repeated travel courses for repetition, disconnected content, excessive hazards
   and missing native categories. Review actual rendered traversal as well as
   deterministic generation receipts.

## Original continuing-road gap

MassJourney explicitly creates a finite Lastlight opening network. Its branches,
roadside encounters and circuit do not constitute a wilderness road generator.
There is currently no implementation that repeatedly links distant wilderness
points of interest. This must remain visible in the integration completion ledger.

The required implementation is an occasional, deterministic network over actual
accepted destinations and their real approach ports. It should join settlements,
ruins, waystations and other suitable activities, offer junctions/loops/branches,
and give the player useful directions without revealing unexplored map content.
A route must reach a functioning destination, rather than stop at an arbitrary
camera/chunk boundary or a guessed center hidden behind native walls.

Plan complete endpoints and body-wide routes before publishing their terrain and
scenery reservations. Respect full source footprints, existing native roads,
water/crossing rules, traversable entrances and purposeful hazard pockets. Roads
must not overwrite native structures, erase gameplay hazards wholesale, or cause
accepted native areas to disappear merely to make a line fit. Prefer paths and
adapted native road styles to imposing one uniform highway everywhere.

Required proof: multiple seeds and biomes, signed/extreme address boundaries,
reverse discovery and bounded cache eviction, identical worker/live sampling,
body-clear travel in both directions to real usable entrances, actual destination
activities/rewards, and Save/Continue with destroyed props and defeated guardians.
Measure route presence and useful destinations encountered during ordinary
travel; a graph of unreachable markers is not a successful road network.

## Verification

- probe_worldmass_exploration: cache invalidation, real pending-attack pins,
  custom tell/deadline refusal, exact clocks, live travel, Continue and return.
- Adjacent dormancy/pin-attribution, engine, formations, native paging, resume,
  native brittle/inhabitant and bombard/warfront probes.
- All three type checks and a built client with isolated character storage.
- Preserve older saved descriptors. This lifecycle fix does not rewrite their
  terrain, population recipes, road geometry, or slain-enemy history.

Final isolated-client verification: eight fresh default seed-99 arrivals with
600 real game frames each ended with **79 survivors, 52 sleepers, 29 active slots,
31 free slots, and eight nearby enemies**. Cold Continue retained all 79 native
identities/species/life/birth receipts and the exact player position; eight more
eligible distant enemies retired during attachment. Returning woke the saved
survivor with its saved life. No client errors or fatal frames occurred. One
intermediate location had zero nearby enemies with 41 free slots, confirming the
separate generation-spacing gap. The controlled course is not a walking-density
or unlimited-complex-controller result.

All three type checks, isolated production build, the new live-travel probe,
adjacent persistence/combat/native-controller probes, 25 simulation smoke episodes,
and generation QA (869 cases x 3 seeds, zero failures, four existing warnings)
passed. Client harness: `balance/exploration-population-ui.cjs`; its default build
path is the isolated `.claude/exploration-population.local.work/dist-final`.

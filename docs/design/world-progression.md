# World progression foundation

## Problem and diagnosis

The September 15, 2026 pass starts from `8868863f`. Crossroads is the actual
starting field, 78 or 86 map units from Lastlight in a seeded direction.
The previous field used Lastlight distance, a 78-unit core, 58-unit rings,
positive-only noise whose amplitude grew without a cap, and 360-unit cells
with a 10% chance of adding five levels. One spike could cover all three
starting exits. Placement also moves nodes: biome spacing, atlas destination
capture, large Field footprints, and road consolidation matter more than a
count of low-level dots near town.

In the original seeds 1–20, 18 worlds had only Crossroads in its reachable
level-one component. Seed 11's three onward exits were levels **7, 8, 9**;
Crossroads was the only reachable field even under a level-six ceiling.
Seed 20 consolidated every opening road into one atlas valley; the reachable
surface component held only three fields. A wider radial core alone did not
repair that topology.

## Implemented rules

`src/world/openingProgression.ts` owns the opening policy. Ordinary frontier
generation reserves two distinct, local approaches from Crossroads. Those
approaches grow through the existing placement, biome, terrain, and road-budget
systems, with at most nine reserved opening nodes. During that small initial
expansion, atlas catchments, existing-node snapping, and giant Field capture
cannot swallow all the roads into one destination. These are normal generated
biomes and layouts, with open cull objectives, not extra portals to distant land.
Water and escarpment guards still apply. Subsequent country uses normal capture.

After the arrival horizon is generated, a breadth-first pass follows actual
reciprocal, unlocked, dry, escarpment-valid roads from Crossroads. It selects up
to nine fields and caps them at **1, 1, 2, 2, 3, 3, 4, 4, 4**. Town, quests,
sealed objectives, concealed/floating zones, special/event ground, ports and
purchased pockets cannot satisfy the contract. Caps only lower difficulty;
other branches keep their field levels. Selection happens before these fields
are played. A cul-de-sac can be useful optional territory; the whole opening
must have onward travel.

The regional field remains centered on Lastlight, preserving the common quest
placement coordinate system. The playable opening no longer depends on a
circular safe core accidentally covering the rolled position of Crossroads.
With `n = level - 1`, the noiseless radius is now:

`radius = 65n + 0.15n²`

The sampler uses its exact inverse. Smooth variation is signed, grows gently,
and caps at ±3 levels. Five-level spike regions remain at 10% of cells, but
start after radius 500 and reach full strength at 680. These are optional
dangerous regions outside the protected opening, not a promise that every
road is safe. Minted levels remain fixed even if later spacing repairs move
the node. The opening check uses the finished road graph to handle that shift.

| Readiness context | Old noiseless radius | New radius |
| --- | ---: | ---: |
| Commander, level 14 | 832 | 870 |
| First leader, level 23 | 1,354 | 1,503 |
| Second leader, level 45 | 2,630 | 3,150 |
| Third leader, level 60 | 3,500 | 4,357 |
| Fourth leader, level 75 | 4,370 | 5,631 |
| Final preparation, level 80 | 4,660 | 6,071 |

These are placement radii, not road distances or locks. Actual quest placement
still pulls water coordinates ashore and attaches to nearby terrain. Leaders
remain available in any order and Odyssey still uses its own 23/45/60/75
readiness progression. No change to campaign rewards, act gates, or leader kits.
The bounded noise makes the surrounding level band more faithful to the quest
inverse than the old positive amplitude (about 40 levels near level 80).

## XP and travel measurements

The shared requirement remains **floor(45 × level^1.55)**. Ordinary monster XP
comes from its authored bounty, multiplied by 0.8 and `1 + .15 × (level - 1)`,
then rarity and other existing modifiers. First objective completion normally
adds `40 + 30 × zone level`. Density, monster roster, layout size, encounters,
and objective choice therefore matter alongside the XP requirement.

The audit boots actual generated zones, observes initial non-boss hostile XP,
and budgets **30% of that population on average plus one objective in three**.
It excludes repeated farming, quest rewards, later reinforcement/wave spawns,
boss bounties, optional encounters, and the inn XP blessing. This is an XP
budget, not simulated successful combat. Completing a cull may require more
than 30% locally; lighter traversal elsewhere offsets that in the average.

Twelve seeds, up to three ordinary samples near each band (550-unit local
generation radius; 320-unit sampling radius; samples within two levels):

| Level | Samples | Median initial bodies | Median budget per zone | Zones per level |
| --- | ---: | ---: | ---: | ---: |
| 1 | 36 | 53 | 172 | 0.26 |
| 5 | 36 | 67 | 366 | 1.49 |
| 14 | 35 | 68 | 1,208 | 2.23 |
| 23 | 33 | 73 | 2,032 | 2.86 |
| 45 | 32 | 65 | 4,150 | 3.96 |
| 60 | 33 | 66 | 5,272 | 4.87 |
| 75 | 33 | 62 | 5,173 | 7.01 |
| 80 | 35 | 65 | 6,177 | 6.49 |

Crossroads is deliberately much smaller than a normal generated field; the
level-one median must not be read as its payout. Different rosters explain
why the level-75 sample needs more zones than level 80. These measurements
support keeping XP costs while providing more accessible territory, rather
than reducing costs to compensate for an inaccessible opening.

The travel model picks the nearest unvisited field reachable through real
roads at no more than hero level + 1. It uses the real XP/level-up function,
counts backtracking crossings, checks live door locks, and awards each field
only once. Twelve seeds reached **levels 13–15 after 24 new fields**, with
24–27 crossings including the next exploratory leg and no stalls. Long walks
on seeds 11, 20 and 76 reached levels **40, 31 and 33** after 120 new fields,
with **127, 147 and 151 crossings**, respectively, without farming or stalls.
This is exploratory pacing, not a shortest route to a named quest.

Later rings widen from roughly 65 to 89 map units per level. They are not
multiplied sixfold to match late XP costs: lateral branches and the area of
the annulus already supply additional territory. Local five-level band
components in the sampled later regions had medians of 14–31 reachable
fields. Some samples had zero qualifying reachable fields from that local
anchor, reflecting isolated/blocked local components or approaches outside
the narrow band. This is **not** a guarantee of uninterrupted overland
progression in every late region. Sailing, caves, deliberate quest routing,
and the full late-game combat/gear economy require longer human playthroughs.

## Validation and limits

- Seeds 1–1,000: **zero opening contract failures**. Connected level-one
  fields: min/median/max **3/3/4**. Fields reachable below level five:
  **10/20/39**. Median four distinct early biomes; some seeds intentionally
  begin within one biome. The graph excludes locked, sealed, one-way, wet,
  cliff-blocked, quest and disconnected shortcuts.
- The regression probe covers 34 representative seeds, including initial
  Odyssey placement on eight, **304 live portal/terrain/lock checks**, exact
  inverse radii, exclusion traps, and save/resume level and XP preservation.
- Actual Warrior pilot combat cleared Crossroads on seeds 11/20/76 in about
  25–30 simulated seconds and reached level 2. Subsequent autonomous fights
  were mixed (two deaths and one navigation stall): the simple pilot lacks
  human route choice, gear spending and reliable terrain navigation. Neither
  the XP budget nor these fights establish all-class survival or wall-clock
  leveling time. Test the early biomes with real movement and retreat choices.
- A hidden production Electron client with isolated saves displayed two
  unlocked **Uncharted · Lv 1** exits, with no fatal error.
- Type checks, production build, smoke simulation and generation QA pass.
  Generation QA: 868 cases × 3 seeds, zero failures, four existing warnings.
- The full fast probe run passed 243/248 initially. Four exposed fixture
  assumptions were corrected: local halo versus quest soundings; unaccepted
  expedition anchors; existing surface reed/brush statuses; and expansion
  from genuinely reachable shores. All four pass individually. The remaining
  objective H2 failure also reproduces on unchanged `8868863f` and is left
  unchanged; it is not a green full-suite claim.

Reproduce the important observations:

```sh
npm run check
npm run probe -- worldprogression
npx tsx balance/audit_worldprogression.ts 1000
npx tsx balance/audit_worldprogression.ts 12 --xp
npx tsx balance/audit_worldprogression.ts 12 --walk
npx tsx balance/audit_worldprogression.ts 3 --walk --steps=120 --seeds=11,20,76
npm run sim -- run --suite smoke
npm run genqa
```

## Saves and next playtest

No compatibility version or account progress changes. Already-generated zones,
roads, knowledge, character XP and completed objectives remain intact. Existing
worlds use the new radial field only when generating additional territory;
they do not receive a retroactive opening rebuild. Use a **new character/world**
to evaluate the opening; keep existing saves.

The [quest geography](quest-geography.md) rules remain in force: directions do
not survey, distant targets use bearings, and local soundings connect through
exploration. The opening pass changes neither map knowledge nor quest routes.

Next playtest: choose both level-one branches, retreat freely, and continue
through levels 2–4 without full clearing. Record class, world seed, zone levels,
deaths, objectives completed, and level when the commander becomes attractive.
Then compare a direct leader expedition with lateral exploration. Pay particular
attention to dense marsh/tundra openings and to late coastal regions; those are
the limits that a road/XP audit cannot resolve alone.

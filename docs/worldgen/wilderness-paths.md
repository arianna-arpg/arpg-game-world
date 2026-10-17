# Wilderness paths and native-sized encounters

Fresh expeditions now use schema 19. Existing saved descriptors retain their
original spacing, mixed slots, reservations and lack of wilderness paths.

## Population

The five ordinary biome recipes use 500-unit spacing, 0.9 admission chance and
150-unit footprints. Each accepted anchor chooses a coherent native species and
uses its captured MonsterDef.packSize, otherwise the tileset's weighted pack
archetypes or ordinary size band. Native presence tables and existing mixed
encounter formations remain. The former early-level mixed-slot quotas do not
truncate these native groups. This is the native group-size precedence, not a
second implementation of complete area birth, rarity or event ownership.

Whole groups admit atomically, receive native squad identity, and retain that
identity through dormancy, portable saves and native pages. A failed seat cannot
publish half a squad. Surviving bodies, wounds and fallen identities remain owned;
capacity does not kill, heal or reroll them. The admission cap remains 96.
Fresh worlds wake at 1,300 units and retire eligible bodies beyond 1,600 (the old
policy retained them to 2,400). The 12-second combat quiet period and every live
attack/dependency veto remain. Existing saved worlds keep their stored radii.

Exact native factory certificates cover settled trail segments, unattached point
tethers, full intact anatomical shell guards and unused ready volatile components.
Wounds, positions, roots, pools and native specs remain in the complete codec.
Pending segment tears/flashes, damaged shells, returning/external tethers, custom
components and active skill state stay live. Full tail/root extent participates
in wake tests and durable page headers; page read preflight checks those headers.
Ordinary enemy ownership grants these certificates; kind-owned controllers retain
their own stricter proofs.

Fresh journey reservations follow the nearby play area and include repeated real
sites. Distant, unissued Lastlight destinations no longer consume a permanent
share of capacity. Nearby garrisons and puzzles reserve their required bodies across the overlapping
retention/encounter neighborhood before ambient packs consume remaining space.
Closer sites take admission priority; native geographic owners retain their own
reserved capacity. Objective bodies pass their owner identity through capacity
checks, so nearby site reservations cannot block that native owner from issuing
its own due reinforcement batch. Previously born dormant puzzle boards restore as retained
owners, just like waking enemies, and cannot be permanently denied by newer
ambient births. This can temporarily exceed the admission cap on return; new
births wait while complete existing owners resume.

`probe_worldmass_wilderness` counts actual accepted anchors after inhibition,
with seeded native groups and formation replacements: three seeds, five biomes,
levels 1/12/24, each in 9,600-square open reference terrain. This excludes protected
geographic footprints and additional site/event populations.

| Biome | Level 1 bodies / million units² | Level 12 | Level 24 |
|---|---:|---:|---:|
| Downs | 13.08 | 13.35 | 13.49 |
| Forest | 12.48 | 12.14 | 12.20 |
| Marsh | 13.14 | 13.10 | 13.10 |
| Desert | 13.16 | 13.31 | 13.31 |
| Tundra | 14.49 | 13.85 | 13.82 |

Main's actual ambient-owner reference is 10.88–17.66 across those biome/level
combinations; see [exploration-population.md](exploration-population.md). These
numbers establish a substantial density improvement, not source-equivalent
whole-world parity. The old raw ordinary recipe was 1.736 before exclusions.

## Optional geographic guidance

WildernessPaths considers existing accepted Fallen Waystations, Rootbound Courts,
Reed-Wake Graveyards, Sunken Caravans and Rime Watches. These keep their existing
native guards, clearance, cache, discovery, rewards and persistence. Roads do not
manufacture empty PoIs, grant completion or require the player to follow them.

Each seeded 7,680-unit district may connect at most two nearby site pairs. Every
link uses the site's authored open southern approach, rotated with its actual
scenery. Short bends precede a bounded detour search; every edge proves its full
90-unit ribbon plus body/raster clearance. Shortcuts are revalidated. Water,
protected sites, native-country footprints, native locales, landforms and patches
can refuse an entire link. Refusal never leaves a partial road ending at a wall.
Ecology reserves the complete native scenery bound beside accepted paths.

The overlay is derived from immutable geography and the saved policy. It writes
no visited-road raster to the character save. Player terrain changes win, then
native terrain keeps its own authority. Plans regenerate after eviction from a
32-district cache and do not depend on which endpoint was visited first. Signed
addresses use exact integer arithmetic. Districts need not connect to one another;
this is an occasional set of local links, not a compulsory global road grid.

The seed-99 `wilderness-survey` course finds three links across sixteen queried
districts, including two well outside Lastlight. Placement is conservative and
cold planning remains synchronous (up to about 3.5 seconds in this local survey);
worker preparation and broader native-area entrance support remain follow-ups.

## Verification and remaining acceptance

- New probe: native size precedence, 15 density comparisons, real distant site
  admission, 72 full player-body/scenery route samples, actual cache access,
  player-edit priority, schema-19 Continue/refusal of downgrade, signed distant
  addresses, cache eviction/replay and whole-edge refusal.
- Real AI/World dense travel: 12 trips, 515 surviving identities, active budget
  48, 27–46 nearby enemies, no player kills, JSON cold Continue. This deliberately
  isolates ordinary native groups; opaque compound controllers remain pinned.
- `balance/wilderness-ui.cjs` exercises the isolated production client using real
  movement input along a complete generated route, eight distant arrivals, durable
  Save/Continue and return. The combined Mu/native-source/wilderness client passed
  a 3,213-unit route (1,102 movement frames) between Reed-Wake Graveyard and
  Rootbound Court. Nearby counts at eight distant stops were 40/58/39/18/8/0/10/16
  (mean 23.625). At the last stop, 262 enemies survived, 168 asleep. Cold Continue
  preserved every saved identity/species/life/birth and admitted 21 new nearby
  bodies after more distant actors retired (283 total, 187 asleep). Returning to
  a wounded sleeping fang priest preserved its 239.4 life. No client errors.
  One empty stop remains; this is not proof of uniform encounter cadence.
  Reports and images live in ignored balance/reports.
- The anatomy probe verifies factory eligibility, live/foreign refusal, full-tail
  proximity, exact wounded native page/portable Continue and ambient squad remap.
- All game/launcher/sim type checks passed; generation QA passed 2,607 cases
  (869 layouts x three seeds, zero failures, four known spacing warnings), and
  all 25 sim smoke scenarios passed. Isolated production build and game boot
  smoke passed. The final owner-aware objective capacity change followed the
  full client course; it passed a fresh build/boot, all types, native-effects
  probe and all five beacon-continuity courses.
- The initial broad 121-probe worldmass run passed 108. Subsequent focused runs
  repaired historical fixture omission and verified retained puzzle restoration,
  native anatomy/pages, journey travel, fields, havens and beacon reinforcements.
  Historical helpers explicitly omit schema-19 policy and restore old group
  composition/spacing; no historical golden hashes were repinned.
- Three remaining broad-suite failures reproduce on the unchanged baseline:
  terrainvariation expects 4225203d67bebfb4 but receives f24109327cf6e53f;
  processioncontinuity fails natural caravan admission at line 247;
  processiongameplay fails checkedProximity at line 97. These are outstanding
  failures, not a green full-suite result.

Complete native source/event/rarity coverage, controller-owned whole-area paging,
long no-kill travel for every compound species, and matched traversable-distance
encounter cadence remain release requirements. The ongoing source/assembly session
owns that integration. This change does not declare those requirements complete.

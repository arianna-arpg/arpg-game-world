# Mixed exploration locales

Ordinary surface exploration can compose several generation methods inside one
zone. The receiving biome supplies its theme, creature pools, weather, and
ambient actors. A saved locale plan supplies the route graph and district
contents. Traditional biome generators remain the majority of eligible rolls.

## Shipped variety

`src/data/explorationLocales.ts` defines six programs: woodland paths, lost
quarters, terraced wilds, oasis paths, marsh causeways, and abandoned excavations.
Each has three route graphs: a braided journey, a hub with discovery wings, and
a broken ring. Optional shortcuts vary independently of the guaranteed route.
All districts remain reachable even when every optional link is absent.

District choices mix open lobed ground, caverns, rock arches, courts, basins,
terraces, and authored fragments. Four original fragments provide a broken
gatehouse, sunken cloister, excavated gallery, and split sanctuary. They can
rotate and mirror; their sockets transform with their terrain. This is original
content using familiar exploration patterns, not imported assets from other games.

## Where it spawns

`registerExplorationLocalePool` maps biome IDs to weighted locale programs.
The shipped pools reserve weight 6 for existing biome generators and weight 2
for each of two locale programs: 60% traditional, 40% composed, among eligible
mints. Unknown biomes retain their normal generators. Pools cannot claim the
same biome twice.

Atlas destinations and escarpments claim their ground first. Directed zones,
explicit layouts, non-surface dimensions, authored shapes or size bands, courses, boundless
maps, aquatic zones, and field expanses keep their existing generation contracts.
These exclusions are in `placeZoneAt`, not repeated in each content row.
The new programs also opt into biome underground networks with `underways: true`;
this permission is baked with the plan, and the normal mouth-placement and
two-way network rules remain authoritative.

## Size policy

`src/world/zoneVariety.ts` holds `ZONE_VARIETY`. Eligible ordinary surface zones
and unforced natural caves expand their rolled axes by 12% (about 25% more
area). The expansion stops at 6000 per axis without shrinking an already larger
zone. Authored arenas, forced cave layouts, sealed pockets, and existing saved
zone definitions keep their sizes.

New composed programs roll a uniform scale from 0.9 to 1.25 around 3400 × 2900:
3060 × 2610 through 4250 × 3625. Landform programs now roll 1.05 to 1.3 around
their own nominal size. Adjust a program's `sizeScale` to change its range;
the compiler uses a separate size seed and bakes the result in `LocalePlan.size`.
Old plans without this optional field still render against their zone's saved size.

## Authoring and reusing a fragment

Use `extractTerrainFragment(map, id, crop, ports)` from
`src/engine/authoredMaps.ts` with an existing `AuthoredMapDef`, including Map
Forge content. The crop is expressed in source grid cells. The function resolves
the source map's legend and padding into registered terrain IDs. It copies
terrain only: quest actors, encounters, structures, and props remain the
receiving district/biome's responsibility. This keeps a reusable room from
silently duplicating a quest's live content.

A fragment carries its ID, source map ID and crop, resolved cell matrix, and
named sockets. Use an odd rectangular grid with 7–31 cells per axis, a walkable
center, and sockets at walkable cell centers. Every walkable cell must connect
to the center. Keep important passages at least three cells wide, and ensure
the smallest district footprint provides at least 30 world units per cell.

Put the fragment in a district choice with `builder: 'fragment'`, a positive
weight, allowed quarter turns, and optional mirroring. Procedural builders can
occupy other choices in that same district. Named link ports are optional:
fragment links otherwise use the socket nearest their approach, preserving
the room's internal passages. Random solid dressing skips fragments so it
cannot seal their authored doors. Other districts use the normal dressing rules.

The common walk grid is painted first, connections and external portals second,
and procedural dressing last. Terraces and other builders do not know program
IDs. Adding another builder is a registry extension; adding another setting is
a data change. A district's named ID seeds its contents independently, so adding
a decorative choice elsewhere does not consume its random stream.

## Replay and verification

Compilation resolves the program variant, optional links, district choices,
fragment transforms, terrain cells, and size. Plans carry program/version/seed,
choice IDs, and fragment source attribution. Saves and multiplayer transfer the
resolved plan; later registry edits do not re-roll an explored place. Increase
a program's version when changing its identity contract.

`npm run genqa` exercises every graph at both size extremes and river
orientations. `balance/probe_locales.ts` additionally covers all fragment
rotations and mirrors, minimum-size doorway connectivity, extraction and source
isolation, pool distribution, real world minting, preserved fallback generators,
optional-link connectivity, and save/multiplayer round trips. Run the full
regression gate after changing the mint policy.

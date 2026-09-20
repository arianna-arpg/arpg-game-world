# Titans

Titans are travelling natural catastrophes, separate from announced World Boss
encounters. They are born in real, often veiled ground, cross reciprocal roads
through several zones, and leave a persistent temporary wake. There is no birth
bulletin, countdown or omniscient map pin. Discovering the body or wake records
that part of the trail; the map joins only discovered, visible endpoints.

## Shipped roster

| Titan | Presence | Wake |
| --- | --- | --- |
| Vhorun, the Sunder-Wyrm | A solid plated serpent spanning up to 1.7 zones | Impassable, fall-aware crevasses with surviving crossings |
| Cindergait, the Walking Caldera | A compact, enormous volcanic mass | A continuous burning river, damaging creatures of every allegiance |
| Istral, the White Procession | A glacial leviathan spanning 1.1 zones | Solid ice ramparts and moving, damaging cyclones |

World Bosses retain Cragmaw, Ashvein, Dolmourn and Velketh, and gain Thessara,
the Rimeheart, and Orun, the Stormcrowned: six sovereigns. Thessara's winter ring
offers an inner refuge; Orun's paired lightning processions leave a central
approach. Both advertise fixed impact locations and then give a recovery window.
Their silhouettes and hoards are individually authored. Vhorun is no longer in
the announced roster. The generic legacy roamer archetype remains authorable,
but no shipped world boss uses its lattice walls.

## Journey and terrain

The initial tuning is one active Titan, four to six zones per journey, 100
seconds per zone, a six-minute first-birth delay and a fifteen-minute cooldown.
Frequency, level gates and the global concurrency profile use the package
system. Each definition has its own minimum level, dimensions, wake layers,
crossing widths, colours, creature, combat and reward references.

Each zone projects the journey along a curved route between its actual portals,
through its interior. The living body is a continuous chain of **visible solid
creature pieces**, using the native creature-part painters. A body over a portal
physically prevents reaching its dwell surface. There is no invisible road lock
and no stand-in lattice. Eligible trees and stone are crushed through rampage.

The exposed wake follows the tail and remains until the Titan dies. Fire and
storms use the existing typed, mitigated contact-hazard pipeline. A continuous
layer shares one re-hit timer, so overlapping discs do not multiply damage.
Each source retains the Titan's name and event identity, even in a scar zone
far from the head. Storm positions follow the world clock.

The head is a real combatant. Recent damage holds its journey for a configurable
combat interval; leaving or disengaging lets it travel again. At the destination
it remains huntable and the travelling body withdraws into the earth behind it.
This prevents a living body from permanently sealing a single-route zone.
Body terrain itself is an obstacle; the head and its native weak points are the
combat targets in this pass.

Solid terrain gets a 2.5-second warning and waits while a grounded actor occupies
its footprint. Authored crossings include clearance around the collision rims.
A conservative connectivity check also refuses scar pieces that would cut
previously connected travel anchors apart. This adds natural crossings on narrow
terrain; a detour must never become an impossible hunt. Permanent scar layers
keep portal approaches clear. Moving bodies may still temporarily obstruct them.
Boundless worlds, tiered zones, caves, sanctuaries and special event stages do not
host Titan routes in this pass.

Killing the head retires the journey once, pays its reward once, and removes its
local body and hazards on the next terrain reconciliation (at most 0.25 seconds).
Other systems' scenery and effects remain. Crushed original props return through
the native staggered, occupant-safe regrowth law. Revisiting a healed zone creates
its ordinary terrain; revisiting an active scar reconstructs that scar.

## Extension seams

- `src/data/titans.ts`: roster, journey tuning, body and wake recipes, damage
  rules, creature looks, combat definitions, and terrain visuals.
- `src/packages/overlays/titans.ts`: engine-free journey, discovery, map and save
  state. Saves retain identity, path, travel progress, health and discovery.
- `src/packages/defs/titans.ts`: package registration, validation, kill rewards,
  progression and map markers.
- `src/engine/titans.ts`: local geometry, safety, source attribution and scene
  reconciliation. No creature-id branches.
- `Doodad.contactSource` / `contactGroup`: reusable source ownership and shared
  contact cooldowns, available to any future continuous environmental hazard.
- `creatureTerrain`: native look parts on terrain, with optional warning/vortex
  presentation. No image assets or separate creature-rendering system.

Terrain pieces are not saved as mutated zone definitions and are excluded from
the static co-op zone packet. Repeated scene snapshots create, move and remove
them on clients, including recovery from a missed cleanup packet. Titan health
persists; individual encounter phase clocks and broken-part state currently
restart with the native actor when re-entering the head's zone.

Developer panel → Events has one **Titan:** button per definition. These waive
the level floor, but still require eligible ground and a real reciprocal route.
World Boss buttons continue to use the announced package.

## Verification

`balance/probe_titans.ts` covers distant births, roster separation, real roads,
fog-safe maps, persistence and deterministic continuation, combat holds,
malformed saves, corridor protection, actual solid terrain and pits, attributed
fire damage, shared cooldowns, moving storms, occupant safety, co-op reconciliation,
and an actual head kill releasing its wake. It is enrolled in `proberoster.ts`.

`balance/titans-ui.cjs` captures isolated hidden previews of the body, each wake,
the new sovereigns and the map. It uses its own saves and profile. After building,
run `npx electron balance/titans-ui.cjs`; optional mode arguments select a subset
(`body`, `vhorun`, `cindergait`, `istral`, `rimeheart`, `stormcrown`, `map`).

Also run the full type check, event audit, simulation smoke suite, rampage,
world-boss spectacle and loot probes, anatomy and painter-parameter probes.

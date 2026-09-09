# Hierarchical generation: one world, many scales of adventure

The core vision is a coherent, expanding world whose locations are explored as
connected zone nodes. Each location contains an ARPG play space with its own
routes, encounters, discoveries and consequences. World geography and playable
terrain must describe the same place at different scales.

The user's references describe complementary goals: Minecraft-like discovery of
a larger world mass, RimWorld-like locations with local rules, and ARPG-level
route and encounter design, with Path of Exile 2's mapping as a high-level
inspiration. This does not require voxel terrain, a colony simulation, or copying
another game's progression restrictions.

## The hierarchy

| Scale | What it determines | What the player decides |
| --- | --- | --- |
| World mass | Continents, elevation, climate, seas and broad biome regions | Which country to explore, where to travel next |
| Regional features | Rivers, mountain chains, roads, settlement networks, ruins and territorial pressures | Which route to follow, where to leave it, which destination to pursue |
| Location network | Zone identities, entry/exit relationships, local purpose, available access and frontier discovery | Which node to investigate, bypass, return to or change |
| Playable locale | Districts, approaches, loops, branch depth, obstacles and traversal | How to explore and approach danger inside the location |
| Sites and activity | Rooms, landmarks, inhabitants, resources, objectives, secrets and encounters | What to fight, investigate, collect, unlock or leave behind |

The layers share constraints and identities. They should remain small cooperating
systems behind open registries, with clear inputs and outputs. Adding a world
feature or a local builder should not require editing one enormous generator.

For example, following a river can reveal several crossings upstream, a narrow
choice of crossings farther along, and scattered island discoveries downstream.
A later extension might connect a riverside settlement, its road, an abandoned
fort and a crypt. Their relationship is planned regionally; each location can
still have multiple local arrangements and encounters.

## What already exists

- `world/continents.ts`, `world/climate.ts` and `world/biomes.ts` provide broad
  geography, climate-conditioned regions and lazy coordinate sampling.
- `world/relief.ts` traces surface rivers downhill through that geography.
- `world/courses.ts` carries long regional features across multiple locations,
  including continuation directions, orientation and terminus discoveries.
- `engine/worldgen.ts` creates connected locations and bakes geography,
  biome/tileset choices, generation settings and a layout seed into `ZoneDef`.
- `engine/levelgen.ts`, its recipes, interiors, masks, compositions, structures,
  landmarks and annexes realize the local place.
- World state, overlays, zone memory, objectives and traversal mechanisms already
  provide places for persistent changes and conditional access to live.

The architecture therefore needs stronger agreements between existing layers,
plus additional reusable planning vocabulary. A second independent world map
or a second room-generation pipeline would undermine coherence.

## Implemented increment: regional journey stages

`CourseSpec.stages` connects a location's position on a regional feature to its
local generation. The stage is selected from normalized arc length on the
existing course, measured from its source to its traced end. It is independent
of the order in which the player discovers those coordinates.

Each stage is ordinary data:

```ts
stages: [
  {
    id: 'upper_crossings',
    label: 'The upper crossings',
    span: [0, 0.4],
    layoutParams: { riverWidth: [70, 100], causeways: [3, 4] },
  },
  {
    id: 'lower_islands',
    label: 'The lower islands',
    span: [0.4, 1],
    layoutParams: { riverWidth: [200, 260], isles: [2, 4] },
    compositions: [{ composition: 'hermits_camp', chance: 0.2 }],
  },
]
```

Stage fields:

- `id` and optional `label` provide durable identity and player-facing wording.
- `span` is `[start, end)` in 0..1; an end of 1 includes the exact terminus.
  Nonoverlapping rows may be stored in any order. Gaps use course defaults.
- `forceLayout` optionally names an existing registered layout recipe.
- `layoutParams` overrides course defaults through the same local parameter bag.
- `compositions` and `landmarks` contribute existing discovery/placement rolls.
  At the terminus these append before the course's existing terminus rolls;
  they do not replace the destination's content. Duplicate authored rows remain
  independent rolls, consistent with existing roll composition.

No stage can replace the course-derived `riverSides`: that orientation belongs
to the regional connection. The authoring validator rejects that key on stages.
Directed mint specs retain their existing authority to override local settings.

The precedence for local parameters is:

**Biome → tileset → variant → course → stage → derived course orientation → directed spec.**

The recipe precedence is directed spec, then stage pin, course pin, tileset pin,
then the existing biome choice. A stage without a recipe pin inherits the normal
choice. A recipe-changing stage is responsible for honoring that route's
connection requirements; the framework does not invent a transition builder.

### Durable identity and attribution

Newly minted staged locations carry `ZoneDef.journey`: course ID, instance key,
normalized progress, course label, and selected stage ID/label. An instance key
uses the course ID, resolved anchor and existing instance seed. Separate rivers
can share a stage definition while retaining separate identities.

This record is baked with the final local settings. Later map-node settling does
not reselect the stage. The existing zone-info contributor reads its labels,
so a surface river's stage can be described even though it does not repaint the
local biome. The save writer preserves the record in the existing zone definition;
the host's terrain message carries it as an optional `journey` field. Client
adoption copies it and clears it on an unstaged arrival. There is no new runtime
counter, per-frame generator, or alternate save format. The regression test drives
the real save writer, restore scrubber and network serializer/adopter; a full
multiplayer play session has not been tested.

Unstaged courses add no journey metadata and preserve the previous mint-hint
shape. Previously saved locations keep their baked settings; adding stages to a
course affects newly minted locations. Exact future layout replay across changes
to the generator itself still needs an explicit generator-version policy.

### First live content: surface rivers

`RIVER_JOURNEY_STAGES` in `world/courseStages.ts` is attached to `SURFACE_RIVERS`:

| Stage | Arc span | River width | Crossing roll | Island discovery roll |
| --- | --- | --- | --- | --- |
| Headwater crossings | 0–0.3 | 70–100 px | 3–4 | 0 |
| The long crossing | 0.3–0.7 | 140–190 px | 1 | 0–1 |
| Islands of the lower river | 0.7–1 | 200–260 px | 2–3 | 2–4 |

These are the existing riverland builder's parameters. The biome still supplies
its own dressing and `freezeAt`, so a cold river keeps its freezing behavior.
The focused probe checks surviving bridge geometry and reachable discovery seats
under the same palette and seed, rather than merely comparing parameter values.

A principal crossing is not a hard progression lock: water, movement skills,
freezing and other existing traversal rules retain their own behavior. This is
useful emergence. No mandatory swimming restriction or bespoke key gate was added.

### Deliberate limits of this increment

Stage spans express regional location, not a generated mission sequence. A short
river or sparse node spacing may skip a stage, and several nodes may share one
stage. Reaching every chapter exactly once would require a regional landmark/node
planning contract. A lower reach is not guaranteed to be an ocean mouth: a traced
river can end inland under the existing relief rules.

Stage identity is sampled at the mint's existing course query coordinate, before
its subsequent placement/settling adjustments. That follows existing course
selection. Regional sides express direction; exact shared boundary geometry
between two independently generated zones is not implemented here.

The world fields and stage selection are deterministic. This does not make the
whole existing world-mint process discovery-order independent: seedless mints,
name/ID assignment and neighborhood-dependent graph placement have their existing
rules. That larger guarantee must be designed and tested separately.

## Contracts for the larger engine

1. **World identity.** Parent geography determines the context available to child
   generators. Location identity and generation seed policy must be explicit;
   visiting a neighbor must not silently redefine a discovered place.
2. **Shared connections.** Both ends of a regional connection refer to one stable
   connection record. Later contracts should describe travel direction, crossing
   type, terrain/elevation constraints and access state. Local realization reports
   whether it fulfilled those constraints.
3. **Local variety.** District and route strategies choose structural alternatives:
   spines with excursions, wings, braided approaches, return loops, obstacle basins
   and mixed interiors. They compose the existing builders.
4. **Purposeful occupancy.** Sites carry roles and requirements; registered content
   tables populate them. A strategic fork, refuge, resource pocket and dangerous
   shortcut should each have a reason to exist.
5. **Attribution.** A generated feature should identify the parent, rule, selected
   option, seed and any repair that produced it. The trace must distinguish intended
   routes from accidental corridor intersections or finalizer-created shortcuts.
6. **Persistent consequences.** Exploration and actions update world state and zone
   memory. Those deltas compose with the generated base rather than rerolling the
   base whenever an event changes. Access changes must reconcile both sides.
7. **Bounded work.** Geographic queries remain lazy and deterministic; local grids
   are generated when needed. Parent/child budgets bound work, retries, memory and
   content density. No global all-node rescans per frame to support this hierarchy.
8. **Versioned content.** Before changing seed identities or generation semantics,
   specify how saves, multiplayer peers and mods agree on a generation version and
   registry manifest. Existing saves need an explicit retention/migration choice.

## Next implementation targets

The atlas update is integrated with these journeys. See
[atlas contracts](atlas-contracts.md) for retained geographic provenance,
save/co-op behavior, the distinction between influence and a guaranteed
destination, and the proposed ownership/placement contract for discovered
authored expeditions.

First, add a traceable regional connection/locale-intent contract. Then extend the
existing room graph with registered connection strategies and check them against
realized navigation, including object collisions. Mixed districts follow that
contract, allowing one location to combine an approach, outdoor court, interior
and optional discoveries. Broader regional families can then reuse it for roads,
mountain passes, settlement chains and nested ruins.

An eventual world-level variety policy can track the structural families the
player encountered and vary future opportunities within regional constraints.
That policy must preserve coherent geography and saved identity. It should not
turn a river valley into an unrelated dungeon to satisfy a repetition score.

See [the exploration roadmap](exploration.md) for the initial terrain observer,
its limits and the detailed route-strategy sequence.

## Verification

`probe_coursestages` covers exact boundaries, gaps, invalid/overlapping spans,
reference errors, legacy hint shape, discovery-order independence, instance
identity, route continuation, additive discoveries, real mint precedence,
definition serialization, actual save/network paths and realized crossing/island
differences, including clearing stale client labels when leaving a journey.

Genqa derives stage cases from the course registry. The first three river stages
add 42 cases across compatible biome parameter sets and normal/small footprints,
using both cardinal orientations. The full sweep passed 697 cases × 3 seeds with
zero failures. Its five nonfatal spacing warnings include the previous three and
two snowdrift-spacing observations in newly covered tundra stage cases (2 px and
3 px). Those warnings remain visible; no assertions were weakened.

Type checks, the stage probe, existing relief and soul-river probes, and balance
smoke passed. Balance smoke also reported one provisional magician time-to-kill
tuning flag; it is not a generation failure. Playtesting at the intended camera
scale remains necessary before treating the new stage parameters as final tuning.

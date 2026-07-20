# THE RELIEF FABRIC — elevation + the rivers that obey it

The land's vertical truth, built on **the Foreordained Tenet** (the sea
fabric's law, applied to terrain): the whole infinite world's relief is a
pure function of the seed, every coherent feature computes **whole at first
touch**, and nothing needs a horizon — the "here be dragons" fringe is
simply the part of the seed's world nothing has touched yet. Exploration
can never outrun the plan, because the plan *is* the seed.

## The pieces

### Elevation — the 'elevation' climate axis (`world/climate.ts`)
A lazy, seam-free scalar field like every axis: two noise octaves for the
slopes, a **`ridge` layer** (new kind: `(1−|2n−1|)²` — sharp crests, so
ranges have spines instead of blobs), and a negative **coastal** layer that
pulls the land down toward every shore — rivers seek the sea for free.
Sampled hot through `climateAxisAt` (the single-axis cheap lane; identical
to `climateAt(...).elevation` by construction). Biomes claim it like any
axis: the Mountains and Highlands now stand where the land actually rises,
marsh pools in the hollows, farmland stays off true peaks (a mountain-seated
capital honestly keeps sheep fells — downs carry no elevation gate).

### Rivers — traced, non-painting courses (`world/relief.ts`)
`SURFACE_RIVERS` is ONE course row wearing three new course-fabric levers:

- **`tracer: 'downhill'`** (`registerCourseTracer`) — the polyline comes
  from a registered tracer instead of the closed-form serpentine: strewn
  SPRINGS (jittered lattice, elevation-gated — a spring dealt onto low
  ground stays dormant) walk steepest-descent with momentum until the sea
  (a mouth), a basin no probe escapes (a lake end), or the reach bound.
  Every river descends by construction (`probe_relief` C1).
- **`paints: false`** — the course never writes the biome field: a river
  crosses whatever country it crosses. Tundra keeps a frozen river (its own
  `freezeAt`), the jungle a warm one; worldgen's hint cross-check accepts a
  non-painting course on any local biome (nothing to disagree with).
- **`forceLayout: 'riverland'`** — zones minted ON the river carve the
  riverland recipe in their LOCAL tileset's dress, oriented by the flow
  tangent (`riverSides`), with onward exits guaranteed (course
  continuation) and the centerline hug keeping the chain followable.

The fabric registers the row onto the surface dimension via
`registerDimensionCourse` (the `registerDimensionClimate` pattern — fabrics
import the dimension registry, never the reverse). `world.courseMintFor`
now resolves the surface like any dimension row.

### The one installed truth — `setReliefSeed`
Course instances carry hash-derived seeds that cannot recover the field
seed, but a tracer must descend the SAME elevation every other sampler
reads — so sim boot installs the field seed once (`setReliefSeed`, beside
`setClimateOrigin`/`installCapitalPole`; pure shared-seed data, so host,
clients and reloads agree). No seed installed = tracers return empty =
rivers inert by construction. Installing flushes the course polyline memo
(the climate-invalidation law: a re-seeded context never serves traces
computed under the old ground).

### The map
`BiomeField.renderMap` draws every river that could cross the wash window
(`riverPathsInRect`) as a blue thread over the heat map — from the same
foreordained polylines the mints ride, derived under the same seed salt
(`COURSE_FIELD_SALT`, the one shared constant), so the map can never draw
a river the mints don't see.

## Dials
`RELIEF_CFG` (springs deal, trace shape, corridor) in `world/relief.ts`;
the elevation stack inline on its axis def in `world/climate.ts`; biome
claims as ordinary climate affinities in `world/biomes.ts`.

## Verification
`balance/probe_relief.ts` — the elevation law (shore falloff, cheap-lane
agreement), the springs deal (existence + foreordained determinism), the
downhill law (descent + mouths), the mint-hint law (riverland forced,
coherent orientation, silence off-corridor), the any-country law (riverland
carves sound in foreign dress), the non-painting law, the inertness law.

## Queued
Flux-accumulation widths (tributary junctions already emerge where traces
converge), lake landmarks at basin ends (terminus-by-cause), riverside
affinity tilts (farmland valleys — civilization follows water), harborholds
at mouths, and the PROVINCE/ARCHETYPE layer above (per-region capitals and
world styles rolled from the seed).

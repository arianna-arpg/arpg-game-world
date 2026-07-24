# THE SETTLED BELT — farmland + metropolis

The world's tamed core finally gets its countries: **farmland** (the worked
outskirts — crop seas, hedgerow bocage, harvest villages) and **metropolis**
(the walled city — district faces, buildings-as-massifs, ascension floors).
The layered approach the player walks is the design: wild country → open
shires → wheat that eats sight → paved lamplit villages → the CITY GATE →
the districts — and then UP, into rooms the map never showed.

Everything is a registry row on an existing fabric. The pass added exactly
one new engine module (`engine/settled.ts` — two recipes + one mass shape),
one rouse row, and a render fix; the rest is data.

## Where the belt grows — THE CAPITAL POLE

**Existence is a guarantee; the address is the dice.** Every world seats ONE
capital — at a per-seed pole (`world/civics.ts`: bearing + distance rolled
from the world seed, walked ashore onto land WALK-JOINED to home, standoff
floor + bearing re-rolls in `CIVIC_CFG`), never around the start. The pole
installs the `'capital'` climate anchor at sim boot (pure seed math — host,
clients and reloads agree; `setClimateAnchor`), and two seams read it:

- **The `'civic'` axis** (climate.ts): noise-free distance-to-the-pole,
  reading FAR everywhere until the anchor installs — so the capital field
  bands (`world/biomes.ts`) are inert in anchor-less contexts by
  construction. The bands stage the city as true geometry: `capital_seat`
  (the ONE forced cell — single-entry table through the all-zero fallback,
  affinity-proof), `capital_core` (diced, metro-led), `capital_ring`
  (farmland-led worked country; the downs claim dry cells — a dry-belt
  capital is honest sheep country).
- **The wildness BASIN** (a `basin` layer on the wildness axis): the capital
  TAMES its surroundings, so the settled biomes' own affinities live there
  and stage city → crofts → downs → wilds outward on their own. A near
  pole's basin can kiss home's calm (one settled vale); a far pole leaves a
  wild march — per-seed world character.

Near home the only remaining structure is the **`home_shire` TILT** (mode
`'tilt'`: band weights MULTIPLY the global table instead of replacing it) —
worked land is likelier at the door, never the law, and every climate keeps
its own doorstep (a frigid origin keeps its taiga). Metropolis additionally
carries a `hearth` affinity gate so the global die can't seat a surprise
city AT the door (it wakes ~320 units out; the capital seat never rides
that die). Any origin/anchor change flushes the field-pick memo
(`registerClimateInvalidation` — re-anchored worlds can never serve stale
picks). Probes: `balance/probe_civics.ts` (pole/seat/basin/free-start laws)
and `probe_settled.ts` RIG H (the capital guarantee).

## The pieces (where each lever lives)

### Generation
- `engine/settled.ts` — **SETTLED_CFG** dials + two recipes + one shape:
  - **'fields'** (farmland): `carveMassifs` bodies (hedge/croft/fold from
    `massifMasses`) + REAL portal roads — `carveWay` cuts the corridor and
    lays the traveled way on the SAME polyline, so a road crossing a
    hedge-line punches a gap that reads as a field gate. Dials (all
    layoutParams): `roadCount`, `roadKind` ('road' gravel → 'paved_way'),
    `roadWidth`, `roadCarve`, `wayLamps` (a lit lane is a FACE choice).
  - **THE PARCEL PASS** (`layCropParcels`, run by 'fields' after the roads):
    the tilled patchwork that makes worked country READ as worked country —
    rectangular plots, crops planted in true ROWS off ONE shared plow
    bearing per zone (± `parcelBearingJitter`), a furrowed `tilled_earth`
    wash beneath them (the painter draws its grain along `rot`, so a
    lattice of strips merges into one plowed field), fallow plots
    (`parcelFallow` — bare furrows; the fallow-shires face leans to 0.55),
    an optional rail run along one long edge (`parcelFence` — a boundary,
    never a box), and headland litter (bales, a scarecrow). Dials:
    `cropParcels` count band, `parcelW`/`parcelH`, `parcelCrops` (weighted
    `CropParcelRow`s — kind/spacing/rowGap/size per crop; `PARCEL_CROPS` is
    the reference table), `parcelTill`. Every placement runs the scatter's
    own gates (walk / forbidOn / reserved / clearway — via the exported
    levelgen primitives), so plots yield to roads, ponds and steadings
    exactly like hand scatter: a lane crossing a field mows its strip
    through the wheat. Draws are unconditional per try (the findSpot
    discipline). The crop vocabulary grew two kinds beside wheat/corn:
    **barley** (wheat's veil contract, paler gold) and **flax** (knee-high
    and deliberately OPEN — no sight block, so the patchwork alternates
    blind wheat and honest blue: vision as terrain, chosen by the plow).
  - **'district'** (metropolis): one recipe, two param-picked modes.
    `districtMode:'massing'` carves BUILDING masses (tenement/manor), cuts
    lit **boulevards** (`boulevards`, `pavedKind`, `lampKind`,
    `lampSpacing`), and furnishes court interiors from a weighted
    **courtKit** (or seats a whole `courtStructure` in grand courts).
    `districtMode:'blocks'` lays the planned city: a plot grid raising plan
    structures from a weighted **blockPool**, plaza plots dressed from
    **plazaKit**, paved street seams (`paveStreets`), corner lamps. The
    sacked-city 'metropolis' recipe (graveland) is untouched.
  - **'block' mass shape** — the rectangular walled court: a rotated rect
    annulus with 1–2 punched door-mouths (the court's never-half-punches
    law) reporting its interior as a POI. The city-block silhouette the
    round court couldn't read as; croft yards wear it too.
- `data/massifs.ts` — kinds **tenement** (brick TRUE WALL, chimney-stack
  crests = the roofline), **manor** (pale dressed stone, garden courts,
  lamp/topiary skirts), **croft** (drystone PARAPET yards — duel across,
  walk around). Regions in `world/regions.ts`: `tenement_wall`,
  `manor_wall`.
- `data/settled.ts` — the kit: crop rules + stamps (`wheat`, `corn_stand`),
  `wheat_field`/`millstead`/`village_green` clusters, `corn_rows`/
  `orchard_walk` formations, `paved_way` (the road's exact clearway
  contract in dressed setts), `street_lamp` (+ a civic **lightwell** row:
  the lit road slows the Gloaming's bleed), `windmill`, trade-yard props
  (`hide_rack`, `target_butt`), the stair-mouth rules, and the
  `freehold_watch` dormant tag.

### The crops (the vision-obscuring calm)
Wheat/corn are **walk-through, shoot-through, SIGHT-eating veil cover**:
`overlap:'inert'` + `blocksMove:false` + `blocksShot:false` +
`blocksSight:true` + `veil:{group:'crop', standStatus:'canopied'}`. The AI's
perception rays cut at the crown; aim assist drops foes inside the patch;
anyone standing in the crop wears `canopied` detectability. The visual half
is the canopy over-draw (`wheatTops` — CANOPY_STATIC, so a crop sea BAKES
like a forest roof). Veil group `'crop'` keeps a field from fusing with the
woods' canopy patches. Fields read calm — and you cannot read the wheat.

### The pasture + the folk (the living farm)
- Livestock (`wool_sheep`, `plow_ox`, `dooryard_hen`, `greylag_goose`) are
  'critter'-tagged near-blind neutrals that **graze** (post `{hold:false}`
  bounds the idle wander to an orbit) and **rout on a wound** (morale, not
  scripts): `breakAtLife 0.999` + `panicOnAllyDeath` scatters the fold. The
  sheep flock as one body (grounded `behavior.flock`). Wolves already hunt
  them — `prey:['critter']` through the hunger drive; the fold-raid stages
  itself. The goose is territorial on purpose.
- Folk: `crofter` (no kit, mills about, bolts) and `village_warden` — a true
  SENTRY: dormant tag `freehold_watch` (planted vs weather/shoves, walks
  home displaced without waking), roused by a wound (`World.rouseRules`
  row: the whole local watch turns out), forgiving by `NEUTRAL_RESET`.
- Faction **freehold** + RELATIONS rows (bandit/chattel/carven/goblin/
  vermin/undead) make farm raids the ordinary faction-war loop. Folk pay
  no xp and mint no nemeses.

### The city gate (arrival as architecture)
`BIOMES.metropolis.enclave = { gate: 'city_gate' }` — every zone edge
crossing the biome boundary erects the gate façade (the Durance fabric in
civic stone: `data/boundaryGates.ts` row — rampart walls, cobble throat,
street-lamp braziers, market dress inside). Seen from both sides: the
farmland approach reads "I have arrived at the capital."

### ASCENSION (the drop-cave inverted)
`city_stair` (a townhouse structure's stair cell) dwells UP into a
PROCEDURAL floor: `mintCave` with the **townhouse** interior tileset (rooms
recipe on worn boards — every house rolls its own floorplan), named 'the
Rooms Above', `objective:'none'`, sheltered by caveDepth derivation. Floors
lay `garret_stair` rows, so a house can climb ground → rooms → garret;
`noDeeper` at two flights strips every stair mouth from the top floor.
`caveStack` unwinds the way down; the same stair is the SAME house forever
(position-hash seed). Three lanes plant stairs: the `townhouse` structure
(city faces + high-quarter courts), the tileset's own `garret_stair` rows,
and **stairwell_hollow** — a hollows-fabric pocket INSIDE tenement wall
mass that reveals a stair (crack the block, climb what it hid: the
massif-as-enterable-building payoff).

### The reskin doctrine (proved)
`hovel` and `goblin_hut` share ONE plan const — same rows, different
legend (`#`→palisade), roof, and garrison. The goblins show NATIVE in
`goblin_warren_camp` (grove composition) with zero duplicated art.
`probe_settled` A15 pins plan identity so the blueprints can never drift.

## Perf posture
Crop crowns bake (CANOPY_STATIC); massif walls chunk-bake; the windmill's
sails are the only LIVE crown (declared, never a hazard — no track lane,
no payload). Dense city faces ride region bakes, not doodad storms. The
metropolis is frontier, so it auto-joins the perf matrix — the queued
re-optimization session gates it against the town control.

## Verification
- `balance/probe_settled.ts` — rigs A–G: registry weave, crop/paving laws,
  fields law (one OUTDOOR weave — structure interiors behind their gen-time
  doors are houses, not stranded pockets), district law (both modes,
  byte-deterministic), pasture law (prey/graze/rout), the sentry watch,
  ascension (id shape, depth, shelter, chain cap, strip law, byte-stable
  floors, the unwound ladder).
- genqa auto-covers: tileset faces (base + variants), the bare recipes,
  the metropolis enclave boundary group, townhouse at cave scale, and
  the hollows invariants for the stairwell.

## Deliberate deferrals
Player skills/supports for a 'wardsman' theme; sewers (the city's
underdark via the descend lane); market/economy events; curfew/watch
events; carriage tracks on the boulevards; full perimeter wall dress
(the gates carry the read); crow murmuration flocking (crows spawn as
plain wildlife today); livestock pens as spawner-stamped posts inside
steadings.

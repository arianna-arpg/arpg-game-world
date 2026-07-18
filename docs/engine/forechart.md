# The Forechart — the world charted ahead of the walker

Four fabrics shipped as one pass, because they are one idea: **the world
should exist before the player arrives, events should live in that world,
the world should murmur about them, and harbors should trade in the
murmurs.**

| Fabric | Module | One line |
|---|---|---|
| THE FORECHART | `world/forechart.ts` + the `World` sweep | a veiled halo of fully-minted zones kept ahead of the player |
| EVENT SEATS | `world/seats.ts` | the one data-driven picker for "where does this event land" |
| THE OMENS | `world/omens.ts` | the findability guarantee — whispers and reveals that age wider |
| THE HARBOR | `data/ports.ts` + the harbor board | ports as knowledge hubs: lanes, hearsay, charts |

Probe: `npx tsx balance/probe_forechart.ts`. Dev lens: the Events tab's
"forechart" board (veiled count, pending soundings, live omens, a sounding
button).

## The problem this kills

Events used to choose homes from a graph that only extended one ring past
the player's boots. Half the packages filtered candidates to `view.visited`
outright; the other half sized their birth ranges off the *visited* bounding
box. Either way: everything "far" was near, most events fired on ground
already cleared, and finding one meant **backtracking**, never discovery.

## The forechart

A budgeted background sweep (`World.updateForechart`, cadence + budgets in
`FORECHART_CFG`) resolves `'?'` frontiers for every eligible zone within
`ring` node-units of the player — **through the same `chartFrontier`
machinery travel uses**. Heat-map biomes, ports at the ocean's edge,
courses, enclaves, field expanses, the road weave: nothing forked. Each
sweep-minted def is stamped `ZoneDef.veiled`.

A veiled zone is a **full citizen of the graph**: events seat on it,
factions contest it, the gloaming swallows it, fronts march over it, roads
weave through it, its level comes off the same radial field. Only the
player's surfaces are blind to it.

### The veil laws

- **One fog seam**: `World.visible(z)` returns false for veiled ground —
  which already gates the map's node discs, name cards, roads, sea lanes,
  substrate washes, and the auto-fit. Roads and lanes additionally require
  **both** ends visible (a line into blank map is a coordinate spoiler).
- **The ring-1 unveil**: entering a zone lifts the veil on every direct
  neighbour — the classic one-ring map preview, byte-for-byte the old
  presentation. A per-sweep invariant pass backstops late weaves: *no
  veiled zone ever borders visited ground.*
- **Reveals**: survey pulses (the spire, harbor charts) and omen reveals
  clear the veil + stamp `surveyed` (map intel, the existing vocabulary).
  `connectFloatingZone` clears it on approach like `concealed`.
- **The door is honest**: a portal whose destination is somehow still
  veiled reads "Uncharted · Lv N" (the real level — the zone exists).
- **Persistence**: `veiled` rides the def verbatim in `WorldStateSave.zones`
  — nothing new to serialize. Backpressure keeps the whole graph clear of
  `WORLDSTATE_CFG.zoneCap` by `capHeadroom`; the veiled budget is
  `maxVeiled`. Old saves have no veiled defs and behave exactly as before.

### Soundings — the far arm

An overlay may implement `WorldOverlay.requestSoundings()` (drained by
`WorldSim.drainSoundings`, the mint-request pattern) — or any engine caller
may use `World.forechartSounding(at, radius?, dimension?)` — to grow a
small veiled cluster at a coordinate beyond the halo: a floating anchor
(disconnected until approached — the fog-of-war law) whose frontiers bud
into a local web, capped at `FORECHART_CFG.sounding.maxNodes`. Cross-ocean
seats and "ignite a genuine country away" both ride this.

## Event seats (`world/seats.ts`)

`pickSeat(view, spec, rng)` — one weighted draw over `seatCandidates`:
the `eventTargetable` floor, a distance envelope from the player's standing
zone (`range.min/max`), weights for known / unknown / veiled ground
(`knownMul` / `unknownMul` / `veiledMul`), a `prefer: 'near'|'far'` tilt,
plus the call site's own `filter` and a bespoke `weigh` escape hatch.
`SeatTuning` is the data half — one more row on any surge config.

Retrofitted this pass (each with tuned data on its def):

- **hunt** — lair seats unknown-heavy inside a findable envelope; the trail
  pin leads the player *out* instead of back.
- **haunting** — seats anywhere; an unknown seat settles **LATENT** (clock
  frozen, wheel-exempt, invisible, `activityAt` 0) and **rises the moment
  its ground becomes known** — walking in wakes the grief around you. Its
  omen is the widening voice. This is the template for
  dormancy-until-found.
- **longNight** — the coach parks in unknown country and *feeds unseen*;
  map pins are known-ground-only, unknown grounds murmur (converted
  estates louder).
- **longcandle** — tight + known-leaning *by tuning* (dawn clears claims;
  far dark ground would waste the candle) — the choice is data, not a wall.
- **verminfall** — keeps its town-hem law via `filter`/`weigh`; the
  visited gate is gone (warrens dig where nobody's been looking; the
  swelling town fauna still tells on them).
- **brigands** — the raid *descends* known-leaning; the column *musters*
  unknown-heavy and far-tilted, marching in across the map's edge.
- **crusade** — the seed seat is far-tilted + unknown-heavy with no outer
  cap; the heart plants `seedSteps` beyond it. NEW `entrench` dial: age
  buys garrison ranks at materialize (`CrusadeInfo.entrenchMul`) — power
  buys the works, age buys the yard.

Widened without seats (bbox movers now read the whole minted web instead of
the visited box): **demon_invasion**, **migration**, **wraithsail**.
**deepwinter**'s never-retroactive clearance now reads *visited ∪ surveyed*
(what the player knows), so the eye opens just past the known rim — inside
the veiled halo — and swallows real ground before anyone meets it.

Deliberately unchanged: **fractures** and the **worldboss roamer** stay
visited-scoped (a chase toy and a road-blockade are pointless unseen);
**contagion**, **mycelia**, **breach**, **amalgamation**, **conclave**,
**swarming**, **deadwake**, **incursion**, **gloaming** already targeted
uncharted ground and simply inherit the colossal pool.

## The omens (`world/omens.ts`)

The findability guarantee, as a registry (`registerOmenSource`, the
mapMarkers idiom). An `Omen` = a coordinate (+ optional seat zone), a
whisper line pool (`{bearing}`/`{dist}` expand per listener), a whisper
radius, an optional reveal radius, and `widenPerMin` — **both radii grow
with the event's own age**, so nothing waits forever in silence. The
engine pass (`World.updateOmens`, `OMEN_CFG` cadence) murmurs a bearing
when the player wanders inside the whisper (cooled per omen — it never
nags) and *surveys the seat onto the map* inside the reveal.

**The design law**: every unknown-seat event owns exactly one findability
channel — hunt: the trail pin; haunting + longNight: omens; verminfall:
town pressure; brigands/migration/wraithsail: moving pins; contagion: the
stumble-glow; deepwinter: the war-map wash; demon: the storm. **The
crusade swore silence and keeps it** (its doctrine: the map shows nothing
until walked). Whisper/reveal memory is deliberately transient — a resumed
run may murmur once more; the world repeating itself is no lie.

## The harbor (`data/ports.ts`)

Ports were a flag and a dock. Now the harbor is where the world's
knowledge pools:

- **LANES** — `World.routePortLanes` routes `searoutes` to nearby ports at
  port MINT (wet-chord tested, capped per port), so the sea network
  pre-exists the sailing of it: the forechart mints veiled harbors down
  every coast it reaches, and the lanes are waiting. Player crossings
  still append routes exactly as before.
- **THE HARBOR BOARD** — a `harbor_board` doodad a step inland of every
  dock (the dock itself still casts off directly). Dwell → the revived
  Sail panel: passage to every found port **plus any veiled harbor a lane
  already runs to** ("ships run there, friend") — sailing a lane into
  veiled country IS the discovery — chart-a-course, and **HEARSAY**: far
  omens as rumor rows.
- **CHARTS** — a hearsay row can be bought (credits, priced by distance —
  `PORT_CFG.hearsay`): the purchase runs a survey pulse around the rumored
  seat (`surveyAround` — the spire's machinery, sold at the dock). The
  walk out there is still yours. Host-authoritative via the
  `harborChart` meta intent.

## Cautions for future passes

- The sweep stamps veiled through a `mintVeil` try/finally context around
  `chartNeighborsOf` — never set it anywhere else; every other mint path
  stays visible by construction.
- Bulletins that NAME zones should gate on the player knowing them
  (visited ∪ surveyed ∪ unveiled) — the faction conquest ticker predates
  the veil and mostly names ring-1 ground; if a leak shows up in play, the
  fix belongs at the emitting source, not in the veil.
- The balance sim stays naturally quiet: the arena sits far off every
  chart, outside the halo — no sources, no sweep work. Don't "fix" that
  with a flag unless a scenario starts traveling.

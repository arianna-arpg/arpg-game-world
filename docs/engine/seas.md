# The Sea Fabric — every water known whole

`world/seas.ts` (pure) + `data/seas.ts` (every dial) + the voyage's landing
law. Probe: `npx tsx balance/probe_seas.ts`.

## The Foreordained Tenet

The fabric's law, worth naming because other systems should copy it: **the
world's texture is a pure function of the seed — computed WHOLE the moment
any part of it is touched, revealed to the player only as found.** No
persistence, no order-dependence, no drift: fill a sea from any of its cells
and the same id, name, class, and port spots come back (probe-pinned across
independent fills). Hand-tailored feel, zero hand-tailoring — "randomly
deterministic". The forechart's veil is the *revealing* half; this is the
*knowing* half.

## What a sea is

The moment generation touches any ocean water (a land frontier, a sounding,
a sail), the contiguous component fills — **4-neighbour over the continent
macro-lattice**, deliberately: the coast streamer seals diagonal gaps and a
BRIDGE blocks the boat, so this is *sailing-true* adjacency (corner-touching
waters are two seas; waters under a bridge are two seas). The ocean fraction
sits well under the 4-neighbour percolation threshold, so components are
finite and small (probe: 91 seas over 5 seeds, max 12 cells; `fillCap` is a
theoretical backstop).

Each sea gets, from the `SEA_CLASSES` ascending ladder (all data):
- a **class** — pond → lagoon → sea → great sea → ocean (size bands, port
  budgets, haven rights, island multipliers, name pools per row);
- a **name** — "the Mourning Sea", seeded off its canonical cell;
- **port spots** — nearshore water sampled around the whole coastline, then
  greedy max-min selection (even, deliberate spacing ≥ `portMinSep`; honest
  under-budget on tiny coasts), each snapped to a land anchor. Spot 0 is
  **the HAVEN** where the class rates one; the rest are coves.

## The port system made real

`World.ensureSeaPorts(sea)` — idempotent, invoked by any first touch (a land
frontier reaching the water, a quay sighted from the boat, a chart) — mints
every spot as a **veiled**, roadless-charted port zone (`noBackEdge`: the
land web weaves in as it grows), bakes `seaId`/`portTier`, names the haven
("… Haven"), and rings **the lane law** (`SEA_CFG.lanes`): the coastal ring
in angular order + spokes from every cove to the haven. Islands lane to the
haven on sighting. The old nearest-neighbour lane router and its wet-chord
heuristics are gone — lanes are the sea's own, exact by construction.

A land frontier that touches water now resolves to the system's **nearest
harbor** (the road bends along the coast to where the quay was always going
to stand) instead of minting one wherever the walker hit brine.

## The landing law

Free docking is dead — with it, the infinite-shore-zone mint. While sailing:

- **Quay beacons** stream for every port spot in spyglass reach (the isles'
  own mint-on-sight law: sighting a harbor from the water makes it real and
  KNOWN — veil lifted, surveyed onto the map). Haven beacons burn warm.
- A landing dwell engages only within `landingSlack` of a **spot**, an
  **island's** tagged shore, or a **grandfathered** standing port zone
  (legacy saves, quest ports). Everywhere else: *"breakers — no landing
  along this shore; make for a lit harborage"* (cooldown-hushed).
- `chartCourse` sails blind for **this sea's farthest harbor** — the classic
  crossing, landing at a quay that was always going to be there.

## Ports themselves

`ZoneDef.seaId` + `ZoneDef.portTier` ride the def. Havens dress their quay
at load (lantern posts flanking the dock, seeded cargo stacks along the quay
line) and read as hubs (the lane spokes). The zone pane's chip names the
water ("⚓ haven — the Mourning Sea"); the Sail panel titles itself with it
and groups harbors **by sea**, this water first — veiled harbors a lane
already runs to included ("ships run there, friend": sailing a lane into
the veil IS the discovery).

**The first port** is a beat: finding your first harbor names the sea aloud
and stamps `first_port_found`; each newly-met water bumps `seas_found`
(session-counted — unlock fodder for shipwright/voyager metas).

## Islands

Unchanged in mechanism, richer in rate: `ISLAND_FIELD.chance` raised to
0.42 and scaled by the hosting sea's `islandMul` (bigger waters, thicker
archipelagos) — the existence roll re-derived exactly in the probe. Islands
bake their `seaId` and lane to the haven when sighted.

## Cautions

- `clearSeaMemo()` between fills when testing entry-invariance — the memo
  makes all members share one object in normal play (that's the point).
- The capped-fill case (astronomically rare) plans ports on the filled
  reach and may vary by entry side — documented, accepted.
- Anything wanting "the whole X known at first touch" should copy this
  shape: pure component derivation + memo + veiled mint-on-touch — never a
  persisted registry.

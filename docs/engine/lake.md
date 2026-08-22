# THE LAKE — a zone type (the Scald Basin's sulphur heart)

**Status: M2a (built 2026-08-21 on the M1 country).** Design authority:
`docs/design/scald-basin.md` (charter v6) — §3 THE BROIL LAW, §6 THE SULPHUR
POOLS + THE LAKE (card 1 ratified), §12/§13 M2. Recipe leaf
`src/engine/lake.ts` (registered as **`lakeshore`** — see the id note);
drawn half `src/render/vis/lakeLayer.ts` (+ `drawRoil` in
`render/vis/geyserLayer.ts`); the two sulphur waters in `src/data/scald.ts`;
the generic waters in `src/world/regions.ts` + `src/engine/genkit.ts`; the
face pin in `src/data/tilesets.ts` (`sulphur_pools`); the authoring seam
`GenCtx.authoredVents` → `World.bootGeysers`; probe `balance/probe_lake.ts`.
Every number is a **DIAL** (unblessed — she blesses via playthroughs).

## The thesis

The river type established that a feature which outranks the zone hands it
mint hints and the zone CONFORMS; the mere (`data/merelake.ts`,
`engine/tiers.ts carveUnderGrotto`) established a water body as a region
family, CLASSIFIED before paint, ALL-OR-NOTHING. THE LAKE marries the two
at surface scale: one very large, centrally-focused water stamp — a
wobble-rimmed blob (the mere's rim law: never a circle, never a ruler) —
sized so the LAND is an annulus. The zone's walkable body is **THE RING**;
exits, portal clears and reachability all live on it. You can get WET and
get PARTWAY; the middle you cannot have.

**The id is `lakeshore`**, not `lake`: THE UNIQUE-ID LAW (`data/validate.ts`
— generation ids are unique ACROSS the six registries; a shared id's twin is
silently unreachable) already gives `lake` to the FURNITURE landmark (the
lakelands' pond). The zone type is still "THE LAKE" everywhere it is spoken.

## THE CONFORM LAW (the carve, `lakeLayout`)

1. **Rolls first** (the draw-order contract): the ring width jitter, the
   rim + deep wobble seeds, the deep fraction, then the isles — every mint
   draws the same shape of stream.
2. **The rim law**: `rimAt(θ) = boundaryDist(θ) − ringW·(1 + wobble(θ))`,
   where `boundaryDist` is the arena's own silhouette at that bearing (the
   inscribed ellipse blended with the rect by `rectness`; an ellipse arena is
   its own silhouette) — a wide zone is a wide lake, corners soften into land
   bays, and the ring stays a playable corridor
   (`LAKE_CFG.ring`: frac of the short axis, clamped `min..max`).
   `deepAt(θ) = min(rim − shelfMin, rim·deepFrac·(1 + wobble₂(θ)))` keeps
   the shelf a promise, never a sliver.
3. **CLASSIFY, no paint**: every walk cell → `LAKE_CELL` land / shore /
   shelf / deep (then isle / spit). THE PORTAL LAW: land within
   `portalClear` of every exit, or the lake SHRINKS (the ring grows) — past
   `shrinkTries`, or below `minRimR`, the plan **refuses loudly** and the
   zone stays BYTE-FLAT (every cell ground, the kit still scattered — the
   mere's law: no orphan half-lake).
4. **Isles** in the shelf band (`isles` — the riverland key; each a disc ∩
   the shelf, so the deep's refusal stays whole by construction), spaced,
   some tied to shore by a SPIT; each joins `ctx.pois` (perch/loot pockets)
   — except THE METRONOME ISLE (below), which is a seat, not a free POI.
5. **PAINT the classification's own cells** (drawn == classified — probe
   B3 holds every cell against the plan): the deep liquid, the shelf liquid
   (a doodad-poured shelf also tells the grid it is `water`), isles/spits
   as `ground`, the pour's doodads spliced from under isles.
6. **THE SHORE LANDING**: a no-back-portal arrival lands a zone at its arena
   CENTER (`World.loadZone`'s default entry) — on the lake, the deep. The
   recipe moves such an entry to the nearest shore, so the reachability
   invariant's root, `zoneEntry` and the party's landing all agree on dry
   ground; a portal entry is already on the ring and never moves.
7. **Reservations** tile the water (+ the metronome isle) so every roll that
   runs after the recipe — landmarks (the biome's furniture `lake`/`sinkhole`
   rolls), structures, composition posts — routes around the lake.
8. **The waterline dress** (`lakeShore` rows on the shore band, `lakeTerraces`
   clusters at shore sites via `ctx.siteAt`), then the tileset's own scatter
   on the ring, then PURGE THE DROWNED (the harborcove idiom — scatter's
   `forbidOn` speaks doodad grounds, not grid regions).

The plan is kept in `LAKE_PLANS` (by zone id, the last few) for probes and
dev — a witness, never engine truth.

## THE TRAVERSABILITY RING + THE DEEP-MIDDLE REFUSAL

- **The shelf** (`lakeLiquid`): the wadeable band (the liquid's region row
  — `standStatus: 'wading'`). The sulphur debut pours `sulphur` →
  **`sulphur_shelf`**: the `sulphur_pool` row's MILDER cousin — wading, the
  SAME `sulphur_sting` at a lighter amount, a lighter fire DoT through
  resistance only, the scorch bar FED while a seat wades (the fill route),
  a priced `pathCost`, **no douse** (the brine-sink law: no basin water is
  refuge). Caustic yellow-green, blot-baked at the shoreline.
- **`deepPolicy`** per lake row (card 1 ratified):
  - **`'block'`** (the debut) → `deepLiquid` (default the pinned generic
    `lake_deep`; the debut names **`sulphur_deep`**): NOT walkable, NOT
    blocking — **shots and sight sail across** (no `blocksShot`/`blocksSight`
    — an occlusion-free firing lane across water no body can cross is the
    lake's tactical signature), an **`eject`** boundary policy (a step in is
    shoved back out, scalded: "too deep"). **Why `eject` and never `fall`**:
    fall-family policies are OVERRIDDEN under ground into the pit fabric's
    descend (`World.pitPolicyFor` — a cave's chasm is a door to the next
    stratum); a lake must keep its meaning everywhere, so an authored eject
    is the only sane refusal. Jump/blink displacement crosses it like a
    chasm (`crossableBy`).
  - **`'swim'`** → `deep_water` by standing law (breath-priced swimming; a
    future cold lake flips the dial). A row whose named `deepLiquid`
    contradicts its policy warns and falls back — the refusal is never
    quietly dropped.
- **THE BROIL LAW's permanent face**: `sulphur_deep` wears
  `visual.animate: 'broil'` — data on the row, never an id compare. The
  renderer's animated-region pass (`drawAnimatedRegions`) simmers the wash
  and calls `drawLakeBroil` (`render/vis/lakeLayer.ts`), which seats the
  geyser fabric's OWN roil (`drawRoil`, extracted from the vent's broil
  branch — ONE drawn word, never a second roil) on a hash-jittered lattice
  of INTERIOR broil cells read off the SAME `regionAt` movement refuses
  (`broilSeatsIn` — pure; probe C/D hold every seat against the grid). The
  simmer breathes inside `LAKE_BROIL_CFG.simmer` — never the vent's full
  broil (that face means "imminent now"). No floaters, no labels: the middle
  reads as refused because it visibly BOILS.
- **The generic twins** (`lake_shallows` / `lake_deep`, the recipe's pinned
  defaults for a param-less lake — genqa's bare case): the water row's own
  grammar (wading + douse) and a cold refused deep that DRIFTS (no broil —
  the broil is the sulphur word).

## THE METRONOME (the geyser fabric's authoring seam)

`lakeVent: 'great'` seats ONE landmark-grade vent on its own isle just past
the deep's rim — offshore — through **`GenCtx.authoredVents`**
(`GeyserSpec` rows, the `ctx.tracks` idiom) → `GeneratedLayout.authoredVents`
→ `World.bootGeysers(def, pois, authored)`: authored rows seat FIRST; a row
with its own clock or any unshared row is an ANCHOR (its own private band —
the metronome law); a `shared` row without a clock seats on the current-band
partition like a count-rolled vent. The seat is the recipe's promise — it
must still be clear (walkable, no solid on the mouth, spaced) or the row is
dropped loudly; the isle is reserved so nothing scatters onto it. The face's
own count-rolled vents seat around the isle POIs and in the shallows (the
fixture kind's own placement law allows wading ground).

## THE GREAT SHOAL (the under-tier seat — the cistern)

`LAKE_CFG.shoal`: when a lane is dialed under the lake
(`layoutParams.underTier` — the sulphur_pools face dials `'cistern'`,
`data/cistern.ts`), the recipe mints ONE broad isle FIRST at the bearing whose
shelf band is WIDEST (sampled across the disc's own angular span so the
wobbling rim and deep never clip it), away from the arrival (`entryClear`),
its radius the band's fit capped at `r[1]` — under `r[0]` no shoal stands and
the dial honestly does nothing. One roll, lane-gated: lane-less lakes stay
byte-identical. The shoal is RESERVED whole (no scatter, no landmark roll) and
stays a perch POI; it is HELD OUT to the under-tier tail as
**`GenCtx.underSeats`** (THE OFFERED SEATS), where a grotto lane with
`seat: 'offered'` sinks its chamber wholly beneath it (`engine/tiers.ts`) —
the well on the shoal, the lake keeping its water. `LakePlan.isles[].shoal` +
`LakePlan.shoalAt` witness it; docs `docs/engine/cistern.md`; probe
`balance/probe_cistern.ts` (and probe_lake B3's dated amendment: tier rows
accepted over isle/spit class only).

## How it joins (and the boundary laws)

IN-COUNTRY ONLY: the `sulphur_pools` heart face pins `forceLayout:
'lakeshore'` (the karst faces' precedent; the biome's `allowedLayouts` roll
is outranked — a river COURSE crossing the heart still outranks the face,
standing law) with `layoutParams { lakeLiquid: 'sulphur', deepPolicy:
'block', deepLiquid: 'sulphur_deep', isles, lakeVent: 'great', lakeShore,
lakeTerraces }` and runs LARGE (`sizeW [3600,4600] × sizeH [2600,3400]` —
geography, not a pond in a field). The orphan census sees the liquids through
the face's params and the recipe's own pins. Absent == identical: no other
face or biome names the recipe (probe A10); the geyser_fields face mints no
lake (probe D7).

- The lake is IN-ZONE terrain, never a sea-fabric citizen (`world/seas.ts`
  classes macro-lattice ocean components — no ports, no sea ladder).
- The `lakelands` recipe and the volcanic `flooded_caldera` landmark STAND —
  lakes as FURNITURE; this is the lake AS THE ZONE.
- The mere stands untouched (its span-held ephemerality is an optional
  future lake dial, not the debut's).
- The generic river-basin-terminal join (`world/relief.ts`' own "lake law"
  comment) stays charted, not built.

## Verification

`balance/probe_lake.ts` (roster: green/fast) — A the registry + the rows +
the pin + absent == identical; B the carve on the face (one-component deep,
classify-before-paint, the ring + isles reachable, determinism, the authored
vent offshore, the dress on land), the bare/swim/lying-row/too-small/
shore-landing/ellipse cases; C drawn == tested broil seats + the one-roil
source wiring; D the real mint path (the recipe pinned, the metronome's
private band, the hero refused + scalded, a shot across the middle, the
shelf wading, the sibling face lake-free). Gates: `npm run check`, `npm run
probe`, `npm run genqa` (the recipe + the face's variants auto-join), `npm
run sim -- run --suite smoke` + `baseline check`, `npm run perf`.

## Her walk (owed)

Launch row `arpg-dev-qa66` (port 5164) → `?dev` → start a run → the dev
panel's mint lane (or `__game.world().devMintTileset('sulphur_pools')` from
the console) → walk the ring, wade the shelf, watch the middle boil, find the
metronome's isle. Notes from the build's own look: the deep's rim draws
CELL-STEPPED (the region edge bakes per cell; the blot bake is walkable-only
— a soft rim for non-walkable water is a polish dial, not a law); the dev
mint's landing (`landPartyAt` at the arena center) snaps the party onto the
shelf's inner edge — the dev/perf lane's own law; a real arrival lands on the
ring (portal) or the nearest shore (THE SHORE LANDING). Every number below is
hers.

## Dials (all unblessed)

`LAKE_CFG` (ring frac/min/max/jitter/wobble, rectness, minRimR, deep
frac/wobble/shelfMin, shoreW, portalClear, shrinkTries, isles, the
metronome isle, the reservation lattice); `LAKE_BROIL_CFG` (seat lattice,
radius band, the simmer band, the cycle); the `sulphur_shelf` row (dps
2.5 + 0.45/level, sting 0.8 + 0.4/level, pathCost 4, scorch feed 0.35/s);
the `sulphur_deep` eject (10% max life, fire); the generic rows; the face's
size band + layoutParams; the palette (shelf `#8fb04a`, deep `#2f8f9c`, the
prism-crust rim `#e8e0a0`).

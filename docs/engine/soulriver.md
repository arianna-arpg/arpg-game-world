# The Rivers of Souls (`world/soulriver.ts` + the `soulriver` recipe)

The underworld's INLAND SEA — **the inversion**: the zone's ground IS the
water. A colossal mint-once megazone (per instance) whose whole arena is
SOUL-WATER (a grid region), and land exists only as the exception — a pier
islet at every ferry station, one thin causeway stub from each portal to its
islet (the only walked paths in the zone), and scattered strand-islets
adrift in the expanse. THE SOUL-SHIP — the Pale Ferry grown to a
traversible near-landmass (420×192 of boards, a whole fighting ground) — is
the honest way across: the water itself drains THE SOUL TETHER, so you
ride, fight on the deck, and go ashore where the ferryman pauses. You are
using the environment, and entirely at his whim. **The ride is the
content** — the shore doors are deliberately few.

## The Untethering (there can be many rivers)

The souls are bound to no gate, so the river answers to none. The soulway
is a **STREWN course** (`world/courses.ts` — `anchor: 'strewn'` +
`CourseSpec.strew`): instances dealt across the whole underworld chart on a
jittered lattice, pure f(seed) — each present cell births one river with
its OWN derived seed (heading, meander, wobble all its own). One may wind
past the Hellgate; most will not. The river is connective tissue the way
the surface's Fields are — met, not granted, and never a centralized hub.
Every instance wears the one name: it is ONE river, encountered again.

`chartFrontier` funnels any frontier landing in an instance's corridor to
THAT instance's mint-once megazone (`soul_river_<cellKey>` — the
field-region law over an AREA, dealt plural; later finds `linkBackTo`).
`feather 0` is load-bearing, and so is **THE ONE SEED EXPRESSION**
(`soulwaySeed` = the dimension biome sampler's own `fieldSeed ^ 0xd1a0`
fold): everywhere the map paints a ribbon is exactly a corridor the funnel
catches — PAINT == FUNNEL, probe-pinned end to end against the real
sampler. (The pass-two code drew the ribbon from one seed and caught the
corridor with another; the untethering closed that desync structurally.)

## The Foreordained Tenet

Everything is a pure function of the seed, computed whole at first touch,
revealed as found, never persisted:

- **Instances** — `soulwayInstancesNear` / `soulwayCatchAt(coord, fieldSeed)`
  (the strewn law); `soulriverInstanceOf(zoneId, fieldSeed)` re-derives the
  whole instance from the stable zone id (never a lookup).
- **The seat** — `riverSeatOf(inst)`: the instance's course midpoint (the
  sea's heart is the zone's map node).
- **The plan** — `soulriverPlan(seed, w, h, biomes)`: the ship's serpentine
  route, the pier ISLETS (headwater west, one per meander apex alternating
  south/north, terminus east — each with its outcrop, pier line, and
  APRON), **THE LANDING DEAL** (`plan.landings` — only a dealt, greedy
  max-min-spread few stations carry an exit + a country;
  `SOULRIVER_CFG.plan.landings` is the band), and the STRAND-ISLETS
  (refusal-sampled clear of the sailing lane and every dock). The mint
  hook, the recipe, and the probes all call the same function; nothing is
  stored, so nothing can disagree.
- **The ports** — `soulriverPorts` (the `ensureSeaPorts` idiom on a
  course): each LANDING's destination mints as a real zone at its own
  course fraction along the ribbon (`dockDestCoordsFor` — true world-map
  geography mirroring pier geography, alternating banks), VEILED until
  found, wearing its promised country's tileset; the river's exits become
  REAL edges to them, and `searoutes` chain the ports so the map draws the
  dashed lane down the ribbon. **Wild strands mint nothing** — the ferry
  calls, the islet stands, the shore leads nowhere: you ride deeper
  instead. Riding past a LANDING with a living passenger UNVEILS its
  destination (the call at the pier — the landing-law reveal).

## THE DECK LAW (`TrackRiderDef.carry`) + THE BOARDS SHIELD

The Soul-Ship is a CARRIER rider on the track fabric: a rect surface that
is moving FOOTING. `World.updateCarriers` (just before the latch/grab seat
slaves) moves every grounded body standing on the boards by the rider's
rigid step — `pose(t) ∘ pose(t−dt)⁻¹`, so a turning deck swings its
passengers with the bow, corner seats included (probe-pinned at a 150,−70
deck-local seat through a full bend) — landing through the swept
`clampPos`. Spares: dead, `flying`/`leap`, and `clingTo`/`heldBy` bodies
(their seats run after and win the frame). Carry riders get their own
honest lint band (reach ≤ 340; hazard bodies stay ≤ 220), and the rect
agreement contract speaks a second dialect (`deckHw`/`deckHh`).

**THE BOARDS SHIELD**: any body whose feet are on a carrier deck (paused or
sailing) is stamped `Actor.deckUntil`, and the terrain sweep treats it as
INSURED against the ground beneath — no wading slow on the ferry, no soul
drain through the hull, no douse — while the survival REGEN tail still
runs, so the tether breathes back as you ride.

**THE BOARDWALK (the bridge law)**: the shield's STATIC sibling. Every pier
run + its waiting APRON pours as `boardwalk` grid cells (a walkable,
statusless, drainless region row — `world/regions.ts`) OVER the water, so
the cell IS boards: waiting for the ship never wades, never drains, never
douses — no clocks, no stamps, just the pour. The plan's `apron` point
(gangway short of the hull: `deckHh + plankGap` off the pause point) is the
strip's far end, so pour, planks, probe and ferry agree by construction.
`SOULRIVER_CFG.plan.pierW/apronR` are the dials.

**THE COIN AT THE CRADLE** (`TrackSpec.reversal` — see
`docs/engine/tracks.md`): each journey DEALS ITS DIRECTION (ferry dial
`SOULRIVER_CFG.ferry.reversal`, 0.5) — the ship sails terminus → headwater
as often as the reverse, so every shore is eventually served within one
run, upstream landings included. Pauses re-key to the same physical piers;
the end holds are symmetric (`boardSec` both ends) so boarding reads the
same both ways; `trackArcFrac` stays journey-relative, so the `fadeTail`
fray and THE HUNGER's escalation follow the journey, not the compass. The
lane is `once`+`rearm` (the journey cycle), and the cradle rest parks the
dissolved hull at the NEXT journey's spring — an honest tell of where the
crossing will begin. Two ships ride a phase apart, each dealing its own
coin.

## The water: hazard, current, look

- **`soul_water`** (region row): walkable true water — wade, swim, douse,
  mirror — that **drains THE SOUL TETHER**: `survival: {resource:'soul',
  drain:1}` against `SURVIVAL_RESOURCES.soul` (the light-bar fabric
  repurposed — max 10, regen 2.5 ashore/aboard/on the boards, and an
  underflow ramp crueler than drowning: 6%→30% max life/sec over 8s as the
  river draws the soul out). Player seats only, like every survival meter;
  the HUD draws the bar for free (it loops the table).
- **`soul_current`** (creep): the vessel bore with `flow.channel:
  ['soul_water']` — steering, confinement and snap-in read
  `groundKindAt ∈ channel`, so the surges ROAM the whole sea, part around
  the islets AND the boardwalk piers, drag the living downstream, and
  carry crest-surfing shades. Legacy fronts are byte-identical
  (probe_front's fingerprint pins it).
- **The LIVING look** — `RegionVisualSpec.animate: 'souls'`: the region's
  fill breathes in slow broad swathes, and a dedicated under-surface
  overlay drifts pale FIGURES through the water — a face surfacing toward
  the light, a reaching hand, a soul-streak riding the current — seeded on
  a world-anchored lattice (stateless, view-culled). The pale-silt floor
  bake beneath IS the land read: the islets are simply where the water
  isn't.

## THE HUNGER + the Riverbound

While any living player rides mid-journey, souls conjure from the water
around the boards — pre-roused, capped live (the cap breathes with
`trackArcFrac` toward ×2 as the JOURNEY deepens, whichever way it runs),
heavier company past midway (haulers, then banshees), a lull at every pier.
The deck is the arena: a melee line flanks around freight and masts on
420×192 of boards. Faction `riverbound` (obolEyes + soulGauze — the
coin-eyed, gauze-hung family grammar): `lorn_shade`, `drowned_hauler`
(gaff-drags passengers off the boards), `soul_wellspring` (colony anchor +
`vent_souls`), `soul_mote` (lite), `farshore_warden`; graveyard guests fill
the water between.

## The sea on the chart (the voyage read)

The hell tab treats a charted river exactly the way the surface treats its
seas: the RIBBON is the biome wash (each instance paints its own), the
landing ports chain a dashed `searoutes` lane down it, the node wears the
**`soulriver` zone KIND** (`data/zoneKinds.ts` — pale ring, ship glyph,
'Inland Sea' card that KEEPS the monster level, and `lanes` so every road
touching the river draws in the naval dashed stroke — water crossings, not
land roads), and **the live SOUL-SHIPS ride the ribbon**:
`World.soulriverShipCoords()` projects each abroad ferry's pure track pose
onto the course (`channelFracOf` → `ribbonCoordAt` — the same clock the
loaded zone rides, so chart and deck agree by construction), and a
mapMarkers source draws them ⛴ (the voyage-boat idiom; a cradled,
dissolved ship is honestly absent). Gating lives in the source: only
CHARTED rivers show their ferries.

## Dials

`SOULRIVER_CFG` (plan / landings / pier boards / ferry incl. the coin /
assault / ports) in `world/soulriver.ts`; `SOULWAY_COURSE` + its
`strew: {span, chance}` deal in `world/dimensions.ts`; the tileset
(`river_of_souls`, biome `soulway`, `frontier:false`, `realm:'underworld'`,
`perfProbe`) owns theme, packs, fog, current lanes and lite pours — its
stamp rows are EMPTY on purpose (the scatter's ground gates speak doodad
grounds, not grid regions, so all land dress is recipe-placed on the plan's
own masks). The Stygian Verdigris variant turns the palette green.

## Probes

`balance/probe_soulriver.ts` (70 checks): plan purity + station laws + the
deal + THE LANDING DEAL (band, strict subset, max-min spread, distinct
countries) + THE APRON LAW + THE ISLET LAWS, THE STREWN DEAL (pure,
seeded, roundtrip ids) + **PAINT == FUNNEL against the real dimension
sampler**, port coords spread along the instance's own ribbon, lane laws +
THE COIN (both directions dealt, reversed journeys spring at the terminus,
call at every pier, journey-relative arc-frac, byte-pure across placements,
legacy lanes never flip), THE DECK LAW live, THE BOARDS SHIELD + THE SOUL
TETHER + THE BOARDWALK live (the bridge law: a poured pier refills the
tether mid-water), byte-determinism of carried positions, the ports mint
(landings only, wild strands mint NOTHING, veiled + spread + real edges +
the searoute chain + idempotence), the chart's ship projection (markers sit
ON the ribbon), and the channel window. `probe_front`'s fingerprint pins
legacy creep; `probe_tracks` pins the track fabric around the coin; genqa
sweeps both faces of the sea.

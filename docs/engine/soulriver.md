# The River of Souls (`world/soulriver.ts` + the `soulriver` recipe)

The underworld's INLAND SEA — **the inversion**: the zone's ground IS the
water. One colossal mint-once megazone (`soul_river`, the `uw_gate`
stable-id idiom) whose whole arena is SOUL-WATER (a grid region), and land
exists only as the exception — a dock islet at every ferry station, one thin
causeway stub from each portal to its dock (the only walked paths in the
zone), and scattered strand-islets adrift in the expanse. THE SOUL-SHIP —
the Pale Ferry grown to a traversible near-landmass (420×192 of boards, a
whole fighting ground) — is the honest way across: the water itself drains
THE SOUL TETHER, so you ride, fight on the deck, and go ashore where the
ferryman pauses. You are using the environment, and entirely at his whim.

## The Foreordained Tenet

Everything is a pure function of the seed, computed whole at first touch,
revealed as found, never persisted:

- **The soulway** — `SOULWAY_COURSE` (declared in `world/dimensions.ts`,
  beside its sibling the River of Flame; both spring at the Hellgate): a
  REAL course on the underworld's chart, so the map wash ribbons an inland
  SEA across the hell tab for free. `feather 0` on purpose: everywhere the
  course paints is exactly the corridor `chartFrontier` funnels — any
  frontier landing on the ribbon finds the same river (the field-region
  mint-once law over an AREA), so no ordinary soulway zone can ever mint.
  The biome is a PLACE; one zone wears it.
- **The seat** — `riverSeat(gate, fieldSeed)`: the course midpoint (the
  sea's heart is the zone's map node).
- **The plan** — `soulriverPlan(seed, w, h, biomes)`: the ship's serpentine
  route, the dock ISLETS (headwater west, one per meander apex alternating
  south/north, terminus east — each with its outcrop, pier line, exit
  side/`at`, and dealt COUNTRY), and the STRAND-ISLETS (refusal-sampled
  clear of the sailing lane and every dock — nothing moors in the ship's
  way). The mint hook, the recipe, and the probes all call the same
  function; nothing is stored, so nothing can disagree.
- **The ports** — `soulriverPorts` (the `ensureSeaPorts` idiom on a
  course): every dock's DESTINATION mints as a real zone at a spread
  coordinate along the ribbon (`dockDestCoords` — true world-map
  geography, not ring-one neighbors), VEILED until found, wearing its
  promised country's tileset; the river's exits become REAL edges to them,
  and `searoutes` chain the ports so the map draws the dashed lane down
  the ribbon. Riding past a pier with a living passenger UNVEILS that
  dock's destination (the call at the pier — the landing-law reveal).

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
runs, so the tether breathes back as you ride. The lane is `once`+`rearm`
(the journey cycle: boarding hold, a pause at every pier, the alighting
hold, dissolution at the strand, the cradle rest, reborn on the pure
clock); `fadeTail` frays the drawn hull over the last arc-reach and the
rest-edge burst fires where it dissolves. Two ships ride a phase apart.

## The water: hazard, current, look

- **`soul_water`** (region row): walkable true water — wade, swim, douse,
  mirror — that **drains THE SOUL TETHER**: `survival: {resource:'soul',
  drain:1}` against the new `SURVIVAL_RESOURCES.soul` row (the light-bar
  fabric repurposed — max 10, regen 2.5 ashore/aboard, and an underflow
  ramp crueler than drowning: 6%→30% max life/sec over 8s as the river
  draws the soul out). Player seats only, like every survival meter; the
  HUD draws the bar for free (it loops the table).
- **`soul_current`** (creep): the vessel bore with `flow.channel:
  ['soul_water']` — steering, confinement and snap-in read
  `groundKindAt ∈ channel`, and the world's terrain window now folds GRID
  regions into `groundKindAt` (doodad grounds first; bare cells still
  null), so the surges ROAM the whole sea, part around the islets, drag
  the living downstream, and carry crest-surfing shades. Legacy fronts are
  byte-identical (probe_front's fingerprint pins it).
- **The LIVING look** — `RegionVisualSpec.animate: 'souls'`: the region's
  fill breathes in slow broad swathes (the per-cell animated pass), and a
  dedicated under-surface overlay drifts pale FIGURES through the water —
  a face surfacing toward the light, a reaching hand, a soul-streak riding
  the current — seeded on a world-anchored lattice (stateless, view-culled,
  a handful of path draws per frame). Alive, on the very precipice of
  death. The pale-silt floor bake beneath IS the land read: the islets are
  simply where the water isn't.

## THE HUNGER + the Riverbound

While any living player rides mid-journey, souls conjure from the water
around the boards — pre-roused, capped live (the cap breathes with
`trackArcFrac` toward ×2 at the terminus), heavier company past midway
(haulers, then banshees), a lull at every pier. The deck is the arena: a
melee line flanks around freight and masts on 420×192 of boards. Faction
`riverbound` (obolEyes + soulGauze — the coin-eyed, gauze-hung family
grammar): `lorn_shade`, `drowned_hauler` (gaff-drags passengers off the
boards), `soul_wellspring` (colony anchor + `vent_souls`), `soul_mote`
(lite), `farshore_warden`; graveyard guests fill the water between.

## Dials

`SOULRIVER_CFG` (plan / ferry / assault / ports) in `world/soulriver.ts`;
`SOULWAY_COURSE` in `world/dimensions.ts`; the tileset
(`river_of_souls`, biome `soulway`, `frontier:false`, `realm:'underworld'`,
`perfProbe`) owns theme, packs, fog, current lanes and lite pours — its
stamp rows are EMPTY on purpose (the scatter's ground gates speak doodad
grounds, not grid regions, so all land dress is recipe-placed on the plan's
own masks). The Stygian Verdigris variant turns the palette green.

## Probes

`balance/probe_soulriver.ts` (54 checks): plan purity + station laws + the
deal + THE ISLET LAWS (clear of the sailing lane), the course seat +
corridor funnel + spread port coordinates, lane schedule + the rearm cycle
+ arc-frac, THE DECK LAW live (a corner seat rigid through bends on the
near-landmass deck), THE BOARDS SHIELD + THE SOUL TETHER live (grid water
drains; the deck suspends; ashore refills), byte-determinism of carried
positions, the ports mint (veiled + spread + real edges + the searoute
chain + idempotence), and the channel window (turns with the water across
open banks; confined undertow; the riverbound waived). `probe_front`'s
fingerprint pins legacy creep; genqa sweeps both faces of the sea.

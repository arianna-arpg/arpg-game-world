# The Trapworks Fabric — triggers wired to the world's own hazards

`src/engine/trapworks.ts` (pure leaf: types, config, trigger geometry, the
open effect registry) + the World engine half (sweep, spring, host facade,
wire) + `src/data/trapworks.ts` (the kit: riders + tells) +
`render/vis/trapLayer.ts` (hidden-trigger close-up resolve) + the
interiorGen trap pass (`layInteriorTrapworks` — generation-meshed authoring).
Probe: `npx tsx balance/probe_trapworks.ts`.

A **trapwork** is a TRIGGER (pressure plate, tripline) wired to EFFECT rows.
The fabric owns **no hazard of its own** — every effect drives an existing
fabric through the narrow `TrapHost` (the PuzzleHost law: handlers never
import World; a stub host probes them all):

| effect | what it drives |
| --- | --- |
| `lanes` | `setTracksArmed` — tagged track lanes appear/disappear (the plate that reveals the wall of saws) |
| `boulder` | `tracksEnsure` — a ONCE-lane from cradle to wall, `ownerId` = the presser (crush credit), `bornAt` = the rumble |
| `volley` | `tracksEnsure` — a fan of dart once-lanes, births staggered so the RAKE telegraph lights the rays before the bolts fly |
| `collapse` | fall-able `ruin_floor_gap` doodads after a crumble telegraph — the pitfall fabric owns everything after |

`registerTrapEffect(kind, { spring, mirror? })` is **open** — a package adds
an effect kind with zero engine edits.

## Authoring — three surfaces, one runtime (the track fabric's shape)

1. **Generation** — the interiorGen trap pass reads
   `layoutParams.trapworks` (`TrapGenSpec` dials: `sawHalls`, `mincerRooms`,
   `bladeLattice`, `dartWards`, `boulderRuns`, `falseFloors`, `wireWards`,
   `dartLanes`, each `{ chance, max }` plus its own character dials) and
   lays mechanisms WITH the geometry in hand: saw lanes down measured
   corridor stretches (groove carved, clearway-protected), rotor mincers in
   real chambers (hub sized to the room), plates at real coordinates, maws
   on real walls, runways pre-grooved, wires strung wall to wall. Portal/door
   clearances enforced;
   every rng draw rides the layout stream (genqa determinism pins the pass).
   Surfaced on `GeneratedLayout.trapworks` → placed by loadZone.
   **Two invocation homes, one pass.** The interior generators
   (dungeon/edifice/labyrinth) run it in-recipe, before their scatter. The
   **surface `rooms` recipe** records its room/corridor truth as
   `ctx.trapGeo` (rects + graph + grid + corridor half-width — pure
   bookkeeping, zero draws) and generateLayout's finished-grid tail feeds
   it to the same pass through the `registerTrapPass` seam (interiorGen
   registers at module eval; a registration, not an import, so the module
   graph stays acyclic). The tail runs beside the boulder chutes: a plan
   structure carved after the layout already shows in the walkable truth a
   stretch validates against, and grooves still precede the clearway
   sweep. Any rooms tileset can author the dials — the mountain pass's
   sprung `boulderRuns` is the surface debut — and a rooms-rolled CAVE
   under such a tileset inherits them via mintCave's layoutParams merge
   (deliberate: mountain caves spring stones too). Dial-less zones draw
   nothing (byte-identical; probe-pinned in `probe_trapworks` §10).
2. **`ZoneTheme.trapworks`** — fixed rows for authored layouts.
3. **`World.trapworksEnsure(specs)`** — the runtime seam.

## The trigger law

`trapTriggerHit` is pure: plates press by **feet, not shoulders** (a body's
radius counts only `TRAPWORK_CFG.pressPad` of itself — rim brushes never
press); triplines are crossed capsules — the generated wires run `w: 14`, so
a wire's capsule is the plate's own thickness and neither is easier to blunder
across between sweep beats than the other (the sweep samples POSITIONS every
`TRAPWORK_CFG.sweepEvery`; nothing here is swept). Filters reuse the payload
grammar:
`who` ('any' default — packs blunder onto plates, and **baiting them across
is the intended play**), `factions`/`notFactions`, `sparesAirborne` (leap
the plate!), `sparesDormant`. Springs latch `sprung`; `rearm` seconds
re-arm (absent = single-use for the visit — **sprung state is transient**:
re-entry re-generates and the crypt resets its teeth, the collapse
transience doctrine).

## Doctrine — the dead build no allegiance

Unlike the Winter King's court (ownerTag + faction spares), an ancient
mechanism's payloads spare **no faction**. The wardens survive their own
halls by READING them (`imminentThreatTo` — the same pure future the warn
arcs stroke), and the `colossus_shard`'s rooted swat (`caul_lash`, knockback
260) exists to throw YOU into them. Kill credit flows to the **presser**
(`ownerId` on loosed lanes; the false floor's swallow rides the push
integrator's forced lane — `pushActor`'s tiniest owned nudge, so the
pitfall fabric's own law resolves everyone: players descend into the minted
hollow below (`descend` — structural in cave rungs), allies scramble,
hostiles are swallowed WITH credit, lip-graspers hold).

## Track fabric extensions this fabric rides

- **`mode: 'once'`** + **`bornAt`** — a lane born at a clock second, one
  clamped pass, retired at the far end with a terminal burst
  (`trackDone`/`trackPending`; pending riders are frozen and harmless;
  purity holds: local time = clock − bornAt).
- **`armed`** + **`tag`** — `World.setTracksArmed(tag, on)`: a disarmed
  lane is retracted whole (undrawn, unswept, unthreatening; a gen groove
  stays as the tell).
- **`ownerId`** — actor-id kill credit (players wear no tags).
- **The RAKE** — a pending lane strokes its WHOLE coming way, pulsing
  harder toward birth (trackLayer): the volley's firing lines, the
  boulder's runway.

## Hidden triggers

`hidden: true` plates wear the near-flush `ruin_plate_hidden` tell;
`render/vis/trapLayer.ts` resolves an outline inside
`TRAPWORK_CFG.revealNear` of the local hero — skill-based spotting at a
walk. (A future `trapSense` stat reveal hooks exactly there — one
documented seam, deliberately unbuilt.)

## Co-op

Specs ride `ZoneMsg.trapworks` (tells already ride the doodad list — no
double plant). States converge via `StateSnapshot.trapState` (id +
armed/sprung + spring clock, idempotent 20 Hz — the doors/hollows lesson);
an armed→sprung edge replays each effect's **mirror** half client-side
(visuals only; damage/credit stay host-side). Lanes need no mirror at all:
`laneArm` ships the full tag→armed map (both-way toggles must converge)
and `laneOnce` ships live once-lane specs (the wells idiom — the reconcile
IS their client existence, absence culls).

## The kit (data/trapworks.ts + doodadVisuals rows)

Riders: `ruin_sawblade` (shearDisc re-palette, bronze), `ruin_fanblade`
(rimeFlail re-palette, hw 62 — validation-pinned to its visual beam),
`ruin_greatblade` (the ONE enormous arm, hw 96 — heavier bite, the longest
warn arc in the kit; the mincer's `greatBlade` dial mounts it solo, claiming
the grandest unclaimed hall), `ruin_sweeparm` (the blunt CARRY-bar, hw 70 —
`push:'along'`: chip damage, big impulse down the lane's travel direction —
a caught body is batted around the wheel; deliberately edgeless bronze, the
look must not promise a wound it doesn't deal), `ruin_scythe` (the short
arm, hw 28 — the blade lattice's substrate),
`ruin_boulder` (`rollingStone` painter — rotation-stable seams, the roll
reads), `ruin_dart` (`dartBolt`, warnAhead 0 — the rake is the warning),
`ruin_stinger` (the gallery's standing dart — the SAME `dartBolt` painter
and honest disc as `ruin_dart`, but warnAhead 140: a standing lane has no
spring moment to rake at, so the warn arc is the read and the parked
pending dart at the maw is the reload tell; gentler bite, shorter ICD —
the gauntlet asks timing, not one dodge).

**The wheel dials** (`mincerRooms`): every laid wheel rolls its own character
— `blades` [lo,hi] arms, `speed` [lo,hi] rim px/s (slow wheels and fast
wheels in one crypt), `seating` `'even'`|`'random'` (free seats CLUSTER —
three arms nearly stacked, one lonely gap), `reverse` widdershins chance,
`greatBlade`/`sweepArm` rider-swap chances, `rider` override. Legacy
chance/max-only dials keep the classic even pair at 105px/s.
**The blade lattice** (`bladeLattice`): one grand hall TILED with small
async wheels — a hub grid where every node rolls its own speed, direction,
blade count, seat and fill. Seams are STRUCTURAL (pitch clamps so adjacent
sweeps can never meet; fill misses leave lanes through), rings are grooved
(the carved tell), and the fit is ADAPTIVE — hubs shrink to the hall,
hopeless halls stay quiet (author `roomCellsMax` up for full-size lattice
country; the toothed halls do). It picks BEFORE the mincers — the rarest
archetype gets the grandest floor.
**The wire ward** (`wireWards`): the fabric's TRIPLINE half, and the only
archetype that is not a plate. A wire strung wall-to-wall across a real
corridor stretch, wired to a `volley` raking the hall's own LENGTH — `rays`
lanes spread evenly across the width so the seams between them stay honest
ground, `crossfire` turning every other lane around so the far mouth answers
too. Where a plate is a PLACE you walk around, a wire is the whole width:
leap it (`sparesAirborne` default) or learn it. Single-use unless `rearm` is
authored — a cut wire stays cut, and the zone's own re-mint is the reset.
**The dart gallery** (`dartLanes`): the `lanes` effect's field debut — the
fabric's WIRED-STANDING archetype. A hall of cross-firing wall maws on
STANDING `once`+`rearm` lanes: each station is a **tagged** lane firing from
a `dart_maw` (alternating walls, phases marched down the hall so the wave
reads), born `armed: false` — the dormant corridor shows only the carved
cross-grooves and the maws. A HIDDEN flagstone between the first two
crossings is wired `{lanes, on}`; one visible plate past the far mouth is
wired `{lanes, off}`. The wrong flag WAKES the corridor **around** you
(stations ahead and behind — committed either way); beating it to the far
plate stills it; both plates re-arm, so a stilled gallery re-wakes on the
next wrong step, and baiting a pack across the flag is the intended play,
forever. Dials: `stations` [lo,hi] (geometry trims the count), `speed`
(default 340), `cadence` (each maw's reload rest, the lanes' rearm), `rider`
(default `ruin_stinger`). Its hunger is the saw's own 140 — measured: these
interiors grow few long halls, so a short hall carries the compact
2-station lesson and a grand one scales to the full march.
**SITE HUNGER orders the pass.** Corridor stretches are the scarcest thing
this generator makes and `takeStretch` is first-come: laid last, `wireWards`
measured **zero** wires over 24 minted ruins, starved by the plates ahead of
it. The two DIAL-GATED blocks draw straight after `boulderRuns` — the
gallery first, then the wire (the ask ladder: boulder 240 > gallery 140 ≈
saw 140 > wire 130 ≈ ward 130) — and, uniquely, their whole blocks are
**gated on the dial** (for the gallery: dial present AND `chance > 0`)
instead of burning the customary chance draw, which is what makes those
positions free: a face that fields neither draws nothing here wherever the
blocks sit, so no standing seed moves for an archetype it never fields
(probe §13 pins absent == chance-0, byte for byte). Every point of `chance`
on a face is a saw hall somewhere else that never got built — the sunken
ruin's dials are sized against that trade (base 0.35×1, toothed halls
0.6×2).
Tells: `ruin_plate`/`ruin_plate_hidden` (`floorPlate` painter, `sink`
dial), `ruin_floor_gap` (chasmPit — a TRUE pit, `DoodadRule.fall`),
`boulder_cradle` (boulder painter — you SEE the stone waiting),
`dart_maw` (watcherStone re-cut — the wall that watches is the wall that
spits), `ruin_tripwire` (groundChain re-palette in verdigris — a bolted
cleat whose link run marches along the wire's bearing, which is the doodad's
`rot`; laid in facing PAIRS, one per wall, so the two runs meet mid-hall and
the corridor reads STRUNG from either mouth. The one tell with no
`DoodadRule` row on purpose: the unlisted default ('ground') is already
exactly what a chain lying on the flagstones is — never blocking, never
walk-gated off the wall it bolts to).

## Config + reserved seams

All dials in `TRAPWORK_CFG` (salt, sweep beat, press pad, crumble/rumble/
rake delays, dart/boulder speeds, `maxPerZone` 14, `revealNear`).
Named-unbuilt: `trapSense` reveal stat; lever fixtures (a struck
`passive+immortal` actor driving `lanes` — the puzzle-node sensing lane is
already open); grapple-plates for the mass fabric's shove grammar. (The
labyrinth trap pass and the surface rooms seam are BUILT — see Authoring.)

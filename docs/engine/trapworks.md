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
   `dartWards`, `boulderRuns`, `falseFloors`, each `{ chance, max }`) and
   lays mechanisms WITH the geometry in hand: saw lanes down measured
   corridor stretches (groove carved, clearway-protected), rotor mincers in
   real chambers (hub sized to the room), plates at real coordinates, maws
   on real walls, runways pre-grooved. Portal/door clearances enforced;
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
press); triplines are crossed capsules. Filters reuse the payload grammar:
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
reads), `ruin_dart` (`dartBolt`, warnAhead 0 — the rake is the warning).

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
Tells: `ruin_plate`/`ruin_plate_hidden` (`floorPlate` painter, `sink`
dial), `ruin_floor_gap` (chasmPit — a TRUE pit, `DoodadRule.fall`),
`boulder_cradle` (boulder painter — you SEE the stone waiting),
`dart_maw` (watcherStone re-cut — the wall that watches is the wall that
spits).

## Config + reserved seams

All dials in `TRAPWORK_CFG` (salt, sweep beat, press pad, crumble/rumble/
rake delays, dart/boulder speeds, `maxPerZone` 14, `revealNear`).
Named-unbuilt: `trapSense` reveal stat; lever fixtures (a struck
`passive+immortal` actor driving `lanes` — the puzzle-node sensing lane is
already open); grapple-plates for the mass fabric's shove grammar. (The
labyrinth trap pass and the surface rooms seam are BUILT — see Authoring.)

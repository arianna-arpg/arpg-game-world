# Line of Sight, Line of Fire & Pathing

The occlusion fabric: one raycast, two channels, every consumer. Nothing in
it names a terrain kind — blocking is **data the terrain already declares**.

## The one ray (`src/engine/los.ts`)

`castRay(env, from, to, channel)` walks a segment over BOTH terrain models:

| channel | doodads (spatial index)                     | grid cells            |
|---------|---------------------------------------------|-----------------------|
| `sight` | `blocksSightOf` at full **crown** radius    | `RegionKind.blocksSight` |
| `shot`  | `blocksProjectiles` at **trunk** radius (`bodyRadiusOf`) | `RegionKind.blocksShot`  |

World wraps it: `lineOfSight` (eyes), `lineOfFire` (effects), `clipShot`
(first-blocker clip, pulled back `LOS_CFG.clipBackoff`), `losCached`
(TTL-memoized perception rays). All thresholds live in `LOS_CFG`.

The terrain promise, everywhere the ray is asked:

- **True walls** (`wall`/`rampart`/`flesh_wall`/`fungal_wall` regions; rock,
  cliff, masonry doodads) stop both channels.
- **Chasm-likes** (`void` region; `chasm`/`void_chasm`/`lava` discs; water,
  ledges) stop **neither** — bodies can't cross, shots and eyes sail over.
- **Partials** keep their character: `window`/`parapet` = see + shoot
  through, never walk; `giant_kelp` = walk-through fronds that break sight
  only; `tallgrass` = a soft hedge (move-only).

## The drawn veil (`render/vis/sightVeil.ts`)

The ray's visible half — POSITIONAL OCCLUSION SHADOWS from the local hero's
eye, so the screen finally states what the fabric always enforced. Two
occluder families, both read from the data above (nothing names a kind):
grid cells whose `RegionKind.blocksSight` is true throw dark from their
FACING EDGES (closed doors seal into the grid as rampart and reopen with
it), and solid doodads throw tangent wedges from their SHOT surface — the
TRUNK, deliberately: crowns already own what's beneath them via the canopy
veil, and the AI's sight channel stays blinded WIDER than the veil draws
(crown radius), so the asymmetry always favors the player.

Render-only by doctrine; `LOS_CFG` and the AI never read it. What stands in
a shadow is unseen with its ground — actor sprites fade (smoothed), labels
gate through the same test the sheet draws from, and the room veil
(`docs/engine/interiors.md`) supersedes it inside a confining room. Levers:
`VIS_CFG.sightVeil` (strengths, tint, resolution, feather),
`ZoneTheme.sightVeil` multipliers (per-zone art direction),
`DoodadRule.sightShadow` (per-kind override; default `blocksShot &&
blocksSight`). Forensics: `npm run perf -- --ablate=sightveil`.

## The skill lever

Relevant deliveries (`projectile`/`cone`/`nova`/`target`/`ground`/`storm`,
plus `DischargeSpec`) accept `occlusion: 'blocked' | 'free'`. Defaults per
type sit in `LOS_CFG.delivery` ('blocked'); unlisted types (melee, self,
movement) are free. The **`phasing` stat** frees any use from data —
`World.skillOcclusion` is the one read; the Wraith Passage support grafts it
exactly the way Ricochet grafts `projBounce`.

What 'blocked' means per delivery:

- **cone/beam** — victims without a firing line are spared; `beamFx` rays
  visibly clip at the stone.
- **nova** — the burst washes around corners it can see past, never through
  walls; walled-off bodies don't consume `maxTargets` slots.
- **target** — hostile targeting refuses walled-off victims (ally mends are
  always free).
- **ground/storm** — the cast point clips to the near side of the first
  blocker (`clipShot`); ground-zone ticks/pulses/volatiles/fissure
  aftershocks spare the walled-off (`World.zoneSees`); **storm strikes fall
  from the sky** inside the disc (`LOS_CFG.zoneTickTypes` gates only
  `ground`).
- **projectile** — already collided with terrain; `'free'` makes it phase.
- **chains/discharges** — hops need the line.

Celestial skills (`meteor`, `meteor_storm`, `meteoric_bombardment`,
`icy_comet`, `levinfall`) declare `occlusion: 'free'` — the artillery niche.

## The AI

- **Perception** (`acquireTarget`): fresh locks need sight; a held lock
  survives blindness for `max(PerceptionSpec.memory, LOS_CFG.chaseMemory)`
  then snaps; `relentless` never lets go; `PerceptionSpec.xray` (burrowers'
  tremor-sense) skips the gate. `aiLastSeen` refreshes only while seen.
- **Hold fire** (`pickSkill`): skills whose delivery a wall would eat are
  unusable while the line is blocked (`World.aiNeedsFireLine`) — meteor
  casters bombard from cover, ray casters close for the line.
- **Channels**: a walled firing line releases after `LOS_CFG.channelGrace`
  (`CastingState.losLost`).
- **Aim assist**: wall-hidden targets break the reticle lock like veiled ones.

## Dwell reach (`World.dwellReachable`)

Every dwell — NPC counters, town sites, sidezone mouths, realm gates, ward
seals, toll keepers, zone exits, corpses, revives — asks one attention rule
before its timer builds: can the dweller honestly reach the object? Tuning
lives in `data/transit.ts` (`DWELL_CFG` + per-row `reach`, per-npcRole
`npcReach`), never inline:

- **`radius`** — proximity alone (contact acts: door pushes, a hull nosing
  shore — the plank/shore IS the occluder a ray would argue with).
- **`sight`** — the ray must reach it, cast on `DWELL_CFG.sightChannel`
  (**'shot' on purpose**: crowns veil eyes but must never blind your own
  hands — a mouth under a canopy stays enterable; true walls stop both
  channels, which is the point). A hit within `sightSlack` of the target is
  forgiven — an object's own frame never hides it. The family default.
- **`roof`** — same roof as a roofed object (`roofedStructureAt`), the
  cellar-hatch `indoorsOnly` ideology generalized; open-air objects degrade
  to `sight`. Mireille's counter runs this: her care is served under the
  inn's roof, never dwelled through its wall (`npcReach.innkeep`).

## Pathing (`World.pathField`)

The zone's pathing authority: the walk grid where one exists (warrens,
structures), else a lazy **nav grid** raked over the convex zone's blocking
doodads (trunk radii + `NAV_CFG.pad`; chasm discs stamp first so bridge
spans re-open crossings; rect/ellipse bounds honored; rebuilt on
`doodadsRev`). Purely advisory — `clampPos` stays the collision truth.

`moveToward` follows it for everyone except **fliers** (straight over
everything) and **`MoveSpec.pathing: 'none'`** minds — mindlessness as an
authored, machine-shiftable trait (zombies pile at walls; the clever thing
walks around and reopens its firing line, which is what makes the hold-fire
gate read as intelligence).

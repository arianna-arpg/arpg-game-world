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
  The candidate walk itself is ZERO-ALLOC (the enemiesOf predicate inlined,
  cheapest checks first) — it runs per actor per tick, and a minted array
  per call was a leading slice of the sim's garbage-per-second (GC pressure
  IS the crowd-fight stutter on the engines that collect slowest).
- **The ray memo** (`World.losCached`, `LOS_CFG.memoTtl`): perception rays
  are TTL-memoized, and each PAIR wears a deterministic TTL offset
  (`LOS_CFG.memoJitter`, hashed off the pair key — never the rng stream, so
  seeded sims stay byte-identical). On a SHARED clock every ray cached at
  zone load expired in the same tick, re-marched together, and re-stamped
  the same deadline — a self-resynchronizing raycast stampede every TTL,
  measured as the crowded-zone frame spike (autocorrelation peak 0.74 at
  the shared period; 0.22 with the jitter). 0 restores the shared clock.
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

## Travel preference (THE WAYFARING FABRIC)

Ground has a PRICE now, and a mind's feet weigh it. Everything is data on
seams that already existed; nothing names a monster or a terrain in engine
code.

**The vocabulary, layer by layer (first answer wins):**

- **`RegionKind.pathCost`** (regions.ts) — the kind's common price as a
  multiplier of plain floor: 1 neutral, >1 detoured in proportion (lava 14,
  bog 3.5, water 1.8), <1 SOUGHT (road 0.9 — packs drift onto live ways,
  composing with the coherence fabric's clearways). Omitted rows DERIVE
  mechanically from their own declared effects (`regionPathCost`:
  standDamage → `PATH_CFG.standDamageCost`, enterStatus/survival → their
  knobs, moveScale → its inverse) — a future hazard row is priced safely by
  default, and a standStatus alone deliberately derives NOTHING
  (concealment is a benefit, not a toll).
- **GROUND INSURANCE** (`World.groundInsured` — THE one predicate, shared
  verbatim with terrain damage): fliers, habitat-matched natives, and
  `MonsterDef.immuneGround` bearers price an insured kind NEUTRAL. What
  cannot hurt a body is never detoured around — pain and preference agree
  by construction.
- **`MonsterDef.pathCosts`** — the body's OWN price per kind, over
  everything above. `< 1` RELISHES: the magma worm (`{ lava: 0.5 }`) treats
  the caldera's pools as a bath and swims them by choice while everything
  mortal picks along the shore. Validated against the region registry.
- **`MoveSpec.hazards`** — the mind lever, stamped live per tick
  (machine-shiftable per phase like `pathing`): `'avoid'` (default) prices
  ground and honors the veto below; `'heedless'` prices everything neutral
  (the zombie wades the bog uncaring) but KEEPS the veto — mindless is not
  suicidal; `'lemming'` drops both — authored self-destruction, one word
  away (bait a charge phase off a cliff by design).

**The machinery** (`world/gridWalk.ts`): profiles intern on the World
(`pathProfileFor`) and resolve to per-grid byte cost tables; non-uniform
profiles shoot Dial's-algorithm WEIGHTED distance fields (deterministic,
FIFO-in-bucket, `PATH_SCALE` fixed-point) through the same LRU + budgeted
stale-refresh the classic BFS uses. A UNIFORM view (heedless minds,
hazard-free grids — every interior) collapses onto the classic unweighted
field byte-for-byte: the machinery is free where nothing is priced. The
any-angle beeline gates on **`linePreferred`** — a priced cell breaks the
shortcut exactly like a wall would (cheap cells never do), so hazards
actually reach the flow field. Convex zones join through
`paintNavGrounds`: nav cells sample `groundAt` itself (one-source: bridges
null, fords wade, way-masked decks stay dry, nastiest-ground priority — the
caldera's lava lakes finally EXIST to pathing), deduped one sample per cell
per rebuild. Runtime-stamped grounds price on convex zones; walk-GRID zones
price whatever their generator painted as regions (gen-time liquids
already are) — runtime stamps on grid zones are a known, deliberate gap.

**THE SELF-PRESERVATION VETO** (`steerMove` in ai.ts — every self-directed
step in the AI lands through it): a step about to carry the body into a
fall/self-destruct boundary (`World.fallHazardAt`: fall / skyfall / descend
/ eject / instakill region cells — void, abyss, chasm, open sky — AND
fall-able pit DOODAD surfaces, read from the pitfall fabric's own
`zonePits`/`pitAt` with the same deck negation and home-kind insurance the
mover's pit confine tests; insurance-aware; the airborne, floating, and
mid-dash exempt) is REFUSED — slide along the rim on the axis that still
stands, else hold ground. This kills the old lemming loop (a monster
grinding itself dead against the fall recovery at ~18% max life a pop
chasing an unreachable target) — including its DOODAD-LANE rebirth when
the pitfall fabric turned chasm doodads from walls into drops (measured: a
steered wolf died in under 8s pressing a classic-fall pit rim; with the
veto it holds short of the lip, unhurt). Knockback, pulls, and scripted
displacement never come through the gate: shoving a body past the pit's
lip stays the payoff it always was, swallow credit and all.

Pinned end to end by `balance/probe_pathpref.ts` (37 checks on the real
engine: pricing + derivation, uniform byte-parity, the detour, finite
deterrence, relish, beeline gating, profile interning + insurance
agreement, convex-nav sensing incl. deep-water cores, the behavioral
wolf-dry/worm-bathes arc, and the veto with its heedless-holds /
lemming-falls controls).

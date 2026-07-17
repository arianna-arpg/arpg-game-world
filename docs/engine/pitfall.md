# The Pitfall Fabric — every drop in the world is the same drop

`src/engine/pitfall.ts` (config + pure geometry) · `src/world/regions.ts`
(the `descend` RecoveryPolicy arm) · `src/engine/levelgen.ts`
(`DoodadRule.fall` + `pitRegionOf`) · `src/data/zones.ts`
(`ZoneTheme.pitfall`) · `src/data/traversals.ts` (`chasm_fall`) — one rule
set shared by every pit: the karst reach's gorge cells, a cave floor's chasm
cells, the outer waste's stamped rents, the tundra's glacial chasms, the
seabed's trenches, hell's abyssal tears. Grid region cells and stamped pit
doodads differ only in geometry; the fall vocabulary, the grasp law, the
policy resolution and the consequence are identical by construction.

## The law of the lip (drawn == tested)

A pit is never a wall. Bodies GRASP its lip exactly as they grasp the
Aetherial's cloud edges (`WALK_CFG.ledgeGrasp` — one knob, every vertical
fabric): a body is SUPPORTED while any part of its grasp disc still overlaps
something that holds it — standing ground outside the pit, or a spanning
deck (`DoodadRule.spans` — `World.bridges`). Only a body carried WHOLLY past
all support has fallen; brushing the edge never drops you, and walking off
is a deliberate, continued act.

- **Grid pits** (region cells `chasm` / `void` / `abyss` — `!walkable &&
  !blocks`): the walk confine's swept grasp (`walkSweep`), unchanged — the
  aetherial law verbatim.
- **Doodad pits** (`DoodadRule.fall: { region }` on `chasm`, `void_chasm`,
  `abyssal_rent`; per-stamp `Doodad.fall` overrides either way): the mover's
  PIT CONFINE (`World.pitResolve` — `clampPos`'s tail) sweeps the same law
  in disc space. The tested interior is the union of the group's discs at
  their stamped radii — exactly the dark the `chasmPit` painter fills
  (`blobPath(group, 0)`); the lip stone the painter grows OUTWARD is
  standing ground, as drawn. Bodies slide along rims the way the walk
  confine slides along walls (single-axis slides), and a body pressed at a
  rim rests AT it (bisected contact refine — no vibration).
- **Gen and pathing are UNTOUCHED**: pit kinds keep `blocksMove: true`, so
  placement spacing, navigability rescue, the clearway sweep, the convex nav
  grid and AI flow fields all still treat a pit as impassable — you route
  AROUND a hole exactly like a wall. Only the runtime mover knows the
  difference between stone and a long way down.
- The unstuck sentinel never "rescues" a body whose center sits over a pit —
  a grasped lip is lawful footing (the aetherial rescue-snap lesson);
  placements and teleports (`clampPos` with no origin) are pushed radially
  out to the rim instead, so nothing is ever BORN over the dark.

## What a fall MEANS — the policy resolution

An arrest past all support classifies `hit: 'void'` carrying the pit's own
REGION id (grid: the cell's kind; doodads: `DoodadRule.fall.region`), and
`resolveBoundary` resolves ONE policy, first answer wins:

1. **`ZoneTheme.pitfall`** — the zone's own word (variants override
   wholesale, the collapse precedent). Only pit-family defaults are
   overridden: sky doors (`skyfall` rows) and authored ejects keep their
   meaning.
2. **The cave default** (`PIT_CFG.caveFall = { kind: 'descend' }`): every
   rung below the surface (`ZoneDef.caveDepth >= 1`) treats its pits as
   mouths of the NEXT stratum. One structural default instead of a row per
   cave face — every future face inherits the ladder for free. The descent
   abyss opts back out with an explicit row (its shaft-and-banking economy
   owns its own drops).
3. **The region row's `boundaryPolicy`** — the classic behaviors, byte-
   identical where nothing opted in (`fall` to edge + 18% max life).

## `descend` — the pit is a door

The flagship policy (`{ kind: 'descend', damage? }`):

- **The player DROPS** (`beginPitDescent`): the pit's underzone mints once,
  deterministically — `mintCave(zone, hashStr(pitIdentityKey(zone, x, y)),
  'cave_<zone>_pit_<seed>')`, no tileset, so the strata fabric face-rolls it
  ONE STRATUM DEEPER under the zone's own anchor (a surface fall opens the
  Galleries; a cave chasm opens the next rung; a hell pit caves hell). The
  `chasm_fall` traversal rides the body down (sky_fall's dark sibling —
  black veil, rim-grit streaking up); landing costs `damage` (default
  `PIT_CFG.fallDamage`, 18% max life, NEVER lethal — the pit delivers you
  hurt, not dead). **Identity is policy** (`PIT_CFG.dropCave.identity`):
  `'zone'` (the default) folds EVERY fall in a zone into ONE shared hollow —
  revisits, re-falls and co-op clients agree by pure math, and deliberate
  re-drops re-enter the same picked-over dark; `'sector'` restores the
  classic `sectorSize` (480) lattice (several hollows under one long gulf —
  the UNDERWAY seam's granularity).

## The drop-cave doctrine (`PIT_CFG.dropCave`) — a punishment, never a farm

A pit-minted hollow is a CONSEQUENCE with a way home, not content that pays.
Falling was once free XP: every 480u sector minted a fresh cave wearing a
fresh `clear` objective (`40 + level×30` on completion) — a player could
farm a gorge lip forever. The doctrine closes every lane, all data:

- **One hollow per zone** (`identity: 'zone'`, above): re-drops re-enter the
  SAME cave with the same Zone Memory — kills stay killed, nothing re-mints.
- **The hollow asks `none`** (`objective` — the `{ kind: 'none' }` objective
  vocabulary in `data/zones.ts`): a HOSTILE ground with no errand. Nothing
  ever completes, nothing pays (no clear bounty, no chest — `OBJECTIVE_SEALS
  .none` false, not in `OBJECTIVE_CHEST_KINDS`), exits never seal, and the
  HUD reads the spec's `label` ("The dark asks nothing — find your way back
  up"). The kind is general vocabulary: any future pocket that is a place,
  not a task.
- **NO WAY ON** (`noDeeper` → `ZoneDef.noDeeper`): the mint refuses the
  deeper-mouth roll (the chance still BURNS — the seeded draw-order
  contract), the Underworld breach, authored `'cave'` layout rows, and
  every DESCENDING hollow reveal (`HollowDef.descends` — the crevice shaft;
  caches/ambushes/veins survive). `generateLayout` then strips any sidezone
  ENTRANCE a face, variant, composition or structure still managed to place
  (the registered entrance-kind set — `registerSidezone` feeds it, so new
  sidezone kinds inherit the discipline for free; seed-paired mouths splice
  their `caveSeeds` zip entry in lockstep), and the Descent Delver refuses
  `noDeeper` ground. New doors cannot grow here by construction.
- **The ladder RUNS OUT** (`maxChain`, default 2 — `ZoneDef.pitChain` counts
  CONSECUTIVE falls, stamped parent+1 at each mint): a hollow already
  hanging `maxChain` falls deep resolves the player's next fall as the
  CLASSIC edge-bite — same toll, no new rung, never a breach into the
  Underworld. Player-only: hostiles shoved past a lip are swallowed with
  full credit at ANY depth (the knockback payoff never dulls). Walking in
  through a real mouth mints no chain — only chained DROPS are metered.
- **The SCATTER** (`arrival: 'scatter'`): the fall delivers you somewhere
  out IN the hollow, never politely beside the climb-out mouth — the way
  back is an errand through hostile dark. Each candidate stand is validated
  (on-mesh, clear of solids, never over a further pit, never inside
  damaging/drowning ground, REACHABLE from the mouth — the way home stays a
  walk), min-distance from the mouth (`scatterMinDist`, clamped by
  `scatterMinFrac` of the hollow's diagonal so cramped pockets stay
  satisfiable), degrading to the farthest reachable stand and finally to
  the classic portal arrival. Deliberately non-seeded: the hollow's
  identity is deterministic, the tumble through the dark is not. Ally
  seats ride the tumble together. `'portal'` restores the classic arrival.
- **THE ANTI-STUCK GUARANTEE**: `caveReturn` is banked at the rim you fell
  from (the sidezone ladder discipline — `caveStack` for nested rungs), so
  the hollow's mouth ALWAYS climbs back out beside the very lip. No pit is
  ever a oneway oubliette.
- **Ally seats scramble** back from the lip (a seat is never lost down a
  hole its player didn't choose); on a player descent they ride the zone
  swap like any cave entry.
- **A hostile SHOVED past its support is SWALLOWED** — killed with full
  credit to whoever shoved it (`a.push.caster` rides the impulse): xp,
  bounties, objective counts, loot dropped at the rim it fell from. The
  knockback/pull payoff the pits always promised — and no soft-locks by
  construction, because a swallow IS a kill. A body merely ARRESTED at a rim
  by its own steering HOLDS there: nothing native to the world suicides
  into a hole (`forced` rides only the push integrator's lane).
- **The insured never fall**: fliers, levitators (`cloudform` included),
  mid-dash/mid-leap bodies (their arcs answer to their own landings), and
  bodies HOME in the pit's kind — `groundInsured`: `MonsterDef.habitat` /
  `immuneGround`, so the void angler roams, hunts across, and can never be
  shoved into its own chasm. Pain, preference and falls all read THE one
  predicate.

## Who opted in (the parity roster)

`descend`: every cave rung (the structural default — cavern, depths,
magma_gallery, rime_gallery, fungal_hollow, ruin layouts' void pits, hollow
crevice-born caves chaining deeper), and the surface countries that field
pits: **karst_reach** (the gorge maze — the cave-richest country finally
connects from above), **tundra** (glacial chasms → the ice hollows),
**wasteland**, **hell_steppes** (hell's pits go deeper into hell),
**deepsea** (below the deep there are hollows still), **volcanic** (the
magma galleries' anchor affinity glows below), **crystal**, **eldritch**.

Classic (deliberate): **descent** (explicit opt-out row — the abyss's
shaft/banking/darkness economy owns its own verticality), the event kits
(**abyssal_rift**, **leyline_nexus**, **hellion_rift** — an event arena
keeps its floor; candidates once event lifecycles are audited), and
bands-0 crack furniture that never was a well (`ember_fissure`,
`abyss_crack`, `hate_rent`, `charnel_pit` — the painter's shelf terrace is
the tell: no terrace, no drop).

## Reserved seams (named, deliberately unbuilt)

- **THE UNDERWAY** — the cave pseudo-dimension: `pitSectorKey` and the
  `'sector'` identity mode are kept precisely for it. A future pass flips
  `PIT_CFG.dropCave.identity` (or grows a per-zone lever) and links
  neighboring sectors' hollows laterally (`ZoneDef.exits` between minted
  rungs — the Wraithsail chain idiom), grows karst gallery networks, and
  lets a fallen player TRAVEL the underworld instead of only climbing back.
  The drop-cave doctrine composes: an Underway hollow that should pay would
  simply mint with a real objective and `noDeeper: false` — the punishment
  is a POLICY on today's mints, not a property of pits.
- **Pit windows**: the understory's headless mode could show the ACTUAL
  minted hollow through a pit's dark (the `window` visual seam) — vertigo
  as truth.
- ~~**Steering-veto pit sight**~~ — CLOSED: `fallHazardAt` (the wayfaring
  fabric's self-preservation probe) now reads the pit surfaces through the
  same `pitAt`/`pitHomeKinds` the mover's confine tests, so steered minds
  hold short of a lip instead of pressing it (on classic-`fall` zones a
  pressed rim GROUND the recovery damage — the forced-only rule protects
  only `descend`; the veto protects everywhere). `pitHomeKinds` reads
  `groundInsured` outright — pain, pricing, falls and the veto share the
  one predicate. Pinned in `balance/probe_pathpref.ts`.
- **Brittle spans over descend pits**: `rotten_bridge` keeps its authored
  collapse recovery (edge + toll). Routing a span's give-way through the
  zone's pitfall policy is one data field if a biome ever wants planks that
  drop you INTO the dark.

## The dev truth layer

The Hitboxes overlay draws fall-able pit surfaces in VIOLET (walls stay
red): what glows violet is tested exactly as drawn, grasp law and all.
`balance/probe_pitfall.ts` pins the whole contract on the real engine.

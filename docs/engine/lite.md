# THE LITE TIER — hundreds of bodies for the price of none

`src/engine/lite.ts` (the pool + config + pure math) · the marked LITE block in
`src/engine/world.ts` (executors) · `render/renderer.ts` drawLite (the batch
blit) · probe: `balance/probe_lite.ts`

## Why

The engine's Actor is a fair price for anything that fights: a StatSheet with
layered modifiers, statuses, cooldowns, a brain, a skill bar. It is a absurd
price for a body whose whole existence is "be a crowd": the gnat veil trailing
a keeper, the rat tide the hero wades through and obliterates. Those bodies
never roll damage, never wear buffs, never think past "drift, follow, touch."
The lite tier is the substrate they actually need — a DOTS-style packed pool
(struct-of-arrays, one batched update, one batched draw) where a body is ~40
bytes of typed-array row and its whole defense is a small integer. Hundreds of
simultaneous bodies cost effectively nothing per body; the fantasy ("insane
numbers of simulated AI you can wade through") becomes a data entry.

The design keystone was already shipped: THE PLY FABRIC made durability a
hit-COUNT, magnitude-blind. A lite body IS its ply count — damage-in needs no
mitigation ladder, no life pool, no leech bookkeeping. One integer decrements;
at zero the body dies in a mote. Plies were built as the horde-tier substrate;
this is the horde tier.

## The tier law

A body lives in exactly ONE tier at a time:

- **LITE (the pool)** — position, velocity, kind, plies, phase, owner, team.
  No Actor, no sheet, no statuses, no skills, no brain. It steers by pure
  math, hurts by pooled contact, dies by integer.
- **FULL (an Actor)** — everything, exactly as today.

**PROMOTION** crosses lite → full at the interaction boundaries, the moments
the real pipeline is genuinely needed:
  1. **The latch** — a pool body of a clinging kind (`MonsterDef.cling`)
     reaching latch range of an opposing actor promotes; the real cling sweep
     seats it next tick (riders whack through their real kit — that IS the
     full pipeline).
  2. **The grab** — `grabSeize` finding no actor victim in reach seizes the
     nearest pool body instead: it promotes mid-cast and is held as a real
     body (you cannot carry a row of floats).
  3. **The conducted order** — `minionCast` meta delegation promotes the
     nearest `THRONG_CFG.metaDelegate` pool bodies before delegating (one
     voice, one REAL actor).

**DEMOTION** crosses full → lite only for lite-TIER throng rosters
(`ThrongSpec.tier: 'lite'`): a promoted body that has gone quiet — no ride, no
hold, no order, no target, no cast, no statuses — folds back into the pool on
the demote cadence. Classic (untiered) throngs and every other minion never
demote; the TIER decides the resident substrate, promotion is the exception
window, demotion is the return.

**The round trip is lossless for what matters**: kind, owner, position, and
PLIES SPENT survive both crossings (a gnat that ate a swat rejoins the pool
with the swat remembered). Everything a full body earned beyond that (buff
stacks, cooldown state) is deliberately surrendered at demotion — a body only
demotes when it carries none of it.

## Everything is data

- **`MonsterDef.lite?: LiteSpec`** — the per-KIND opt-in. Almost everything a
  pool body needs is already ON the def (radius, base.moveSpeed, color /
  material / shape / look for the bake, `plies.count`, `cling`, `flier`, xp);
  LiteSpec adds only what full defs don't say:
    - `contact { damage, type?, beat?, countCap? }` — the pooled bite (below).
    - `weave? / erratic? / cohesion? / separation?` — steering texture
      (defaults LITE_CFG.steer; weave rides the SAME flight.ts math the
      flocking fabric wears).
    - `aggro?` — enemy bodies notice a seat inside this range (default
      LITE_CFG.aggro).
- **`ThrongSpec.tier?: 'lite'`** — the gathered roster lives in the pool:
  claims spawn rows (not minions), the direct sweep marches the cloud, saves
  count rows, disband re-wilds rows as ordinary husks. The batch rule's
  purpose (no quadratic swarm) is served STRUCTURALLY: pool bodies wear no
  owner stats at all — minion investment reaches a lite throng only through
  its PROMOTED bodies (which bake at 1/batch like any claim).
- **`ZoneTheme.lite?: ZoneLiteSpec`** — ambient pours: `swarms` rows
  `{ monsterId, pockets, size, chance?, announce? }` roll on a SALTED stream
  (`LITE_CFG.salt` — never moves layout/spawn rng; the scenery/puzzle/throng
  boot discipline) and seat their pockets on leftover POIs. The debut: the
  sewerworks' rat tide.
- **`LITE_CFG`** — every threshold (capacity, cell size, beats, caps, fx
  budgets). Tune HERE, never inline.

## Damage OUT — the pooled bite

Per-body hits would be a quadratic lie (300 bodies × applyHit per beat). The
pool aggregates: each sweep counts, per opposing ACTOR, the bodies of each
kind pressing its rim; on that victim's own staggered beat (kind `beat`,
default LITE_CFG.contact.beat) the cloud lands ONE resolved hit:
`damage × min(count, countCap)`, typed, through the real `mitigateTyped`
(armor and resists honestly apply) and the real PLY GATE (a plied victim eats
ONE TEAR per beat, however thick the cloud — the ply fabric counts BLOWS and
the pooled bite IS one blow; probe-pinned). No evasion, no block, no crit —
the bodily-damage lane (the grab-burst precedent). Player-owned clouds credit
their keeper on the kill (xp, quests, the usual ladder); the bite's magnitude
is KIND DATA, deliberately outside the owner's minion-stat fold — "the actual
impact is effectively negligible" is the doctrine, and the lever to change it
is the data row, never a stat.

## Damage IN — the carve

Two hooks cover every way the world hits things, and both already existed:

1. **`strikeSurfaces`** — the one seam every area delivery already plays
   (melee arcs with their true arc predicate, novas with shape/edge/occlusion,
   projectile splash, zone pulses, ownerless blasts). The pool carves inside
   it: every body of an OPPOSING team (a null striker carves all — "a blast
   is a blast") inside the exact drawn geometry tears one ply; zero plies =
   death mote. A flame wall's pulse mows the tide wave by wave; your nova
   obliterates the wade-through crowd — automatically, for every present and
   future verb that plays the surfaces.
2. **The projectile step** — each flight step sweeps its segment through the
   pool and tears bodies along it, honoring the projectile's own remaining
   PIERCE budget (a non-piercing arrow kills one gnat and dies there; a
   piercing bolt mows a furrow). Cross-team only — your own veil never eats
   your arrows, but an enemy volley thins your cloud: the throng as a living
   meat-shield is real, emergent, and priced.

DoTs, fog grants, creep grants and other seeping wounds do NOT touch the pool
(no life pool to drip into — "wounds that seep are not blows that land"). The
anti-swarm-DoT counterplay lane belongs to REAL plied bodies; against the pool
the counterplay is any area BLOW, which is everywhere.

Pool deaths aggregate: xp accrues per kind (same formula as createMonster's
xpValue, flushed once per sweep to the credited side), bestiary kill counts
stamp per kind, and a capped handful of flashes + one '×N' text sell the
obliteration without allocating three hundred flashes. Pool bodies drop no
loot, leave no corpses, feed no objectives, and never count as zone
population — they are ambience with teeth (each one a deliberate deferral
with a data seam if a design ever asks).

## The regrowth law — the collective replenishes

A pour pocket or colony remembers its heart and its CAP and trickles new
bodies toward it (`LITE_CFG.regen` defaults; `LiteSpec.regen` kind default;
`LiteSwarmRow.regen` per-row override, `true` = adopt the kind's) — but only
while the collective RESTS:

- Every tear, kill, promotion or trample of a pocket's bodies stamps a
  quiet clock (`quietSec`) that must fully elapse before regrowth resumes.
- A hostile seat standing within `calmRadius` of the heart pauses regrowth
  outright — nothing breeds under a predator's shadow. (Together these
  close the faucet-farm: killing stamps the clock, camping holds the pause.)
- **The extermination law**: an ambient pocket wiped to ZERO is DONE —
  nothing remains to breed back until the zone re-boots its salted stream.
  A COLONY pocket (below) refills from zero as long as its anchor lives.
- Regrowth draws NO global rand — births ride the pocket's own integer-hash
  stream, so seeded runs stay byte-identical through every regrown body.

Ambient regen hearts wear a **burrow tell** (`LITE_CFG.regen.burrowKind`, a
walkable ground decal): the exterminator can SEE where the collective
breeds, and the hole seals (evaporates) when the pocket dies.

## The colony — the collective as an entity

`MonsterDef.colony { monsterId, cap, rate?, quietSec?, calmRadius?, radius?,
seedFrac? }` anchors a pocket on a LIVING body: a nest, a hive, a lumbering
carrier. The anchor's pocket seeds at `seedFrac × cap` the first regen sweep
that sees it (zone loads, summons and dev spawns all funnel through the one
discovery), its heart FOLLOWS the anchor (a walking colony carries its
cloud's home — the barrow shambler), and its death ends the regrowth
forever: the nest is the exterminator's true target. Colony kinds must
themselves wear `MonsterDef.lite` (validator-pinned). Debuts: the warren
nest's crawl, the ember rift's cinders, the hive node's skirt, the bat
roost's wheeling cloud, the marrow midden + barrow shambler, the tick
reliquary.

**The vent** is the colony's wave verb: the `litePour` skill effect
`{ monsterId, count, scatter?, owned? }` pours pool bodies at the skill's
resolution point (a projectile pours at IMPACT — the piper's lobbed
bundle). A caster who anchors a colony of the same kind pours INTO its
pocket, so the vent counts toward the collective's cap. `owned: true`
instead rings the bodies around their caster like a gathered cloud.

## The trample lane — the crossing is the kill

`LiteSpec.trample { minSpeed?, minWeight? }` (defaults `LITE_CFG.trample`)
opts a kind into dispersal underfoot: an OPPOSING actor moving at ≥
`minSpeed` whose trample mass — `effectiveWeight() + the trample stat` —
meets `minWeight` kills any body it overlaps (touching rims, no pad), plies
notwithstanding: a boot crushes the beetle whole. Credited like any carve
(xp, bestiary, pocket disturbance). The gates are the family texture:
vermin and bone squish at a walk, chitin wants a heavier step
(`minWeight 1.6`), animate metal wants a juggernaut's (`2.4`) — and FLIERS
never resolve a finite gate (you cannot step on what isn't underfoot).
Speed reads the behavior fabric's honest displacement estimate (`velEst`),
so walks, dashes and launches all qualify; the lane costs nothing in zones
where no resolved kind tramples. It is symmetric by construction: a
stampeding monster (base.trample) scatters YOUR owned cloud.

Player levers: the `trample` stat (offense-only mass — boots affix, the
mass cluster's trample branch) and `plyRend` (extra plies torn per blow —
the Exterminator support, folded tag-queried at the real ply gate and
untagged at the pool carve).

## Steering — cheap, deterministic, alive

One batched pass: spatial buckets rebuild (counting sort, O(n)); each body
resolves a GOAL (owner ring around its keeper — the throng heel-ring look,
id-hashed seat on a slow orbit; a live ORDER mark from the direct sweep; an
enemy's noticed seat inside aggro; else home drift around its pour pocket),
folds the weave figure-eight (flight.ts `weaveVel` — the same axes bolts and
locusts bank), a hash-noise erratic wobble, and bucket-local separation, then
integrates. Ground truth is the walk grid (`walk.isWalkable` + bounds; a
blocked step slides axis-wise). Deliberate: NO doodad collision, NO clampPos,
NO pathfinding — pool bodies are beneath the hit-surface fabric's notice, and
nobody has ever watched an individual gnat. Everything is deterministic by
construction: pours ride a salted Rng, steering noise is integer-hashed per
(row, tick) — the pool never draws global rand, so two seeded runs produce
byte-identical arrays (probe-pinned).

## Rendering + the wire

`drawLite` runs just under the actor pass: per kind, resolve the SAME baked
body sprite the full tier blits (BodyLook off the def — a promoted body is
pixel-identical to its pool self), then one loop of two drawImages per body
(shared shadow blob, sprite with a phase bob) — no save/restore, no per-body
state churn. Kind→sprite memos register with the cache steward and drop on
zone/run trims. Co-op ships `lt` on the snapshot: a kind table + flat rounded
(kind, x, y) triples; clients render the pool from the wire (host-
authoritative; a dropped packet self-heals at the next 20 Hz reconcile — the
wells idiom).

## Lifecycle

The pool is ZONE-LOCAL and transient: `bootLite` zeroes it, pours the theme's
swarms, and re-fields any lite-tier throng roster beside its keeper (the
restoreThrong idiom); zone memory does not carry pool bodies (a tide re-pours
from its own salted stream on re-entry — same seats, fresh bodies; claimed
NOTHING persists because nothing is claimable). Keeper-owned rows cross
portals as COUNT, re-fielded at the far side. Saves store lite throngs as the
same `{skillId, defId, level, count}` rows classic throngs use.

## What this deliberately is not

- Not a second AI system — there are no perceptions, no brains, no orders
  except the one mark the direct sweep stamps.
- Not a stat surface — no stat on any sheet changes a pool body except
  through promotion. (`minionMaxCount` still sizes lite-throng CAPS — count
  is the one lever that composes.)
- Not a tier for anything that matters individually: bosses, elites, casters,
  quest bodies stay full, always.
- Not wired to tiered zones' cross-layer draw gating yet (the debut venues
  are single-layer); a pool `tier` byte is the shaped seam if a drains tide
  ever needs it.

## QA

`balance/probe_lite.ts` pins: pool spawn/free/reuse laws; the carve under
each geometry (arc predicate, disc, projectile pierce budget, cross-team
only); the pooled bite (beat cadence, count cap, mitigation, the one-tear-
per-beat ply law, keeper credit + xp flush); promotion at all three
boundaries and demotion back, with plies/kind/owner surviving the round trip;
cap folding through `minionMaxCount`; the disband re-wild; byte determinism
under a fixed seed; capacity exhaustion (spawns refuse gracefully, never
overwrite). `npm run perf -- --lite=N` is the forensics lever (pours N stress
bodies around the hero in every swept zone — prints the frame ledger, never
gates); the committed sewerworks pour rides the ordinary gated sweep.

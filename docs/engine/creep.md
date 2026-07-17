# The Creep Fabric — living ground membrane

`src/engine/creep.ts` (sim) · `src/data/creeps.ts` (kinds) · `src/render/vis/creepLayer.ts` (draw)

Creep is an organism's SKIN laid over the zone floor: anchored membrane
patches that grow outward from a heart, breathe on the warren's shared
lub-dub, and RECOIL when their heart dies. It is the fourth theme fabric
(beside fog / collapse / flux) and the first one content can plant at
runtime anywhere: a biome grows it ambiently, a package spreads it as an
event footprint, a monster carries it as its own ground. The drawn skin IS
the hit surface — an actor standing on live creep (cover ≥ the honesty
floor) wears the kind's granted statuses, refreshed while on it, lingering
briefly after stepping off (the fog fabric's exact contract, grounded).

## The data surface

**`CreepDef`** (`CREEPS` registry, `registerCreep`) — one row per creep KIND:

| Field | What it says |
| --- | --- |
| `color` / `rim` / `vein` / `glow` / `alpha` | the whole palette: membrane body, rim welt, filament, freckle+pulse tint, peak opacity |
| `reach` | patch radius roll (heart to mean rim) |
| `lobing` | rim waviness 0..1 — three integer-frequency harmonics make the ameboid skirt (validator caps 0.6: past it rims self-cross) |
| `spread` / `recede` | front advance speed growing / recoil speed dying (default recede = spread × 1.6 — skin recoils faster than it crawls) |
| `pulse` | heartbeat rate multiplier (1 = the warren's own clock) |
| `veins`, `nodes` | render density: filament count roll, freckle density (keep freckles SPARSE — the unease is in the noticing) |
| `hitFloor` | min cover that still counts as "on creep" (edge honesty) |
| `grants` | `CreepGrant[]`: status + optional `teams` / `factions` / `notFactions` filters — the idiomatic pair is one grant FOR the organism's faction, one against everyone else |

**`ZoneCreepSpec`** (`ZoneTheme.creep`) — what a zone grows ambiently:
`{ pockets: [lo,hi], kinds: [{ id, weight? }] }`. Pockets place by
best-candidate spread (each favors the anchor farthest from the placed),
born full. Variants inherit the base theme unless they override `creep`.

**`MonsterDef.creepSource`** — `{ kind, reach?, bornFrac? }`: the body is a
CREEP HEART. Planted on its first update tick (the composite-parts
lazy-attach idiom, so every spawn path works), bound to the actor's life —
kill the heart and the skin visibly recoils. Any monster may carry one.

Core kinds shipped in `data/creeps.ts`: `caulflesh` (the Caul's near-black
bruise-violet skin — feeds the `caulborn`, mires everyone else) and
`blightgrowth` (the Eldritch incursion's sickly-green footprint).

## Contracts

- **Seed discipline** — ambient pockets roll on `zoneSeed ^ CREEP_CFG.salt`
  with a dedicated Rng; the fabric never advances layout/spawn rng. Adding
  creep to a tileset cannot move a doodad or a baseline metric.
- **Transience** — rebuilt each `loadZone`; nothing serializes. Durable
  overlays that spread creep re-plant on zone enter (their own snapshot
  carries the WHERE; the fabric only ever holds the live skin). Boundless
  zones never build a field.
- **Statuses, not regions** — grants apply via the ordinary
  `applyStatus(id, 0, 1, 'the creep')` refresh/linger idiom. No walkability
  or LoS changes, by design: the membrane is skin over the world's bones,
  and it composes over ANY ground — roads, flux pads, even collapse rims.
- **Honest edges** — `coverAt` and the render bake share ONE rim function
  (`creepRimMul` × the live front) and one cover profile (`bodyFrac`
  plateau, smoothstep skirt). The rim LIP marks the boundary; grants stop
  just inside it (`hitFloor`).
- **Saturation, not flood** — `CREEP_CFG.maxSources` caps a field;
  `addSource` past it returns null. A runaway spreader saturates politely.

## Runtime shape

`World.creep: CreepField | null`, built at the loadZone ambient-reset block
from `theme.creep`; **`World.creepEnsure()`** lazily builds an empty field
anywhere (the package/monster seam) — creep is a fabric any content can
plant, not a biome privilege. Ticked by `World.updateCreep` beside fog.
Hearts plant in `World.updateCreepHearts` (first-tick latch
`Actor.creepPlanted`).

Open predicates for AI drives and packages: `coverAt(x,y)`, `onCreep(x,y)`,
`nearestSource(x,y)`, `cleanseAt(x,y,r)` (payoffs force-recede hearts),
`addSource(def,x,y,{reach,bornFrac,boundTo,ambient})`.

Renderer: one view-culled pass between the flux layer and the doodad pass
(`vis/creepLayer.ts`) — per-source baked skin sprite (rim, veins, freckles,
lip) scaled by the live front, breathing on `heartbeat()` (exported from
painters — one organism, one pulse), plus a live pulse front riding
heart→rim. Ablate pass name `'creep'`; knobs in `VIS_CFG.creep`.

## THE ADVANCING FRONT (`CreepDef.front` — optional per-row levers)

A creep with a `front` block MARCHES instead of anchoring. Every lever is
optional and every absent lever costs nothing — **a row without `front`
ticks byte-identically to the classic fabric** (pinned by
`balance/probe_front.ts` against a pre-change fingerprint). Debut rows in
`data/creeps.ts`: the **floodcrest** and the **wildfire**; demo faces:
meadow "emberwind" and marsh "floodwake" tileset variants.

| Lever | What it says |
| --- | --- |
| `speed` | march pace (units/sec) before modulation |
| `affinity` | advance multipliers by GROUND KIND (`ground` map + `default` for bare floor); `clearway` is the multiplier over live way discs — **0 makes roads firebreaks** (a way sample CAPS the target: a 0 is a wall, and `starve` finishes the job) |
| `starve` | `{below, after}` — the land ahead reads dead for `after` seconds → the section gutters (recede + die) |
| `consume` | rows of `{fuel, leave?, feed?, spawn?, fx?}` — eats doodads whose `DoodadRule.fuel` matches (the habitat idiom: classification on the rule, policy on the front): swap to the remnant kind or fell outright, stoke the section, sometimes birth kin (capped `CREEP_CFG.front.spawnMax` per visit) |
| `convert` | `{ground, shallow?, every?, r?}` — ground stamped behind the trailing rim as real runtime discs (ashfield behind the blaze; `shallow: true` water behind the crest — **the ford contract: a wake wades, never drowns**) |
| `quench` | ONE lever: `{types, power}` — typed damage on the skin stalls the section's vigor; at zero it gutters. Vigor breathes back at `CREEP_CFG.front.vigorRegen` |
| `feed` | ONE mirror lever — typed damage STOKES the section. Keep `power` HIGH: a stray splash from a passing build must never meaningfully hasten an authored danger |
| `yieldWays` | live way discs are masked out of cover, grants, drag, wake stamps AND the drawn skin — from ONE list (`setWays` → per-section `nearWays`), so the dry deck on screen is the dry deck in the hit test |
| `drag` | `{accel, notFactions?}` — the undertow: covered bodies carried along the bearing through the mover contract with the wind fabric's exact spares (dormant/anchored/constructs/airborne exempt; weight leans against it) |
| `drown` | `{drain}` — covered PLAYER seats drain breath (the survival fabric; monsters never drown). The `Actor.survivalHeldAt` stamp keeps terrain regen from refilling against the hold |
| `skin` / `edge` (on the def) | render: `'water'`/`'blaze'` bake families beside the classic membrane, and the LEADING-EDGE telegraph (arc + direction streaks on the bearing side — the advance reads at a glance). Knobs in `VIS_CFG.creep.edge` |

**Spawning fronts.** Ambient: `ZoneCreepSpec.fronts` rows —
`{id, line?, bearing?, delay?, waves?}` — spawn picket-line WAVES from the
boundary the bearing points away from; `waves` makes them return after the
last section dies or leaves. Runtime: `field.addFront(def, x, y, bearing,
{reach?, bornFrac?, boundTo?})` — the package seam; `boundTo` still works
(kill the caller, the section recoils), and `cleanseAt` force-gutters.

**The quench tap.** `World.frontSplash` sits beside the mallet seam at
every blast site (melee arcs, novas, targeted splash, cones/beams, pops,
movement eruptions, projectile path-blasts, zone strike moments, dying
breaths, plus the typed ownerless `burstDamage` lane) and rolls the
ORDINARY skill dice against the skin — one-roller doctrine, gated null-cost
behind `CreepField.quenchable`. Deliberately untapped: proc explosions and
leap landings (marginal lanes; add beside their `strikeSurfaces` calls if a
row ever needs them).

**Anti-goals (load-bearing).** There is NO reaction matrix: a front names
only the types it cares about, unlisted types are silence (probe-pinned:
fire does nothing to the flood). Player casts never ignite fronts or
terrain that isn't already burning — **ignition-by-player-damage is a
reserved seam, default OFF everywhere**, to be added (if ever) as a per-row
/ per-zone opt-in so fire builds never become a liability.

**Reserved seams, named.**
- *Escape-chase event*: bind an `ObjectiveSpec` `'escape'` zone to a lane
  (or `addFront` from the event) — the front IS the pursuer. Nothing built
  yet; the spawn rows and `addFront` are the whole contract it needs.
- *Attunement ice-jackpot*: enough cold poured into a floodcrest section
  tunes it briefly SOLID into standable ice — belongs to the attunement
  fabric (`engine/tuning.ts`, in flight in a co-session) and should land
  there, reading `quench` intake off this fabric rather than adding a lever
  here.
- *Ignition opt-in*: see anti-goals above.

**Co-op note.** Creep still never serializes (transience contract), and
front state (runtime quench, consumed doodads, wake stamps) is
host-authoritative with no delta lane — guests converge on zone resync,
exactly like brittle pops. A future wire would model on the `doors`/
`hollows` meta-delta channels.

## Extension seams

- A new creep anywhere = one `registerCreep` row + a `creep:` line on a
  theme (or a `creepSource` on a monster, or an `addSource` in a package).
- `CreepGrant` is pure statuses today; a dps lane would follow the fog
  fabric's noted resolver seam if a kind ever needs to burn boots directly
  (prefer statuses — StatusDefs already carry dots/slows/auras).
- Monster creep-seeking: `nearestSource` is the steering query — an
  `x_seek_creep` AI action can ride it (registerAIAction), no engine edits.
- The Eldritch incursion plants `blightgrowth` at its in-zone event sites
  (the corruption's spatial footprint) and `cleanseAt` rides its collapse
  payoff — see `src/packages/overlays/incursion.ts`.
- Front validation lives with the fabric: `validateCreep` takes the
  registry lookups (damage types, sensed grounds, monsters, doodad kinds,
  declared fuel tags) from `validate.ts` — every lever resolves or warns at
  boot, and a consume row no `DoodadRule.fuel` feeds is a dead row that
  warns loud.

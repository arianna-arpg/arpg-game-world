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
| `convert` | `{ground, shallow?, every?, r?, fade?}` — ground stamped behind the trailing rim as real runtime discs (ashfield behind the blaze; `shallow: true` water behind the crest — **the ford contract: a wake wades, never drowns**). `fade: {after: [lo,hi], rate?}` is **THE EVAPORATING WAKE**: each pool dwells its rolled seconds then CONTRACTS at `rate` units/sec until gone — the wave's whole visit is written and then unwritten, and the zone reverts. World-side it is the generic `Doodad.evap` fabric: quantized radius steps (`World.EVAP`) keep the chunk baker's stale trickle bounded, the countdown lives ON the doodad so a revisit resumes the drying, a fresh wave crossing a drying pool re-wets its clock instead of stacking a twin, and `addTempGround(…, {evaporate})` opens the same drying to any temp ground |
| `stretch` | across-bearing rim multiplier — the crest STRETCHED perpendicular to its march (2.6 = the sanguine artery's gallery-filling pulse; 1.7 = the tidal wall's face). ONE anisotropy folded into `rimMulOf`, THE rim product shared by the hit test, the render bake (gradient remapped through the ellipse; boundary traced exactly), the edge telegraph and wave-line spacing — drawn == tested at every angle, pixel-pinned live |
| `quench` | ONE lever: `{types, power}` — typed damage on the skin stalls the section's vigor; at zero it gutters. Vigor breathes back at `CREEP_CFG.front.vigorRegen` |
| `feed` | ONE mirror lever — typed damage STOKES the section. Keep `power` HIGH: a stray splash from a passing build must never meaningfully hasten an authored danger |
| `yieldWays` | live way discs are masked out of cover, grants, drag, wake stamps AND the drawn skin — from ONE list (`setWays` → per-section `nearWays`), so the dry deck on screen is the dry deck in the hit test |
| `drag` | `{accel, notFactions?}` — the undertow: covered bodies carried along the bearing through the mover contract with the wind fabric's exact spares (dormant/anchored/constructs/airborne exempt; weight leans against it) |
| `drown` | `{drain}` — covered PLAYER seats drain breath (the survival fabric; monsters never drown). The `Actor.survivalHeldAt` stamp keeps terrain regen from refilling against the hold |
| `skin` / `edge` (on the def) | render: `'water'`/`'blaze'` bake families beside the classic membrane, and the LEADING-EDGE telegraph (arc + direction streaks on the bearing side — the advance reads at a glance). Knobs in `VIS_CFG.creep.edge` |

**Spawning fronts.** Ambient: `ZoneCreepSpec.fronts` rows —
`{id, line?, spacing?, reach?, gap?, jitter?, chance?, announce?, bearing?,
delay?, waves?, when?}` — spawn WAVES from the boundary the bearing points
away from; `waves` makes them return after the last section dies or leaves.
Runtime: `field.addFront(def, x, y, bearing, {reach?, bornFrac?, boundTo?})`
— the package seam; `boundTo` still works (kill the caller, the section
recoils), and `cleanseAt` force-gutters.

**Wave shapes (per-lane, no twin CreepDefs).** `line: [lo,hi]` is the
classic picket; **`line: 'span'` is THE TIDAL WALL** — the line computed to
cross the zone's whole breadth at `spacing` (× band × stretch), fielded
middle-out so the saturation cap trims flanks, never one side. **A spanning
wave ALWAYS leaves at least one clear corridor** — the safe weave-lane is a
structural guarantee, not authoring courtesy: corridors roll inside
`gapMargin`, and any section whose own rolled rim ceiling (reach ×
(1 + lobing × `lobeCeil`) × stretch) would crowd one is NUDGED to its
shoulder (never dropped — the wall stays solid both sides). `gap: {width?,
count?}` tunes the promise (`width` = truly rim-free lane, default
`CREEP_CFG.front.gapWidth`); spanning lanes march jitter-0 so the corridor
survives the whole crossing (probe-pinned: cover 0.000 along it, break-in
to exit, hero parked inside unharmed). `reach: [lo,hi]` re-sizes sections
per lane — one kind fields both a shin-high wash and a towering crest.
`chance` rolls the lane's existence once per visit (the intra-zone-EVENT
dial: 0.22 = the rare day the sea decides); `announce` prints one arrival
line on every seat (the wildlife arrival-line idiom); `bearing: 'cardinal'`
rolls compass bearings (spanning waves read cleanest wall-to-wall);
`when` (the radiance gate) composes — a storm-tide is one row away.
Aquatic honesty: `CreepDef.notAquatic` kinds never field in
`ZoneDef.aquatic` arenas — **no water within water** — filtered
structurally at `buildZoneCreep` (blends and cross-seeds can't smuggle
one under the sea) and linted at boot for authored dead rows.

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

## THE VESSEL BORE (flow / travel / swell / riders — per-row levers)

Blood PUMPED, not poured: four more optional `FrontSpec` levers turn a
marching crest into a **bolus that follows the vessel** — steering with the
walls, elongating as it rushes, spending itself mid-zone, and carrying its
own crew. Absent levers cost nothing (probe-pinned: the classic fingerprint
and the legacy attach path are byte-identical); debut row
`sanguine_bore` + the `pale_corpuscle` rider on the Sanguine's lanes.

| Lever | What it says |
| --- | --- |
| `flow` | THE STEERING: five whisker probes read open ground ahead (`CreepTerrain.openAt` — the walk grid's truth) and the bearing bends toward the deepest channel each tick, so the bolus follows a winding gallery like a current following its bank. `steer` caps the turn rate; a closing center whisker scales it up (`bounce` dials how crisp the deflection reads); a DEAD END rebounds — target flips π (jittered once per rebound on the private stream) at a burst rate, and the surge visibly slaps the cap and rushes back out. `confine: true` is VESSEL CONFINEMENT: cover — grants, drag, drown, the whole gameplay surface — additionally requires an open ray back to the heart, so the current never reaches through a wall into the corridor next door (a gameplay honesty mask like `hitFloor`; the drawn splash may still lap the stone). Flow sections born on closed ground (a walled rim) SNAP IN along their bearing to the first open point — the wave starts inside the vessel it will follow. |
| `travel` | THE FINITE RUN: `range` rolls per section on its private stream; past it the surge DISPERSES (recede where it stands — riders drop as it thins). `taper` eases the last fraction toward `CREEP_CFG.front.travelTaperFloor` first: pressure dying, not brakes. |
| `swell` | THE ELONGATION: the bolus stretches ALONG its march, `1 → max` over `per` units, eased — the slug visibly lengthens down the tube while `stretch` keeps owning the width. |
| `riders` | CREST RIDERS: `{ monster, count?, chance?, arc? }` rows roll seats on the section's private stream at birth; the WORLD mounts real monsters onto them (`World.updateCreepRiders`, capped per visit by `front.rider.max` — the consume-kin ledger's sibling) and slaves each body to the crest every tick. A rider keeps its whole kit — it stabs what the surge carries past — and wears the `crestborne` marker status (re-stamped, cleanse-harmless, the hook other systems may key off). DISMOUNT: the section dispersing/dying drops the crew where they ride; hard-CC or a grab throws them; a shove at `rider.dismountPush`+ knocks the surfer off its wave — and a dropped rider is just a monster again. |

**The two anisotropy modes (`anisoMode`).** A `stretch`-only front is
`'polar'` — the classic world-anchored harmonics × ellipse product, exact
for a FIXED bearing (the tidal wall; byte-stable forever). A row wearing
`flow` or `swell` is `'affine'`: its shape lives in a BODY frame (harmonics
canonical, nose along +X) and the world sees it through ONE transform —
`rotate(bearing) ∘ scale(elong, stretch)` — so a steering bearing rotates
the whole skin and a growing elong stretches it live. The hit test runs the
exact inverse transform (`sourceCover`), the render blits the canonical
bake under the same transform (the radial gradient rides the ellipse for
free), and **`crestPoint(src, bodyAng, frac)`** is THE resolver — rider
seats, the affine edge telegraph and every probe read it, so a seated body,
the drawn arc and a test can never disagree. Drawn == tested in both modes;
they keep the truth in different frames.

**Immunity is data you already have.** The natives ride free through the
existing levers: `drag.notFactions` waives the sweep, grant filters waive
the statuses, and the mass fabric is the player's counterplay lane (weight
leans against the carry — the drag divide is `effectiveWeight`, so heavy
and poised builds already wade where the light are swept).

**Knobs.** `CREEP_CFG.front.flow` (whisker spread/steps, probe reach,
angle penalty, urgency, dead-end threshold, rebound jitter, snap-in cap,
confine ray step) and `CREEP_CFG.front.rider` (per-visit cap, seat
fraction/arc, dismount shove, mount status). Validation covers every lever
(`validateCreep`, incl. rider monster existence and the mount status's
registration).

**Reserved seams, named.**
- *Peristalsis down the tract*: the gutworks' queued push is one bore row
  with `flow` + a slow `travel` on the tract faces — no new machinery.
- *Escape-chase pairing*: a bore lane bound to an `'escape'` objective is
  the pursuer that follows you around corners; the spawn rows already
  carry it.
- *Heart-driven pumps*: a `MonsterDef.creepSource`-style heart that
  `addFront`s a bore on its own cadence (kill the heart, still the vessel)
  — the runtime seam is open; nothing built yet.

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

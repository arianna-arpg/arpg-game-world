# The Crusade Warfront

A Crusade is a faction's holy war as a **living warfront**: an analytic
territorial field (the warfield fabric) that ignites somewhere in the wilds —
often entirely unbeknownst to the player — grows, oscillates, clashes with
rival crusades, plants a **throne** once mighty enough, and dies only when the
player cuts down its Leader in his arena (or snuffs it young). Nothing
overworld is minted: real zones under the field raise the faction's works from
their **local control**, and works collapse on re-entry when the war has been
beaten back, because generation re-asks the field at every load.

Modules: `src/world/warfield.ts` (the shared fabric), `src/packages/overlays/crusade.ts`
(the campaign field), `src/packages/defs/crusade.ts` (every dial), the engine
seams in `src/engine/world.ts` (materialize / throne gate / arena / kill rules
— all reading `crusadeOn()`). Probe: `npx tsx balance/probe_crusade.ts`.

## The warfield fabric (`src/world/warfield.ts`)

Shared math for territorial overlays — the Underworld's eternal war
(`overlays/hellWar.ts`) and the Crusade both compose it; a future campaign
should too, never re-implement it:

- `fieldNoise01(salt, x, y)` — deterministic 2-octave value noise (the fronts'
  ragged grain).
- `driftOffset(heading, turnPeriod, vel, t)` — the noise domain crawls along a
  slowly wheeling heading: fronts advance forever, nobody marches one way for
  good.
- `anchorWell(coord, at, amp, range)` — influence multiplier around a
  seat-of-power.
- `decayingModsMul(mods, coord, t, key)` — decaying local modifier discs (a
  slain marshal's suppression, a liberated hold): the field HEALS.
- `latticeWindow(pts, pad, cellBase, maxCells)` — the world-anchored render
  ladder (cell = base × 2^k): map paint is a *window* onto the infinite field.
- `influenceGrad` + `thrustArrowSvg` — "who is gaining here" arrows.

## The campaign model

One crusade = one `ActiveCrusade`: a **heart** (a field anchor — never a
zone), a **power** scalar, a seeded field identity (salt / drift / tide), and
three booleans that ARE the arc: `anchored`, `discovered`, `dead`.

```
influence(c, coord, t) = effectivePower(c,t)            — power breathing on its tide
                       × (noiseBase + noiseAmp·noise)    — drifting ragged shape
                       × anchorWell(heart)               — strongest at the seat
                       × exp(-d / (reachBase + reachPerPower·power))  — FOOTPRINT GROWS WITH MIGHT
                       × decayingModsMul(...)            — liberations suppress, then heal
```

`control01 = clamp((influence − edge) / (full − edge))` is the **gradient**
every consumer reads: the tier ladder, the map wash opacity, the discovery
test, activity. Strongest-crusade-wins at each coordinate; a same-faction pair
never contests.

### The power arc

- **Ember** (`power.start`): grows logistically toward `cap`
  (`growth × vigor × severity-pressure`, floored so a planted war festers even
  when the package is dialed down). Pre-anchor the tide breathes ±`tideAmp` —
  the territory visibly swells and recedes.
- **Snuff** (`snuffBelow`): an un-anchored war ground below the line — by
  player liberations (`suppress.powerNick` each), a rival's clash drain, or a
  consuming event (Deadwake) — gutters out entirely.
- **Anchor** (`anchorAt`, one-way): the throne is built. From here the war can
  be beaten back to `anchoredFloor` but never snuffed; the engine claims the
  heartland's biome (`biomesForFaction`, keyed warp, released on death); the
  throne gate stands in owned ground within `throne.gateRange` of the heart
  (validated ≤ `control.heartland`); only `resolveCrusade` (the Leader kill)
  ends it.

### Clash (crusade vs crusade)

Rival fields need no referee: at every coordinate the strongest field owns the
ground, so overlapping wars ALREADY split the map. On top, each rival's
control over YOUR heart drains your power (`clash.drainPerSec`) — a mighty war
squeezes an unrooted neighbour down to the snuff line by itself. Contested
real zones (`rival/holder ≥ contestNear`) inject BOTH factions' rosters
(`clash.injectContested`) — the warfront brawls in walked ground; `contestHot`
borders feed the map's thrust arrows.

## Discovery — the unbeknownst rule

**The map shows nothing of a war the player hasn't found.** No wash, no
marker, no bulletin, no extent. Discovery flips when the player's standing
zone reads `control ≥ control.discoverAt` (walking covered ground —
equivalently, when the growing front swallows ground they're on). From then on
the warfront renders: the gradient wash (opacity ∝ local control × standing
power — the gradient IS the strength readout), ⚔ contested badges, thrust
arrows, zone-info rows, and war bulletins (front reaches / overruns / gutters
/ throne / broken).

**The throne is found by walking it.** A discovered war paints NO heart sigil
— the wash deepening toward the seat is the only trail. Standing in
gate-bearing heart ground (`sanctumReady`) binds the ☗ marker to THAT zone
(`throneZoneId`, snapshot-persisted, bulletin on the find); the marker is a
zone alias like any other, never a raw-coordinate icon.

**QA visibility:** the map panel's **wash slider** (beside the layer chips —
`Settings.mapWash`, rails in `MAP_CFG.wash`) scales every overlay wash's
opacity through one alpha-slope filter (badges/markers never scale), and the
dev Events tab's **reveal lens** (`cf.devReveal(true)`) paints every war —
hearts, sigils, power labels, discovered or not — plus a live board of each
campaign's power, clash pressure, anchor state and found-throne zone.

## Zones under the field

`crusadeOn(zoneId)` resolves the zone's local control through the tier ladder
(`tiers[].atControl`) into the same `CrusadeInfo` the engine always read:

- **Works at generation** — `crusadeFixtureSpecs` injects the tier structure
  (+ the converted city's street-mix, heartland-only via `nonHeartMaxTier`)
  into `generateLayout`. Since memory only pins the SEED and generation re-runs
  per load, works **rise on the next visit when the field deepens and collapse
  on the next visit when it's beaten back** — world/zone coherence for free.
- **Garrison + tagged commander** at materialize; `suppressNatives` floods the
  roster at high tiers; `countMul`/`amp` thin and tilt the spawn table.
- **Liberation** (`resolveCrusadeZone`) — commander kills, conquests, and the
  Deadwake's consume all land here: a healing suppression disc + a power nick
  (attributed to the nearest heart when a fresh disc masks the read, so
  repeat pressure always lands).
- **Policy**: `eventTargetable('crusade', zone)` gates every read — no
  sanctuaries, caves, special arenas, other events' ground, or denying biomes.

## The throne arena

The gate (`sanctumReady`) opens per-frame in anchored heart ground; stepping
through mints `cave_crusade_<id>` through the ONE realm pipeline
(`enterRealmArena` + `data/arenas.ts`). The population is **authored on
`sanctum`**: `packs: null` + `garrison: [0,0]` is the shipped **true
one-on-one** — the Leader alone on his sand, the stands full, and the crowd's
`championCalls` his only reinforcement (rows vault the rail as the add-phase;
the stands empty when the crown falls). `rewardPerPower` scales the Leader's
spoils by the standing power — a war that grew mighty pays mightily.

## Persistence

Durable pledge, **scalars only** (the field derives from time — it cannot be
corrupted, only re-asked): campaigns + suppression discs + the bulletin-edge
ledger, `v: 2`. Pre-field (v1 spreading-state-machine) snapshots are dropped
tolerantly — those wars re-roll and their old minted zones scrub through the
ordinary `ownedZones` transience rules. Same seed + same ticks ⇒ byte-identical
snapshots (eventqa-enforced).

## Dials that matter (all on `CRUSADE_SURGE`)

| Feel | Dial |
| --- | --- |
| How often wars kindle / how many | `triggerChance`, `maxConcurrent` (× package pressure) |
| How fast they grow / how big they get | `power.growth`, `power.cap`, `field.reachPerPower` |
| How long until a throne | `power.anchorAt` (≈2-4 min at pressure 1) |
| How killable young wars are | `power.snuffBelow`, `suppress.powerNick`, `clash.drainPerSec` |
| How visibly they breathe | `power.tideAmp` / `tideAmpAnchored`, `field.driftVel` |
| Where the city rises | `control.heartland`, `tiers[].atControl` |
| The 1v1 purity | `sanctum.packs`, `sanctum.garrison`, `arena.crowd` |
| Map look | `map.washAlpha/washPowerAlpha/washFloor`, `map.arrows` |

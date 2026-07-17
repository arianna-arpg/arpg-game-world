# THE GLOAMING — the dark that arrives

A world-map weather-front of darkness that gathers over the Gloamwood, spreads
outward zone to zone, lingers, and recedes — met in-zone by a draining LIGHT
survival meter and finite-power light sources the players must reside near.

Distinctness ledger (each root of the dark stays its own thing):
- **Descent** owns the underground dark: a countdown refilled by one-shot
  crystalline bursts, consumption resurfaces you.
- **Long Night** is the Court FEEDING under the night sky: sky-phase-bound,
  converts estates, a faction event.
- **Long Candle** is two courts WARRING over candle-light: factions, shrines,
  the waxlight detectability pulse.
- **THE GLOAMING is the dark itself arriving**: no faction owns it, it is not
  the sky (noon gloom is gloom), it EATS light — yours, and its sources'.
- The **Advancing Front** (creep fabric) is an in-zone terrain membrane; the
  Gloaming is a WORLD-MAP front. They share nothing but the word.

## The front (packages/overlays/gloaming.ts + defs/gloaming.ts)

One `GloamingField` (durable surface overlay, package id `gloaming`, magic
`0x910a`). At most ONE front lives at a time — it is THE Gloaming, not an
outbreak plural.

- **Origin is the biome, not a die roll**: seeds = every surface node whose
  biome is `GLOAMING_SURGE.originBiome` ('gloamwood'), resolved from
  `ZoneDef.biome ?? biomeAt(z.map, biomeSeed)`. Hop distances BFS outward from
  ALL seeds at once over `z.exits` (contagion's walk), skipping sheltered
  ground (`skyOf === 'sheltered'` — the dark under a roof of rock is somebody
  else's fabric) and event-denied biomes (`eventTargetable`).
- **The breath of the front** is one integer, `ring`, and one formula:
  a zone's gloom target = `clamp((ring - hops + 1) / rampHops, 0, 1)` scaled
  by the phase. Advance raises `ring` on a cadence (`advanceEverySec`, scaled
  by gate severity), hold pins it (`holdSec`), recede lowers it — the SAME
  formula plays both directions, so the rim always fades first in and first
  out, and no zone ever steps (the weather-never-a-light-switch law).
- Phases: `gathering` (dusk-gated ignition; seeds deepen) → `advancing`
  (ring → `maxRing`) → `holding` → `receding` (ring falls) → cooldown.
- Snapshot = `{ phase, ring, phaseT, cooldownLeft, seq }` (pure JSON); the
  coverage map is RE-DERIVED from ring + the graph on restore (contagion's
  re-derive lesson). `devIgnite`/`devRecede` seams for the Events tab + eventqa.
- Presentation: THE TERRITORY on the world map (`surge.map`) — covered
  ground rasterizes to map cells (the deepwinter tile idiom: tiles never
  alpha-stack, so adjacent zones fuse into ONE contiguous dark country at
  high ring counts), road TENDRILS stamped along every exit whose both ends
  stand covered (the front travels the exits; the map says so), each cell
  keeping the deepest gloom that touched it, plus a single BREATHING
  frontier path around the whole territory (deepwinter's ants march; the
  dark swells and thins) and the per-node breathing ring on the freshest
  rim zones. Zone-info rows, a `mapLabel` chip, bulletins on first charted
  cover + recession. `affectSpawns`: nightkin bias × gloom +
  `injectFactions` gloamborn/nightkin.
- CO-OCCURRENCE (`surge.pairs`, open by overlay id): standing in gloom
  > 0.4 while the named event is ALSO active in the zone announces the
  pairing once per front (bulletin + local text) — the gloaming×longcandle
  row is the promised THREE-WAY LIGHT WAR. Detection is generic
  (`Sim.overlayFor(id)?.activityAt?.(zone)`), so a future pairing is one
  data row; the package's `relationships` additionally 'amplifies'
  longcandle so runs compose the war more often.

## The meter (world/regions.ts `light` row — SHARED with Descent)

`SURVIVAL_RESOURCES.light` now carries the drowning-shaped underflow ramp
(5%→25% max life/sec over 10s) + its own cry ('the dark gnaws!'). Per-row
`underflowText`/`underflowTextColor` are new fields; `Actor.underflowSince` and
`Actor.lastGaspAt` are keyed PER RESOURCE so breath and light panic on their
own clocks. Descent's consume-at-zero is now PREDICTIVE (resurfaces before the
meter can underflow) so the abyss keeps its no-chip-damage contract.

In a gloomed zone (engine half, `World.updateGloaming`):
- Seat actors OUTSIDE any light's reach drain `drainPerSec × gloom`.
- Inside a light's reach the LIGHTWELL feeds the meter back (below).
- When the zone is not gloomed the meter recovers (`recoverPerSec`) and is
  deleted at full — the HUD bar appears exactly while the dark is a problem.
- The zone's LIVE gloom eases toward the overlay's target
  (`easeSec`; set instantly at loadZone — arriving in a gloomed zone is
  honest, the dark does not fade in politely).

## Lightwells (engine/lightwells.ts — the shared light-source fabric)

Data rows (`registerLightwell`) over doodad kinds; the Gloaming's spawned
lights AND ambient zone lights (campfires, braziers, lantern posts…) are the
same fabric with different rows:

- `feed` — meter refill/sec granted to each resident inside the lit reach
  (residence rows only — validated > 0 there, absent on burst rows).
- `pool` — finite power (resident-seconds). Omit = steady: burns forever,
  never dims, never dies (the weak-but-steady ambient row).
- `drainPerResident` — pool loss/sec per resident. Two heroes drain one well
  twice as fast — the co-op pressure is deliberate.
- `decayPerSec` — passive pool loss, residents or not: an ABANDONED well
  gutters on its own clock instead of hogging the event's spawn cap after
  the party moves on (the gloomwell's row). Omit = resident-drain only
  (the kindled wick — a player's investment never rots).
- `burst` — the one-gulp mode (the Descent's light-spot grammar as data):
  `{grant, on: 'touch'|'reach', text?, color?}` — the first body to trigger
  it drinks `grant` LIGHT and the well is CONSUMED. Bursts are pickups, not
  shelter: they never count as light COVER (a spot's glow does not stop any
  drain — descent canon), only bodies already CARRYING a light meter pop one
  (no flare wasted in peacetime), and a full meter still consumes it (sloppy
  routing pays). `'touch'` = the doodad body + `BURST_TOUCH_PAD` (run over
  the crystals — byte-identical to the old descent loop); `'reach'` = the
  drawn glow via `lightReach` (drawn == tested). Exclusive with
  feed/pool/decay (validated). `light_spot` registers in defs/descent.ts
  with the surge's own `lightBurst` dial.
- `dimExp`, `minReachFrac` — the dim curve: reach and intensity scale by
  `powerFrac^dimExp` (floored while any power remains); the light's state is
  legible at a glance, no UI.
- `out` — dissipation dressing (flash + text) when the pool empties.

**Pooled AMBIENT kinds** (the zone-load attach story): an authored doodad
whose row declares `pool` (or `burst`) gets its `Doodad.well` minted by
`World.attachZoneWells()` at the END of loadZone — host/solo only (clients
never run loadZone) and BEFORE the first render, so the light-cluster bake
never captures a pooled well. Idempotent: within the zone-memory TTL a
revisit keeps drained pools and guttered absences; when the world forgets
the zone, the lights are lit again. Co-op clients ADOPT the state instead:
`applyNetWells` matches an incoming well row to an un-welled ZoneMsg doodad
by kind + position and attaches, rather than minting a twin (the cluster
cache keys identity+length+`doodadsVersion()` so the in-place flip re-bins).
The debut row is the jack_o_lantern: ~40 resident-seconds of gourd-light
that dies where it stands — and snuffwicks drink it too.

**Drawn == tested**: `lightReach(d)` in engine/lightwells.ts is THE resolver —
the render light layer and the residence/feed test both call it (the visual
grammar is `DOODAD_VISUALS[kind].light.radius`, negative = ×doodad radius,
scaled by the well's dim). Pooled wells carry `Doodad.well = {power, max, id}`
and BYPASS the light-layer cluster cache (which keys on list identity+length
and cannot see per-frame dimming); they push as individually-resolved lights
each frame on the static-poly cache. Flicker stays a render-side shimmer about
the tested mean; the Gloaming's own kinds keep flicker low.

Monsters can drink the dark's side of the bargain: `MonsterDef.wellDrain`
(power/sec while inside reach) — snuffwicks spawned near a lit well ARE the
defend-the-light verb, with zero new AI.

## Sight in the gloom (data on the existing perception fabric)

Standing in gloom and outside light grants `gloomveiled` (the
fogveiled/smothered idiom): detectability down AND detectionRange down — your
sight shrinks and you are harder to see; brush stealth composes
multiplicatively (near-invisibility is the intended payoff). Grant rows use
the fog fabric's faction filters — the dark's own kin (`darkSighted` factions:
nightkin, gloamborn) are exempt and hunt unimpaired: the front is their home.

## Co-op wire (net/snapshot.ts)

- `SeatW.survival` — the own-hero meter values (only rows below max).
- `StateSnapshot.wells` — pooled wells each tick `{id, kind, x, y, r, pf}`;
  clients reconcile them into `world.doodads` (upsert by id, remove absent)
  so the painter + light layer just work. Well doodads are EXCLUDED from the
  one-shot ZoneMsg doodad list (they ride the live channel exclusively).
- `StateSnapshot.gloom` — the current zone's eased gloom for the client's
  ambient darkness + HUD.

## QA

`balance/probe_gloaming.ts` pins: the front's ring math (advance/hold/recede,
rim-first both ways), meter drain/refill/underflow ramp + per-resource clocks
(breath byte-identical), per-resident pool drain (2 heroes = 2×), the dim
curve + dissipation, drawn==tested reach, gloomveiled grants + faction
exemptions, and the descent no-underflow contract. eventqa carries the
pledge/determinism/roundtrip; genqa carries the new doodad kinds; perf: wells
are few (≤ wellCap) and ride the static poly cache — the 72-light budget is
untouched in shape.

# The Event Fabric — the contract every world event lives by

Every world event in Hollow Wake — a marching warband, a spreading plague, a
posted writ — is ONE `ContentPackage` (`src/packages/defs/*.ts`) riding one
shared fabric. This document is the contract: what a package gets for free,
what it must declare, and what `npm run eventqa` enforces. If you are adding
or refactoring an event, read this first; if you are extending the fabric
itself, update this file in the same commit.

## The shape of a package

One def file (`src/packages/defs/<id>.ts`) + one registry line
(`src/packages/registry.ts`). The def carries EVERYTHING as data:

- **The surge config** — every count, radius, chance, timer and speed the
  mechanic uses, as one typed object handed to the overlay constructor.
  Nothing tunable lives as a literal inside an overlay class (breach was the
  last offender; it is data now). Framework-shape constants (the 0.5s STEP,
  state-machine hysteresis fractions) may stay module consts, named.
- **Unlock + tiers + modifiers** — the Vault discovery ladder. Every ledger
  key a `test()` reads must be bumped somewhere in `src/` — eventqa fails an
  impossible unlock.
- **`validate(look)`** — colocated id checks for everything private to the
  surge (bosses, tilesets, arenas, skills). Common shapes (faction rosters,
  encounters, holdfasts, furnish, relationships, modifier bands) are swept
  generically by `packages/validation.ts`; declare only what the sweep can't
  see. The sim WARNS at boot; eventqa FAILS.
- **`world` hooks** — route pressure into the shared invasion/weather fields
  (migrated features), or construct an overlay (net-new mechanics), listing
  `dimensions` when the event runs in more than one world-state.

## The overlay contract (`world/overlay.ts`)

- **`persistence: 'durable' | 'transient'`** (required) — THE PLEDGE. Durable
  fields implement `snapshot()`/`restore()` (pure JSON, tolerant restore,
  never throw) and usually `pruneZones(has)`; transient fields implement
  neither and restart on resume (the movers doctrine: a marching band
  mid-road is weather; a half-bloodied quarry is an arc). eventqa asserts the
  pledge matches the implementation in both directions.
- **The zone-claim convention** — an overlay whose events MINT `eventOwned`
  zones includes `ownedZones: string[]` at its snapshot's top level. Both
  save sides read it generically: claimed ground rides the save; unclaimed
  event zones scrub and the event re-rolls (the transience rule).
- **Gate reads** — ignition rolls multiply `gate().ignitionMul`; size/speed/
  escalation levers read `gate().severityMul` (clamped, crusade-style, where
  they compound); every concurrency cap goes through
  `scaledCap(base, gate().concurrencyMul)`. Always-on infra fields with no
  gate (incursion) take the crank via a sim-set `concurrencyScale`, the
  weather/invasion pattern.
- **Target eligibility** — `eventTargetable(id, zone)` from
  `world/zonePolicy.ts` is the ONE structural floor (no caves, floating,
  eventOwned, special, sanctuaries + the per-biome deny/allow policy).
  Site-specific extras (visited-only, needs-packs) stay at the call site.
  Never hand-roll the chain; the copies drifted once already.
- **Free surfaces** — `activityAt` (feeds the mycelia bloom), `mapLabel` +
  `renderMap` (map layer chips), `registerMarkerSource` / \
  `registerZoneInfoSource` (map pins + the zone info box),
  `registerAttentionSource` (`world/attention.ts` — IN-zone screen-edge
  chevrons toward a live must-find point: the map marker says which zone,
  this says where in it; draws only while the target is off-screen. The
  fracture run rides it; the hunt beast or a descent shaft can join with one
  registration), `registerBulletinSource` (world notices — faction conquests
  and crusade front-shifts already ride it), `registerKillHandler` (bounties;
  use `Actor.eventKey` to resolve a kill back to its event INSTANCE),
  `registerWorldDrive` (slow meters like vendetta's grudge),
  `registerEdgeBlockSource` (`world/edgeBlocks.ts` — hold a ROAD of the zone
  graph shut at runtime; the travel gate + the sealed-exit hint consult one
  fold. Contract: never cut the charted graph apart — BFS-guard your picks
  like the world-serpent does. Waypoints stay ungated by design). All
  import-time; no engine edits.
- **Roving-arrival fairness** — an event that lands LIVE in a zone the player
  has not crossed yet (the fracture's divert is the template) must arm its
  fail clock fairly: an ARRIVAL GRACE holds the timer until first engagement
  or a config window expires (`FractureSurge.divertGrace`), and the surface
  announce speaks at the PLAYER with a bearing, not only at the (likely
  off-screen) event. A timer that can expire before the player could possibly
  have seen the event reads as "it never spawned" — eventqa's `fracture`
  group pins the whole divert handoff (in-transit ⇒ active nowhere, lands
  exactly on the destination, mid-transit save resolves to the destination,
  grace/idle coherence).
- **`devIgnite(view, zoneId)`** — every event exposes a force-spawn the dev
  Events tab drives (eventqa asserts presence). The tab also shows the live
  gate inspector (share/pressure/muls per package).

## The engine seams (world.ts)

- **The zone-runtime registry** (`buildZoneRuntimes`) — one row per package:
  `reset()` (per-zone state), `enter(def, live)` (materialize; re-invoked
  per-frame with `live=true` unless `noLive`, idempotent by the runtime's own
  guards). This replaced three hand-maintained ladders; register a row, never
  edit the walk sites.
- **The zone-event registry** (`engine/events.ts`) — on-entry substrate
  events (patrol/caravan/siege) are `registerZoneEvent` defs: choose/spawn/
  tick + a cfg of named tunables. Priority = registration order; per-biome
  gating by def id. These are faction-politics substrate — deliberately NOT
  scaled by the frequency crank.
- **Encounters** (`packages/encounters.ts`) — in-zone placed events ride
  `EncounterDef` (+ `dimensions` for non-surface placement, + `biomes` as an
  optional ground allowlist — a village settles temperate country, a seam
  wells up anywhere). Shared framework knobs live in `ENCOUNTER_CFG`;
  per-encounter numbers on the def. Three PROMOTIONS deepen the base shape,
  mutually exclusive: `surge` (Demon Invasion's spatial world-event),
  `extract` (defend-the-node), `borough` (defend-the-FOLK: friendly
  villagers, a mustered countdown, the arming table, refugees who grow
  Lastlight's population on the BoroughField overlay).

## The waning law (finite clocks)

No event is farmable ad infinitum. Every repeating stream an event runs — a
kill-fed field, an undead pour, a meteor rain — must carry a hard ceiling the
player cannot push back indefinitely, and the ceiling must be VISIBLE (a
hidden timer is unauthorable by omission). Four lawful shapes, pick one
deliberately:

- **The kill-fed field** (Breach, the Mirror Rift — `EncounterDef.timePerKill`):
  kills buy time only from a finite, per-scale well (`scale.maxBonusTime`;
  `bonusUsed` is cumulative and never refills), so the REACHABLE CEILING
  (timer + unspent well) falls at wall-clock rate however hard the field is
  cleared — total life can never exceed `baseTime + maxBonusTime`. The HUD bar
  draws the unspent well as a dim HEADROOM BAND past the fill (it shrinks as
  kills spend it; a dry well has no band), and the moment the well runs dry
  the def's REQUIRED `waneText` floats once. Symmetric dead-knob law: a
  spigot needs a well and a well needs a spigot (`timePerKill > 0` ⇔ some
  `maxBonusTime > 0`).
- **The bounded surge** (Demon Invasion `maxLifeSec`, breach map-tears
  `lifeSeconds` under the clamped severity crank, the deadwake POUR WELL —
  `DeadwakeSurge.pourBudgetSec`, spent only while the tide holds + pours on
  the player's ground, never while roaming; at zero the tide EBBS, unrouted
  and unpaid, with the marker/zone-info reading "faltering" below
  `falterFrac` first): the stream's own config declares the wall.
- **The phase-bound stream** (haunting, longNight, longcandle): the day wheel
  is the ceiling — the pour ends at dawn regardless of play. Recurring nightly
  is lawful; a single sitting is still bounded.
- **The standing condition** (contagion, verminfall, deepwinter, crusade
  territory): a persistent state CURED BY A DEED, not a clock — lawful because
  its per-visit yield is finite placed packs, never a sustained pour. The
  ELDRITCH INCURSION is this shape with a tug-of-war rider: its deed is the
  epicenter Observer (`termination.observer`, materialized at a revealed
  epicenter under the `hybridCleanseObserver` policy — world.ts
  `materializeObserver` + the `eldritch_observer` kill handler →
  `resolveEpicenter`; each kill collapses an epicenter, the last collapses
  the blight whole and its keyed warp + pall recede), and its in-zone pour
  SELF-THROTTLES — every corrupted-foe/eldritch-spawn cull retracts the
  reach by `termination.cleanseRetract`, censused above `spread.growthPerSec
  × eventInterval` so one cull per event beat strictly outruns regrowth: the
  pour is always player-shuttable and the deed always stands. An
  `ambientCapped` archetype must declare NO observer/cleanseRetract (dead
  knobs) and a positive `maxInfluencedZones` (its name's own promise).

A presence-frozen clock (wisplight / straying / drove pause while the player
stands the ground) is lawful ONLY over a finite scene — fixed heads, fixed
lights. Any future change that respawns the scene's bodies must move that
event onto one of the shapes above.

`npm run eventqa`'s `waning` group censuses the encounter framework + the
declared ceilings + the incursion termination (knobs coherent both ways, and
the ignite → cleanse → Observer-deed collapse driven live through the
overlay's own public seams); `npx tsx balance/probe_eventclock.ts` proves the dynamics
on the real engine (a ~180-kills/sec perpetual farm cannot outlive the
authored ceiling; the wane latches once, at the dry well; a roaming tide
spends nothing; a restored tide keeps its spent well).

## The gates

| Gate | What it holds |
| --- | --- |
| `npx tsc --noEmit` | the types, incl. the persistence pledge being present |
| `npm run eventqa` | the ten invariant groups (registry, pledge, gate math, manifest, lifecycle/determinism/restore, fracture divert handoff, ledger contract, zone policy, zone events, the waning law) |
| `npx tsx balance/probe_eventclock.ts` | the waning law's live dynamics (perpetual-farm ceiling, the wane tell, the deadwake ebb) |
| `npm run sim -- baseline check --suite smoke` | combat regression (events off in the arena by design) |
| `npm run genqa` | any generation your event's tilesets/layouts/compositions touch |

Run eventqa after ANY `src/packages/` change. It boots the real WorldSim over
the real starter web with every package forced live, ticks six simulated
minutes, and demands byte-identical determinism plus an exact
snapshot→restore→snapshot roundtrip — if your overlay hides a Map in its
snapshot or forgets a field in restore, this is where it surfaces, not in a
player's save.

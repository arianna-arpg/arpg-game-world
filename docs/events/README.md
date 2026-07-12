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
  `registerBulletinSource` (world notices — faction conquests and crusade
  front-shifts already ride it), `registerKillHandler` (bounties; use
  `Actor.eventKey` to resolve a kill back to its event INSTANCE),
  `registerWorldDrive` (slow meters like vendetta's grudge). All import-time;
  no engine edits.
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
  `EncounterDef` (+ `dimensions` for non-surface placement). Shared framework
  knobs live in `ENCOUNTER_CFG`; per-encounter numbers on the def.

## The gates

| Gate | What it holds |
| --- | --- |
| `npx tsc --noEmit` | the types, incl. the persistence pledge being present |
| `npm run eventqa` | the eight invariant groups (registry, pledge, gate math, manifest, lifecycle/determinism/restore, ledger contract, zone policy, zone events) |
| `npm run sim -- baseline check --suite smoke` | combat regression (events off in the arena by design) |
| `npm run genqa` | any generation your event's tilesets/layouts/compositions touch |

Run eventqa after ANY `src/packages/` change. It boots the real WorldSim over
the real starter web with every package forced live, ticks six simulated
minutes, and demands byte-identical determinism plus an exact
snapshot→restore→snapshot roundtrip — if your overlay hides a Map in its
snapshot or forgets a field in restore, this is where it surfaces, not in a
player's save.

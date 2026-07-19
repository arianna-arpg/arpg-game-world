# The Harborhold Fabric — ports as besieged residences

`data/harborholds.ts` (every dial) + `world/harborholds.ts` (pure resolvers +
the omen source) + the `World` runtime (mint stamp, boot, muster, sweep).
Probe: `npx tsx balance/probe_harborholds.ts`. Dev lens: the **Holds** tab.

## What a harborhold is

A mainland port is no longer a dock and a board on an empty shore. Every sea
spot minted by `ensureSeaPorts` wears a **HARBORHOLD**: a walled quay-town
raised by the ordinary composition pipeline (`harborhold_*` compositions →
plan structures with a **sealed gate**), found **BESIEGED**, opened by
breaking the siege, burned by losing one. Islands and legacy free-docked
ports never carry the state — the isles stay small locales with bare quays,
by design and by construction (they mint outside the sea-spot path).

Two data ladders decide everything:

- **`HOLD_CLASSES`** — what a hold IS: its structure plan, siege tables and
  timers, restore pricing, prosperity cap, service rows, merc band. Add a
  row, get a new kind of harbor town.
- **`HARBORHOLD_CFG.assign`** — WHICH sea class × port tier wears which hold
  class (`pond/lagoon` coves = landings; `sea/great_sea` havens = harbor
  towns; `ocean` havens = freeports). A tier without a row keeps the
  pre-fabric bare quay.

## The state machine (persisted on `ZoneDef.harborhold`)

```
besieged ──muster→ defense ──ward falls──→ fallen ──rebuildSec──→ besieged
   ▲                  │                       │
   │                  └──waves broken──→ open │←──essence restore─┘
   │                                      │
   └────────── recurring siege ───────────┘   (fallAt deadline → fallen)
```

- **besieged** — gates sealed, siege camp pitched at the walls, the muster
  horn on the apron. First-found holds carry NO deadline (an unfound harbor
  is never punished); a returned siege on a won town arms `fallAt`.
- **defense** — TRANSIENT (never persisted; resume folds to besieged — the
  transience law). Discrete waves pour through the extraction swarm
  director's grammar (rim entry, the fixation graft) at the **QUAY WARD**,
  a formula-true life pool planted at the gate. Ward dead = the hold falls;
  every wave broken = it opens.
- **open** — the town lives: gate door open, keeper folk seated at their
  plan anchors, the harbor board INSIDE the walls (the knowledge network is
  the town's reward — hearsay, charts, passage), services by prosperity.
  The sweep schedules the next siege (`siegeEverySec` after a grace).
- **fallen** — fires in the shell (`ruinDress`, deterministic per zone),
  gates sealed, services shut, `rebuildAt` ticking on world time. **Mortal
  Essence** buys the rebuild forward at the wreckage (`holdRestoreCost`);
  either way the hold stands back up besieged — the defense is yours again.

The dock and cast-off NEVER brick: landing at a besieged or burned hold puts
you on the pier outside the walls (the landing law is untouched), and the
dock still sails. Only the town — and its ladder — is earned.

## The patronage ladder (the find-AND-defend incentive)

`prosperity` (0..class cap) climbs +1 per defended siege and drops
`fallPenalty` per fall. **Service rows** activate at rungs (`at`):
harbormaster + board at 0, the chandler at 1, the merc captain at 2 — one
row = one service; unknown ids still seat their npc/doodad, so a future
service is data first and a verb later. Ledger stamps feed the discovery
web: `ports_defended`, `havens_defended`, `ports_lost`, `first_hold_opened`
(unlock fodder for future classes/gems via `reqLedgerCounts`).

## The muster (the defense, end to end)

Horn dwell → the hold panel (muster / restore / standing) → `holdMuster`
intent → the ward plants (`wardLife + wardLifePerLevel × level`, pinned by a
'more' source — exact wherever flat mods sit) → `armSec` countdown → waves:
`batch + perWave×(wave−1)` bodies each, `fieldCap`-honest trickle, drawn
from the class's **tide table** (`PresenceEntry[]` — shore fauna, the
Drowned Court as waters deepen, corsairs where trade is worth robbing) or,
at `mixNative`, the zone's own conquest-aware population. Every body gets
the extraction fixation graft (`highestThreat` + seeded/pulsed threat at the
ward) — the third consumer of the one swarm grammar. Spoils: xp + crackable
`harbor_cache` bodies at the gate. A lost defense lets the victors hold the
ground a while (the shared dispersal fabric), then drift.

## Doors, dress, services (the reconcile discipline)

- **The gate is a DOOR** (`CellSpec.door mode 'sealed'`): `setDoorState`
  opens it live (walk grid repaints, pathing self-heals); `resealDoor` is
  the fabric's inverse (a hold that fell while you sailed shuts again).
  Boot runs AFTER zone-memory door replay — the persisted state is
  authoritative over remembered opens. Live sieges never seal under your
  feet: services shut at once, the gate re-seals on the next load.
- **State dress** rides the weather-dress law: presence derived from the
  `Doodad.holdDress` tag, replanted deterministically (zone seed ^
  `dressSalt` ^ state), dissolved via `evap` on change. Fire kinds arm
  their doodad effects exactly as loadZone does.
- **Services** reconcile on boot and on every transition — spawn the
  missing, retire the surplus (tag `hold_svc:<id>`), plant/remove the
  board, arm the chandler's stock through the one vendor pipeline.

## Mercs (the port market vs the wilds)

The port captain (service `mercs`, prosperity-gated) arms `mercOutpost`
with `port: true`: **template-only offers** (the baseline archetypes — the
"lower tier" that survives the level-normalization contract), reseeded per
`mercRerollSec` window, hired through the one pipeline at the same pricing.
**Veterans and RETIREMENT stay a wilds-outpost exclusive** (`canRetireHere`
refuses ports), and wild outposts got scarcer (`MERC_CFG.outpost.chance`
0.14 → 0.08) — the port is the surefire counter, the wilds are the rite.

## Findability

A hold under a DEADLINE siege registers an omen (`HARBORHOLD_CFG.omen`,
aging wider — the fabric's one findability channel) plus visible-ground
toasts from the sweep. First-found besieged holds stay silent. The zone
chip (⚔ besieged / 🔥 burned / ⚑ open · standing N) and the sail panel's
row tags carry the state everywhere ports surface.

## Cautions

- The town seats via `findSpot` — a pathologically tight arena may honestly
  degrade to a bare quay (warned once per zone; dock/cast-off unaffected).
  The probe pins that a 2+-port sea seats at least one town.
- `defense` is transient BY DESIGN. Do not persist it; do not give waves an
  objective — `canSail()` and the port's `clear` objective must stay true.
- Anything adding a service: one `HoldServiceRow` + one seat char in each
  plan that offers it. The probe fails if a seat char is missing from a
  plan that claims the service.
- State timers are WORLD time (they persist with the save and tick while
  you sail elsewhere — that's the point).

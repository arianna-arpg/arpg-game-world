# The Harborhold Fabric — ports as besieged residences

`data/harborholds.ts` (every dial) + `world/harborholds.ts` (pure resolvers +
the omen source) + the `World` runtime (mint stamp, boot, muster, sweep).
Probe: `npx tsx balance/probe_harborholds.ts`. Dev lens: the **Holds** tab.

## What a harborhold is

A mainland port is no longer a dock and a board on an empty shore. Every sea
spot minted by `ensureSeaPorts` is a **HARBOR PAIR** (`SEA_CFG.pair`,
docs/engine/seas.md): the **HOLD ANCHOR** — ordinary coastal country wearing
the walled **HARBORHOLD** raised by the composition pipeline (`harborhold_*`
compositions → plan structures with a **sealed gate**), found **BESIEGED**,
opened by breaking the siege, burned by losing one — and, through ONE
notarized causeway whose anchor-side exit wears `lock: 'harborhold'`, the
**PORT zone** proper: a kind-`'port'` sealed-shores cove (the harborcove
recipe — deep water, the outcrop, the planked pier, the berth) where the
QUAY VILLAGE holds the dock, the services, and the folk the walls protect.
The state lives on the anchor (`ZoneDef.harborhold`); the port reads it
through `ZoneDef.holdAnchor`. Islands and legacy free-docked ports never
carry the state — the isles stay small locales with bare quays, by design
and by construction (they mint outside the sea-spot path). Legacy saves'
single-zone towns are grandfathered whole.

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
- **THE GATEWORK IS THE GATE** (the harbor pair): the causeway portal to
  the paired PORT repositions at boot onto the plan's own court seat
  (`HARBORHOLD_CFG.quay.gateSeat` — the `q` char every `harborhold_*`
  plan carries, inside the walls). The fort doesn't guard a road to a
  door somewhere else; it CONTAINS the door — break the siege, walk
  through the fort, board the quay (the city-gate read). Live-exit move
  only: the def keeps side/at (map roads + genqa rim invariants
  untouched); a bare-quay degrade keeps the rim portal, still sealed by
  the `'harborhold'` lock. **The arrival law**: walking the causeway
  inland lands at the court portal while the hold stands OPEN; a sea
  arrival under a live siege SKIRTS to the gate apron outside the walls
  (the strand path around the fort — never sealed inside a hostile
  ring, and the muster horn stands right there).
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

## The Company Lane + THE HARBORWARDEN

Hiring is a considered trade now: a blade weighs
`MERC_CFG.partyScaleWeight` (0.5) of a player toward enemy party scaling —
`partyScaleCount()` is FRACTIONAL (coopScale is linear, so partial seats
compose exactly). Four plain stats (grantable by anything) are the levers:

- `mercEase` (0..1) — forgives the blade's scale weight; 1 = the TRUE SOLO
  CURVE with the company beside you.
- `mercRetinue` — extra contracts over `MERC_CFG.maxHired` (the hire gate
  finally reads it; `World.hiredMercs` is a LIST — seats `m0`,`m1`…, the
  save carries `mercenaries[]` with the legacy single field folding in).
- `mercHireDiscount` — price forgiveness (≤90%, never free).
- `mercVigor` — increased life+damage stamped on each blade's own sheet as
  the `'patron'` source at normalization/resync/allocation.

**THE HARBORWARDEN** (`data/vocations.ts`) is the fabric's discovery-web
consumer: a SECRET vocation whose **Mooring Stone** shrine seats on every
OPEN hold (`VocationSiteFilter.harborhold` — the new axis), heard by ANY
class (the Stillmind law), its chain deed-gated on `ports_defended`
(`VocationQuestStep.requiresLedger`). Tree: hire-discount/life/armor
smalls; notables **Fair Company** (mercEase 1), **Iron Company** (mercVigor
0.2), Shared Purse, Warden's Table; keystone **The Free Company**
(mercRetinue 1 — the second blade). Probe:
`npx tsx balance/probe_harborwarden.ts`.

## The plaza services (the ladder's later rungs)

- **THE BOUNTY BOARD** (service `bounty_board`, rung 1; landings are too
  small): dwell to post `HARBORHOLD_CFG.writs.count` writs on the coast's
  LIVING foes — the bounty fabric's own grammar (rarity promotion + minted
  nemesis names + the `bounty_mark` tag paying the standard per-kill
  claim + `bounty_writs_claimed`), farthest-first so writs send you OUT.
  Then the board rests (`writsAt` on the persisted state).
- **THE CHANDLER'S COUNTER** (service `chandler`, rung 1): a REAL second
  vendor — `VendorDef` row `'chandler'` (its own section + title), its own
  `chandlerStock` on the shared restock clock, its own `buyChandler`
  intent. npcRole `'chandler'` keeps Brandt's counter from co-opening.

## The camp watch + the local tide + the badge

- **THE CAMP WATCH** (`siege.campWatch` per class): dormant besiegers
  PLANTED at the siege camp (sentry fabric — tag `hold_camp`, ambient to
  objectives, posts facing the gate, wound-roused as a camp) and DRAFTED
  into wave 1 by the muster (awakened + grafted + counted). Reconciled
  with the state dress; retired quietly when the town stands.
- **THE LOCAL TIDE** (`HARBORHOLD_CFG.tideBiomes`): per-biome seasoning
  rows folded into every siege draw on that coast — a gloaming shore sends
  gloamborn; weights lean light (the sea's kin stay the spine). A new
  coast is one row.
- **THE MAP BADGE**: a `registerMarkerSource` row in `world/harborholds.ts`
  — every KNOWN hold wears ⚔/🔥/⚑ beside its ⚓ (fog `'charted'`), zero
  map-panel edits.

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

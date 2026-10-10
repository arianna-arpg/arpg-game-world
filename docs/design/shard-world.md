# THE SHARD — the hosted world charter v1 (one seed on a server, many accounts inside it)

**Status: DELIBERATION + BRANCH + M0 + M0.5 (2026-10-07).** The branch is
`shard-world` (worktree `D:/Games/Claude/arpg-shard`). HER RULING, the same
day: the MMO lane builds ON THE SEAMLESS FOUNDATION — "an almost
Minecraft/World of Warcraft/Path of Exile/Rimworld monster of a conglomeration
that grants a player infinite build options inside of an account
metaprogression that they can then play alongside other players in an
infinitely expanding world" — so the branch was rebased onto
`origin/codex/seamless-world-foundation` (@ `67d9c290`, the pushed tip; the
live tip moves every half hour and the branch follows that lane's own
pushes). Card 2 is RULED (§7). Everything from M1 on is a PROPOSAL carded
for her word in §7; M0 is the fork-neutral foundation every option needs and
M0.5 proves the foundation's own surface hosts (receipts in §8). Survey receipts are against
`origin/main` @ `bc8a0e0a` and local `main` @ `651d7e05` (the two have
diverged, see §6.4); anchors name files + symbols, line numbers drift. Every
number is unblessed (her standing word).

Her ask (2026-10-07, verbatim-near): "generate a seed of the seamless world
as or on an independent server. Other players can log in and connect to this
server-hosted world. Players share a Lastlight location, and are still
restricted locally by their own account metaprogress, but there is no strict
or specific barrier cross-player. Players play in the same worldspace, can
navigate out and do content, kill monsters, complete quests, build their own
settlements in generated locations that are funded through essence
accumulated during their run; events and other localized occurrences are
basically client-based but are propagated or replicated on the server such
that a player might have an event in a faraway locale. Because the event
doesn't actually generate its content until the player is nearby, only that
particular player would be aware of the event and it would still only
generate when that specific player got near; but upon generation, the content
would be generated for any player that simultaneously ran across it ... some
kind of client and server side communication that then propagates content
cross-client, allowing for a potential multitude of content to occur
simultaneously while also effectively scaling with the player count itself
... at its core ... similar to an MMORPG setup."

> **THE LEAD FINDING, before anything else.** The game is nearer to a server
> than it looks, because four of the five hard things are already built as
> seams: co-op is HOST-AUTHORITATIVE with the client a pure render shell that
> ships intents and predicts only its own feet (`src/net/`, `main.ts`), the
> engine already BOOTS HEADLESS in Node and runs the real frame
> (`src/sim/arena.ts`, the balance harness), the transport is already an
> INTERFACE (`NetTransport`) that the engine never looks behind, and the world
> half of a save is already a SEPARABLE block (`CharacterSave.world`, optional).
> A dedicated server is therefore today's co-op host with the renderer
> removed and a socket where the copy-paste signaling was, and M0 proves that
> with ZERO changes to engine law. The owed work is the fifth thing, the one a
> single host never needed: MANY of what `World` has ONE of. One live zone
> (`this.zone`, 378 `this.player` reads), one account (`this.account`, 243
> reads, THE KEEPER'S GATE), one position that events seat around
> (`simView().currentZoneId`), one save that owns the world. The shape below is
> about multiplying those four without forking the 64,300-line World, and
> about who owns an event when the world has many players in it.

---

## §0 Her vision, restated as laws

| Her words | The law | Where it lands |
|---|---|---|
| "generate a seed ... on an independent server" | **THE HOSTED SEED** — a shard is one process, one manifest seed, one persisted world; players connect to it, nobody hosts from a couch. | M0 (host), M2 (persistence) |
| "share a Lastlight location" | **THE SHARED HEARTH** — one town zone, one tier, everyone wakes there and meets there. | M1 + card 3 |
| "restricted locally by their own account metaprogress, no strict barrier cross-player" | **THE SEAT'S GATE** — every account-gated read resolves against the seat's OWN account; nothing gates on another player's. The account stays the player's (THE HOME LEDGER). | M2 |
| "same worldspace ... navigate out and do content" | **THE SIM UNIT** — a zone is the unit of simulation, interest and parallelism; a seat walks between units, a party is social, never a sim constraint. | M1 |
| "build their own settlements in generated locations funded through essence" | **THE SETTLEMENT** — a claimed wild zone wearing the town ladder's own site grammar, raised with run essence, persisted by the shard. | M4 |
| "events ... client-based but propagated ... only that player aware ... generate when that player got near ... then there for anyone" | **THE OWNED TENANT** — personal-scale events belong to an account: seated by it, murmured to it alone, MATERIALIZED when it enters, then standing for everyone present. World-scale events stay the world's. | M3 + card 5 |
| "a multitude of content ... scaling with the player count" | **THE SCALING LAW** — content multiplies per owner (each account carries its own tenants), and compute multiplies per unit (units are independent and parallelizable). | M3, M5 |

---

## §1 Receipts — what already stands (the survey)

**The transport seam.** `NetTransport` (`src/net/transport.ts`): host/join,
`sendInput`/`drainInputs`, `sendState`/`onState`, `sendZone`/`onZone`,
peer roster, `sendSession`/`onSession`, `onHostLost`. Two implementations,
`LocalTransport` (single-player IS host-with-one-seat) and `WebRtcTransport`
(star, one reliable-ordered DataChannel per peer, JSON, manual copy-paste
signaling, STUN-only, no host migration). Wire messages: `join`,
`welcome{self,peers,seed}`, `input`, `snap`, `zone`, `pjoin`, `pleave`,
`session` (`webrtc.ts` `NetMsg`). The host keys inputs by the CHANNEL's seat
binding, never the seat a client claims (`setupHostChannel`). THE SEED THREAD:
the welcome and every `newRun` carry the host's manifest seed so the shell
world agrees with the authority from frame one.

**The host frame** (`main.ts` ~1874-1905, mirrored verbatim by the sim runner
`src/sim/runner.ts` ~191-200): poll every seat's `PlayerInputSource` into the
transport → `world.applyInputs(net.drainInputs(), dt)` → drain client meta
actions (`world.applyAction` inside a try/catch, the load-bearing DoS guard)
→ `updateAI(a, world, dt)` per actor (AI lives OUTSIDE `World.update`) →
`world.update(dt)`. Then, only on a real wire with >1 peer: the zone message
once per zone change, the META HEARTBEAT re-dirtying every seat each 1.5 s,
and `broadcastSnapshot()` at `STATE_HZ` 20. The host's `dt` is
`min(0.05, frame)`; the sim's is a fixed 1/60.

**The render shell.** A client builds a full `World` from the host's seed and
ITS OWN account (`startAsClient`), `createPlayer`s a stand-in, sets
`clientSeatId` + `clientActionHook` (meta mutations become `session action`
intents), and per frame applies the latest snapshot interpolated prev→latest
(`applySnapshot`, pooled stand-in Actors by host id, renderer untouched), then
`predictOwnHero` replays unacked inputs through the real `moveActor` against
the replicated walk grid. It runs no sim. Snapshot contents: every actor in
the zone (`ActorW`, ~60 optional cue fields), projectiles, drops, orbs, texts,
flashes, seats (`SeatW`), per-seat `seatMeta` deltas, the vendor shelf, and
the 20 Hz self-healing reconcile sets (doors, hollows, annexes, wells, lanes,
lite, felled, gloom). Full state, no interest management, one string for all
peers (`fanOut`, drops a peer whose buffer passes 1 MB).

**Measured on the headless engine** (scratch rigs, this pass; the arena is
`makeSimWorld`, the wild zone is the Crossroads off the starter web):

| rig | actors | tick (60 Hz) | snapshot | zone msg |
|---|---|---|---|---|
| arena, 1 seat | 1 | 0.63 ms | 44.3 KB | 0.3 KB |
| arena, 4 seats | 4 | 0.38 ms | 48.3 KB | 0.3 KB |
| crossroads, 4 seats, fresh | 12 | 1.85 ms | 52.3 KB | 16.7 KB |
| crossroads, 4 seats, settled | 12 | 1.05 ms | 52.3 KB | 16.7 KB |

Of those 44-52 KB, **43.7 KB was `memoryAccess`** (the host account's
`memoryAccessView`, re-sent every tick); actors + seats + vendor are ~1 KB.
THE WIRE DISCIPLINE's first row landed the same day: the view rides every
30th snapshot and a client keeps the last one, so a quiet snapshot is 1.6 KB
(a chip for main's own lane stands beside it). A small zone sim costs about one
millisecond a tick: a core comfortably runs a dozen quiet units at 60 Hz.

**The three layers inside one World.** `World` is at once (a) THE ZONE SIM —
`zone`, `actors`, `doodads`, the arena, every in-zone sweep in `update()`;
(b) THE WORLD SIM — `sim: WorldSim` (overlays, clock, factions, weather), the
chart (`zoneMap`, `caveMap`, `nextGenId`, the forechart halo, `updateOmens`,
`updateWebSettle`), quests, odyssey, harborhold lifecycle, the world ledgers
(vendor holds, bounty slate, merc sheets); (c) THE SESSION — `seats`,
`localSeat`, the one `account`, saves, run lifecycle (`gameOver`, modes,
`concludeWipe`). `loadZone` swaps (a) wholesale: captures the leaving zone's
memory, keeps exactly the seat bodies + their minions, regenerates the layout
from `memory?.seed ?? def.seed ?? rollSeed()`, spawns biased packs, restores
remembered enemies/contents, then runs every zone runtime's `enter()` — and
`materializeLiveZoneEvents` re-fires those `enter(zone, live=true)` hooks every
frame for the standing zone, so an overlay that lands mid-visit stands up in
place. **Events are already lazy by construction**: an overlay is a pure field
over the graph (`WorldOverlay`, `src/world/overlay.ts`), ticking on the world
clock with its own seeded stream; its in-zone bodies exist only where a zone
runtime materialized them. THE TRANSIENCE DOCTRINE (`docs/engine/transience.md`)
makes every event a tenant that reverts.

**Persistence.** `CharacterSave` = build + carry + mode + run ledger +
`expedition` (the frozen manifest, seed inside) + an OPTIONAL `world:
WorldStateSave` (`src/meta/worldstate.ts`: every ZoneDef verbatim,
`nextGenId`, `time`, `visited`/`surveyed`, zone memories incl. a live capture
of the zone underfoot, quests, the player spot, the per-overlay snapshot bag,
merc sheets, vendor holds, charts bought, the bounty slate, odyssey, portals).
`World.serializeWorldState()` / `adoptWorldState()` already produce and
consume that block standalone; a couch guest's vessel is already serialized
WITHOUT a world (`serializeCouchGuest`) and grafted onto a seat with
`rebuildSavedMeta` + `adoptSeatMeta` — the exact shape a server-side login
needs. Saves reach disk through `/__save/:slot` (the Vite plugin and
`launcher/server.cjs`, same routes). About 21 direct `saveCharacter`/
`saveAccount` calls live inside World; every one is already gated off a net
client (`clientActionHook`).

**Determinism.** Biome/level/climate/relief/atlas fields, the starter web,
each overlay's stream and every directed mint are pure functions of
`manifest.seed`. **Ordinary frontier mints are not**: `placeZoneAt` with no
spec seed draws `rollSeed()` off `Math.random` and depends on mint order
(`worldgen.ts` ~1227, ~1711, ~1885). So a client can never grow its own copy
of the map; the chart has to be SENT (today a client's map silently diverges
past the starter web, a known co-op gap). Layout IS pure given
`(def, layoutSeed)`; population is not. Process-global state the engine
installs at boot: `nextActorId` (`actor.ts`), item `uidCounter`
(`itemgen.ts`), the relief/atlas seeds and climate origin (installed by the
`WorldSim` constructor), the bag/container board sources and the route guard
(installed by the `World` constructor). One process therefore hosts ONE seed;
several Worlds of the same seed in one process are fine.

**Accounts in co-op today (THE KEEPER'S GATE).** Every account-gated read
rides the host's account: vendor shelves/gates/holds, drop pools, town tier
and stations, bounty board existence, caravan/ships/campfire/dummy, bag and
container boards, package config, odyssey seeding. The snapshot mirrors the
verdict bits (`vendorCap`, `vendorTradeOpen`, `vendorGemsOpen`, `bagBoard`,
`containerBoards`, `memoryAccess`). A client's own account decides only its
class pick, cosmetics and the Vault/Wardrobe screens. A remote seat is a fresh
level-1 mortal with no kit, saves NOTHING, and its kills and drops stamp the
HOST's bestiary, boss tally and gem-drop index. Lastlight's size and buildings
come from `townTier(account)` (0/2/5/8 owned station features → hamlet/
village/town/township, `data/townBuild.ts`) and only ever grow; residents gate
on the account's `souls_sheltered`.

**The seamless branches.** Two exist and are NOT one lineage:
- `seamless-world` @ `75333fd2` (parked 2026-08-15, 33 ahead / 407 behind):
  zones embedded at map seats on a 32 px/unit scale, a fitted-cell partition,
  connective tissue, a ring of resident mints around ONE active zone, drowsy
  neighbours in the same actors array, a full `loadZone` rebase at the
  threshold. Solo-only (the mode refuses a net session, refuses saves).
- `codex/seamless-world-foundation` @ `86c4a331` (LIVE, ~180 ahead / 23 behind
  origin/main, commits landing every 20-40 minutes, ~570 new files, world.ts
  +2,971/−6,906 as `loadZone`, `createMonster`, `hostileTo`, `clampPos`,
  `groundAt`, `kill`, population, objectives and theater move out into
  `src/worldmass/` + `src/engine/native*` owners): THE UNBROKEN WILDS — the
  whole surface is ONE synthetic boundless ZoneDef (`worldmass_expedition`),
  terrain streamed as 960-unit pages (5×5 resident), 64-bit cell addresses, no
  `loadZone` while walking, natives within 1300 units capped at 96 bodies,
  `MassDormancy` freezing settled bodies to records, caves/side areas still
  DISCRETE pockets entered through classic `loadZone`. Its own foundation doc
  records an MMO-style persistent shared world as an architectural
  REQUIREMENT ONLY, puts co-op at step 6, and states `ZoneMsg` "cannot be
  fixed by renaming zoneId to chunkId" (region subscriptions are the planned
  shape). Nothing worldmass-specific is on its wire.

---

## §2 The gaps (honest)

1. **One zone per World.** `this.zone` is the sim; `this.player` (378) and
   `this.localSeat` (164) are the camera, the dwell clocks, the warband
   standoff, the overlay view's `currentZoneId` and `charLevel`. A party
   teleports together on `loadZone` ("teleport together" is the shipped
   policy; leader/vote/instance deferred). Twelve overlays `pickSeat` from
   ONE position; `hunt.ts` reads `currentZoneId` 22 times.
2. **One account per World.** 243 `this.account` reads; the town is built
   from it; the bag board source is a process global folded from it; the
   client's shell builds its OWN town from its OWN tier and draws the host's
   terrain over it (a standing mismatch).
3. **Events have no owner.** They are world-global, seated around the host,
   persisted in the host character's save bag, and a remote player's deeds
   feed the host's account.
4. **The wire** is full-state JSON at 20 Hz with no interest management, a
   43.7 KB constant row, no authentication, signaling by hand, no host
   migration.
5. **Persistence** owns the world through one character; a remote seat
   persists nothing; World saves to disk itself in ~21 places.
6. **Process globals** pin one seed per process; `nextActorId` is
   process-wide (fine inside one shard, a fact for worker threads).
7. **Settlements do not exist**; town growth is physical and account-gated;
   the campfire lets one player clear zone memory world-wide.
8. **The seamless fork** is a single World with no spatial partition and a
   96-body cap; the only pockets it keeps discrete are caves and side areas.

---

## §3 THE SHAPE — the architecture

```
  CLIENT (per player, the game as shipped)         THE SHARD (one process, one seed)
  ┌──────────────────────────────┐    WebSocket   ┌────────────────────────────────────────┐
  │ render shell World           │◄──────────────►│ THE DESK  (src/server/shardHost.ts)      │
  │ own ACCOUNT (THE HOME LEDGER)│  join/welcome  │  connections ⇄ seats, claims, deltas     │
  │ own hero save (THE VESSEL)   │  input / snap  │  ShardTransport implements NetTransport  │
  │ prediction of own feet       │  zone / session│──────────────────────────────────────────│
  │ map = what the shard sent    │  chart / omens │ THE KEEPER  (one World: chart + WorldSim │
  └──────────────────────────────┘                │   + clock + tenants + world ledgers;     │
                                                  │   its zone = the hearth; seat p0 = the   │
                                                  │   KEEPER SEAT)                           │
                                                  │──────────────────────────────────────────│
                                                  │ THE SIM UNITS (one World per live zone,  │
                                                  │   sharing the keeper's chart by          │
                                                  │   reference; seats hand off between them)│
                                                  │──────────────────────────────────────────│
                                                  │ shard.json (world) · account mirrors     │
                                                  └────────────────────────────────────────┘
```

### 3.1 THE HEADLESS HOST LAW (M0)
The shard IS today's co-op host with no renderer: `bootSimEngine()` (the same
side-effect registrations main.ts performs, content validated), a real
expedition manifest (packages ENABLED, unlike the quiet sim arena), `new
World(account, manifest)`, the host frame verbatim at a fixed 60 Hz, the zone
message on change, the meta heartbeat, snapshots at 20 Hz, meta actions
drained through the try/catch. `ShardTransport` implements `NetTransport` in
the host role over WebSocket and speaks `webrtc.ts`'s `NetMsg` grammar
verbatim, so a client needs only `WsTransport` (the client role of the same
grammar over the browser's native `WebSocket`) and one lobby row. M0 therefore
changes no engine law and inherits every co-op semantic unchanged: party
travel together, a fresh level-1 hero per join, the keeper's account behind
every gate. That is the honest floor; §4 lifts it in order.

### 3.2 THE KEEPER SEAT
A World cannot stand without `localSeat` (`createPlayer` mints p0; `removeSeat`
refuses it; `this.player` is read 378 times). On a shard p0 is THE KEEPER: a
parked hero body in the hearth, untargetable, passive, invisible to monsters,
EXEMPT from party scale (`partyScaleCount`), from XP grants, from the revive
dwell, from the all-down terminator and from every account-feeding seat
(`accountSeat`), and absent from the wire. The seam is one `Seat.keeper` tag
(token `keeperSeat`) read at those five gates; nothing else notices. It is
NOT a stopgap to be refactored away wholesale: it is what the world-level
reads address when no player is near (the forechart halo grows around the
hearth; `charLevel` mirrors the highest connected seat each tick). THE
WARDEN IS NO BODY (after the first critique): its hands take nothing, it has
no shoulder, it is invulnerable, it is never kept down, and THE SEALED ROADS
keep it from ever dwelling (a seat that acted this frame is never idle) so no
mouth, portal or station fires off its standing — roads that would move the
whole party stay shut until per-seat travel exists. THE NEAR LAW
(`COOP_SCALING.shareRadius`, the shard's `nearRadius`) scopes a kill's XP,
an enemy's party scale and the mercy to the seats within reach: a continent
apart is no party (card 8, ruled). M1 retires
individual `this.player` reads only where a per-seat read is the honest one
(dwells, travel, warband standoff), never by removing the seat.

### 3.3 THE SIM UNIT (M1)
*The implementation plan, anchored to the tree at 4b2ee251 with every world-level field classified, the hand-off order, the road catalog, the wire per unit, the probes and four build waves, is docs/design/shard-m1-plan.md (2026-10-09). Where that plan and this sketch differ, the plan is the law: THE PIN replaces the one-time alias, every unit stands its own warden, roads emit TICKETS the host executes after all units tick.*

One `World` per live zone. The keeper's World owns the chart; every other
unit ALIASES the keeper's world-level objects by reference (`zoneMap`,
`caveMap`, `visited`, `surveyed`, `discoveredWaypoints`, `zoneMemory`, `sim`,
`activeQuests`, the vendor holds, the bounty slate, the merc sheets, …) and
syncs the scalars (`time`, `nextGenId`) each tick; `update()`'s world-level
block (`sim.update`, `updateForechart`, `updateWebSettle`, `updateOmens`,
`updateDeedRecovery`, `sweepClassClaims`) runs in the keeper ONLY — one gate
on `shardWorld`. THE DERIVED CENSUS pins the alias list: a probe iterates
World's own fields by shape (Map/Set/Record keyed by zone id, the sim, the
ledgers) and refuses a world-level field no alias row names, so a field added
next month is aliased, marked, or named unit-local the day it is written
(the probe_tiers RIG T idiom). A unit WAKES when a seat heads for its zone
(`loadZone` on a fresh World, the standing boot), SLEEPS after `unitLinger`
seconds with no seat (its zone memory captured exactly as a departure does
today), and the hearth never sleeps. Travel is a HAND-OFF, not a teleport:
`detachSeat` lifts the seat's hero + its minions out of unit A as live Actor
objects (identity-stable, the loadZone carry filter's own set) and
`attachSeat` lands them in unit B at the entry — the couch guest's
serialize/adopt pair is the slow path for a cold unit on another thread.
Each unit serializes its own snapshot to ITS seats; the zone message goes to
a seat on attach. Party-follow dies: a party is a social overlay (shared XP
and loot radius inside one unit, the existing coop rules), never a reason to
move a body. Enemy scaling counts the seats IN the unit.

### 3.4 THE CHART IS THE SERVER'S
Clients never mint. The keeper ships the KNOWN graph to each seat as ZoneDef
rows (the `WorldStateSave.zones` shape, already pure JSON), filtered by THE
KNOWLEDGE LAW per seat (what that seat has walked, surveyed, been shown — a
per-seat `visited`/`surveyed` beside the world's), plus the direction rows
the map draws; the client's shell world adopts them (`adoptWorldState`'s
tolerant rebuild) and draws the map it was given. The forechart halo,
soundings, omens and reveals are keeper work; a reveal is a wire row.

### 3.5 THE SEAT'S GATE (M2)
Every account-gated read resolves per seat: `accountOf(seat)` returns the
seat's CLAIM (a sanitized `Account` the client sent at login: features,
unlocks, ledger, reliquary, cosmetics, kit picks, craft lore, corpse ring,
sagas) or, for the keeper, THE SHARD ACCOUNT — the world's own ledger (the
hearth's tier, community stamps). The 243 reads are classified once
(world-owned / seat-owned / split, the table in §5) behind one resolver, and
the bag/container board sources become seat-scoped. Writes go the other way
as THE ACCOUNT DELTA: `bumpAccountLedger`, feature grants, unlock sets,
reliquary moves, corpse-ring entries and essence credits for a seat are
queued on the seat and shipped as `session accountDelta` rows the client
folds into its REAL account and saves (THE HOME LEDGER: the server computes,
the client owns). Trust is a dial: `claim` (a friends' server trusts the
claim, M2), `signed` (an account service signs claims and deltas, later),
`held` (the shard keeps the accounts, later). THE VESSEL: a hero logs in by
uploading its `CharacterSave` WITHOUT a world (the couch guest shape); the
shard grafts it (`rebuildSavedMeta` + `adoptSeatMeta`), serializes it back on
the autosave beat as `session heroSave`, and keeps the last mirror per account
to refuse an older upload (soft anti-rollback). A mortal death ends the seat's
run on the client (reckoning off the deltas) while the world persists; an
Immortal vessel respawns in the hearth per its stage; corpses are placed in
the shard's world keyed by account, so a corpse run spans sessions.

### 3.6 THE SHARED HEARTH (card 3)
One Lastlight, one tier. Proposed: the town's PHYSICAL layout follows THE
SHARD ACCOUNT (grown by the community: a station any seat unlocks on its own
account also grants it to the shard — max-of-all-players, which fits the
existing "only ever grows" rule), while a station's USE is gated per seat
(the per-seat read: a smith you have not earned refuses you, in the counter's
own refusal words — her "restricted locally by their own account
metaprogress"). Residents gate on the shard's `souls_sheltered`. The town
re-lays only at unit wake, never under standing feet; a shared hearth never
empties, so growth lands at the next quiet beat or with a live stamp (the
weather-dress idiom: plant, never move). The campfire's world-wide memory
refresh becomes a per-seat clock or a shard-level cooldown (card).

### 3.7 THE OWNED TENANT (M3, card 5)
Overlays split by SCALE, as data on the package row (`ownership: 'world' |
'account'`): world-scale fields stay SINGLETONS (invasion, crusade,
deepwinter, contagion, faction territory, weather, long night, gloaming, hell
war, world bosses, titans); personal-scale fields are instantiated PER
CONNECTED ACCOUNT (hunt, haunting, brigands, straying, drove, wisplight,
longcandle, verminfall, fractures, quickening, bounty expeditions …), each on
its own stream (`packageSeed(manifest.seed ^ accountSalt, id)`), ticking with
a view centred on ITS owner's position and level, seating through the same
`pickSeat` envelopes. Awareness is the owner's: its omens, map pins, board
rows and notices go to its seat alone. MATERIALIZATION is the unit's: when
the owner enters a zone, that owner's zone runtimes `enter()` there (the
hooks already take the zone and fire idempotently) and the bodies stand in
the shared unit for everyone present; an owner arriving at a unit others
already stand in materializes LIVE (the `materializeLiveZoneEvents` path).
Bodies outlive the owner's presence (zone memory banks them like any
population); completion is by anyone present with rewards to participants
and the objective credited to the owner (card: THE CREDIT LAW). Durable
per-account fields persist in `shard.json` keyed by account id.

### 3.8 THE SETTLEMENT (M4, card 7)
A claimable wild zone (a landmark/feature-flagged seat) wears
`ZoneDef.settlement { founder, tier, stations[], treasury }`, raised at a
claim marker's dwell by paying run essence through `spendMortalValue` (the
mid-run service price lane), growing on a SHORT LADDER (camp → hamlet →
village) over the town ladder's own site grammar (`TOWN_SITES`/`TOWN_TIERS`
generalized to a plan recipe keyed by the zone's own layout), re-laid at
unit wake. It rides `WorldStateSave.zones` verbatim (ZoneDefs are pure data)
and so persists for free. Access policy (founder-only / company / public),
what a settlement's stations ARE (a bench, a stash, a board, a portal
anchor), and whether settlements can fall (raids on the harborhold model)
are cards.

### 3.9 THE WIRE DISCIPLINE
JSON over one WebSocket per seat (reliable-ordered, the DataChannel's exact
semantics — every existing wire assumption holds). Per-unit snapshots to the
seats in that unit; account-derived views (`memoryAccess`, boards, verdicts)
ship ONCE per seat and on change with a slow heartbeat (the meta-delta
lesson: a dropped one-shot is a permanent desync, so the heartbeat stays);
later: viewport culling of `ActorW` rows per seat, per-row deltas, a binary
codec — all behind `serializeSnapshot`, none required to play. Backpressure
drops frames per connection, never the loop. TLS terminates at a reverse
proxy or `node:https` with a cert path (dial). Authentication is the claim
tier (§3.5).

### 3.10 THE PROCESS LAW
One shard = one seed = one process. Units are independent by construction
(they share the chart by reference and exchange bodies only through the
hand-off), so M5 moves units onto `worker_threads` — each worker boots the
engine (same seed re-installs the same global fields), owns K units, and
talks to the keeper thread in three messages: hand-off (the couch-guest
serialize/adopt pair), chart rows (new mints as ZoneDef JSON), overlay views.
`nextActorId` being process-wide means cross-worker ids wear a worker prefix
on the wire; the client already pools by host id.

### 3.11 THE SOLO INVARIANT
No shard → byte-identical. Every seam gates on `world.shardWorld` (a nullable
pointer the shard installs); `LocalTransport` play never constructs it, the
WebRTC lane never constructs it, and the probe census refuses an un-gated
seam. Co-op stays co-op; the shard is a third lane beside it.

### 3.12 THE UNBROKEN WILDS (M0.5 built; the partition is M6)
The seamless lane's surface is one continuous World. The shard HOSTS IT
TODAY: `npm run shard -- --worldmass` stands the keeper at the hearth and
then starts the mass runtime under it (`World.startWorldMass`, main.ts's own
order), the runtime's workers fall back headless by its own design
(`typeof Worker === 'undefined'`), and the measured boot is ~3 s with the
surface ticking at ~10 ms a tick with 38 natives alive and no faults (§8).
Under the shard it is one SIM UNIT whose zone is the whole surface (vertical
scale only) with every pocket (cave, side area, dimension) its own unit —
the pockets still enter through classic `loadZone`, so hand-offs land there
unchanged. Horizontal scale on the surface needs a REGION PARTITION
(page-block units with a hand-off band and ghost bodies near the seam) —
the "region subscriptions" that lane already names as its step 6; the
`SimUnit` seam (§3.3) is the one place it plugs.

THE LAND IS THE SEED'S, THE LIFE IS THE SERVER'S — BUILT (M0.6, the same
day; `src/net/wildsClient.ts`). On the wilds the terrain (pages, roads, the
hearth's lay) is a pure function of the seed plus the hearth's tier, so the
render shell MINTS the ground it stands on locally: on a welcome that says
`worldmass: true` the shell builds its World with the SHARD's town features
(the welcome carries them — the one thing the seed alone cannot pin) and
starts the mass runtime in RESTORE-ONLY posture, which births nothing and
runs no sim; every frame it streams terrain pages around its own hero with
the runtime's public pieces (the body of `WorldMassRuntime.update`'s
streaming block, since the runtime exposes no stream-only entry), keeps the
sky on the shard's clock and lets the map remember what the hero saw. Every
body, drop and doodad rides the wire exactly as a classic client's do. Two
laws the zone message would break are held in the shell: `applyZone` nulls
`world.walk` (a `MassWalk` is not a packed grid), so the shell re-seats the
runtime's walk after every zone message and prediction clamps on the real
ground; and a POCKET (a native cave, a side area) arrives as an ordinary
zone id, so the shell parks its runtime for the pocket and re-seats the same
one when the surface returns (THE RUNTIME SURVIVES POCKETS, §7e: the survey,
the page cache and the runtime outlive every cave; the boot it used to repeat
on every climb-out took seconds). Server side, two laws the single-focus runtime needs:
THE SHADOW (the runtime streams, births and dwells around `world.player`,
the keeper on a shard, so on the wilds the keeper's body shadows the FOCUS
SEAT — the first standing player — `shadowOffset` px behind it every tick;
one focus is the sim-unit gap M1 closes, and players far from the focus meet
cold ground) and THE DRESS BEAT (the zone message is the one-shot carrier of
doodads and the wilds GROW them as the focus walks — ecology, sites, native
scenery — so a changed doodad roster re-ships the zone message, at most once
per `dressSec`). Persistence is no longer open (THE WILDS SAVE, the same day;
`server/wildsSave.ts`, §8): a wilds shard writes its own
`shard_<seed>_wilds.json` on the classic beat, because `serializeWorldState`
already embeds the mass half (`MassAdventureSave` live or from a pocket, plus
the pockets the surface minted), and `resumeWilds` stands it back up in the
mass lane's own Continue order with the keeper waking at the hearth, before
the shard answers a socket or steps a frame (THE RESUME LAW, `ready()`); the
vessel and corpse records persist beside it. Still open on the wilds:
native-feature grid edits the server makes do not reach the shell's walk (a
wall the server blocks is open to prediction until the ack lands), and the
HUD's local site name reads a private runtime map the shell never fills.

---

## §4 Milestones

| M | Name | Builds | Engine seams (tokens) | Gate |
|---|---|---|---|---|
| **M0** | **THE HEADLESS HOST** (this pass) | `src/server/shardHost.ts` (boot, frame, persistence beat), `shardTransport.ts` (host role over WS), `src/net/wsframe.ts` (RFC 6455 server codec, zero deps), `src/net/ws.ts` (client `WsTransport`), `scripts/shard.ts` (`npm run shard -- --port --seed`), lobby row "Join a server" | `keeperSeat` (5 one-line gates) | `balance/probe_shard.ts` (in-process shard + a Node `WebSocket` client: welcome, zone, snapshot, input moves the hero, action applies, leave despawns, keeper exempt) |
| **M0.6** | **THE WILDS ON THE WIRE** (this pass) | `src/net/wildsClient.ts` (the shell's inert runtime, streaming, zone law, pocket law), the welcome's `features`, THE SHADOW and THE DRESS BEAT on the shard, THE WIRE DISCIPLINE's first row (`WIRE_CFG.memoryAccessBeat`) | main.ts client lanes (`clientWilds`), snapshot.ts (the beat) | probe_shard P (shadow, welcome features, inert attach, frame agreement, zone law, life from the wire, streaming, mass-walk prediction, the pocket round trip, the dress beat) |
| **M0.5** | **THE UNBROKEN WILDS, HOSTED** (this pass) | `--worldmass` on the shard (`ShardHost.worldmass`, `startWorldMass` under the keeper, the welcome's `worldmass` flag), `Host Shard.bat` | none | probe_shard K (the runtime stands, ticks faultless, a joiner rides the surface snapshot) |
| M1 | THE SIM UNITS | unit registry, wake/sleep, `detachSeat`/`attachSeat`, per-unit snapshots, the keeper's world sweep, multi-presence `simView`, the chart on the wire. W1 THE UNIT FABRIC BUILT 2026-10-09 (branch shard-m1-units, plan docs/design/shard-m1-plan.md): THE ALIAS CENSUS and THE PIN (`engine/shardUnits.ts`), THE PRIMARY GATE, THE HAND-OFF (`detachSeat`/`attachSeat`, THE FILTERED HOST), the registry with THE WAKE, THE LINGER, THE SOFT CAP and THE UNIT BREAKER (`server/simUnits.ts`), THE UNIT WARDEN and THE UNIT SHADOW, the wire and the desks per unit, THE PERSIST CAPTURE and THE RUN ROW, the direct `travel` door. W2 THE ROADS PER PLAYER BUILT 2026-10-09 (branch shard-m1-roads): THE LIFT (the road scans as named World methods; W1's solo digest and the co-op host's, both taken before the lift, print unchanged), THE SHARD SCANNER (`engine/shardRoads.ts`: one road dwell per seat, read with its own body), THE SEAT'S DOOR (THE RETREAT LAW per seat), THE SEAT'S LADDER and THE EXIT GRACE, the tickets of the road catalog (exits and frontiers, cave mouths classic and wild, the climb-outs, the far span mouth, the town portal both ways, the caravan, the new waypoint intent; the town portal and caravan intents unsealed), the sealed roads' words on the seat's own row, and the road ring (`SeatW.rd`). W3 THE WORLD SWEEP BUILT 2026-10-09 (branch shard-m1-sweep): THE SPLIT DISPATCH (`World.atZone`'s shard branch and the registry's `dispatch`, the keeper draining each world queue once and its zone half landing in the unit standing there: warband arrivals, haunt dissolutions, the harborhold lifecycle and its muster belt, deadwake ebbs; world-boss mints, the Long Night's world chores, the quickening's stamps, the bounty watch and the gloaming's edge the keeper's alone; the bloom's local term per unit; bulletins gated on a plane heard by its seats), THE OCCUPIED LAW (`presentZoneIds`, `censusByZone` and the five readers), many origins (the forechart's round-robin, the omens, the floating roads, the conclave's ignite level), the acting seat's audience across units, and THE LINGER FREEZE (`UNIT_CFG.freezeLinger`). W4 THE MUSTER RING, THE REALM ROADS AND TENANCY BUILT 2026-10-10 (branch shard-m1-muster; card 15 B's detail and card 25 RULED that day as built): THE MUSTER RING (`server/muster.ts`, `MUSTER_CFG`: a party member's road waits at a ring on the road while another member stands in its unit, any member raising it, 400 px, 20 s; it fires when every member standing there stands on it, else at the wait with whoever does; the raiser walking off or the party dissolving lapses it; the road makes each member's ticket and the party lands together in one unit; the `mu` row and its painter, gold for the party and faint for a stranger, no word), THE REALM ROADS (the seven realm functions split into a prep half in the source and a first wake in the realm unit, solo running both in the old order: THE REALM-WALK DIGEST pinned before the split holds; a dimension's crossing on the Unbroken Wilds keeps its sealed word) and TENANCY (`tenancy: 'party'` on a sidezone or an arena keys a unit per party, THE INSTANCE FORGETS: no shared memory read at the wake or written at the sleep, the clears its own). M1 COMPLETE (the chart on the wire stays its own pass, M1.5) | `shardWorld` (sweep gate, alias adoption, hand-off, split dispatch) | probe: two seats in two zones at once; byte-identical solo (`probe_shardunits.ts`, W1's sections A to E and I, THE ROAD-WALK DIGEST; W2's F and H and the co-op host's digest; the wilds pocket road in `probe_shardslow.ts` S; W3's section J, THE SWEEP-WALK DIGEST; W4's G (the muster and tenancy), K (the realm roads) and B's THE REALM-WALK DIGEST, the wilds' sealed crossing in `probe_shardslow.ts` S) |
| M2 | THE SEAT'S GATE | account claims, `accountOf(seat)`, the 243-read classification, account deltas, hero upload/mirror, `shard.json` | `shardWorld` (the resolver) | probe: two claims, two gates, deltas land home |
| M3 | THE OWNED TENANT | `ownership` on package rows, per-account overlay instances, per-seat omens/map, materialize-on-owner-entry, credit law | `shardWorld` (sim instancing, runtime scoping) | probe: A's hunt invisible to B until A arrives; then shared |
| M4 | THE SETTLEMENT | claim markers, the short ladder, treasury, persistence | data + one landmark builder | probe + genqa |
| M5 | THE SCALE | culling, deltas, worker units, soak | none new | soak report at N seats |
| M6 | THE UNBROKEN WILDS | worldmass as a unit; region partition with the seamless lane | shared | the seamless lane's own gates |

---

## §5 The account classification (M2's table, started)

| Read | Owner | Why |
|---|---|---|
| town tier, station buildings, residents (`souls_sheltered`) | **shard** (community max) | one hearth, one layout; §3.6 |
| station USE gates (`features`: salvage, board, oracle, tracker, caravan, campfire, dummy, Mireille) | **seat** | her "restricted by own metaprogress" |
| vendor shelf roll, restock beat | **shard** (the counter is the world's) | THE BEAT LAW is a world clock |
| vendor trade gate, gem case, reserve capacity, standing order | **seat** | the Vault investment is the player's |
| bag board, container boards | **seat** | the board is the body's |
| drop pools (`isSkillUnlockedForDrop`) | **seat** (the killer's / the finder's) | discovery is per account |
| gem-drop index, bestiary, boss tally, `zones_explored` | **seat** (credited killer / arriving seat) | THE ACCOUNT DELTA |
| corpse ring | **seat**, placed in the shard world | corpse runs span sessions |
| odyssey seeding, package config (`manifest`) | **shard** | the expedition is the world's |
| nemesis `sagas` | **split**: the grudge is the seat's, the body stands in the shard | card |
| merc roster / sheets | **split**: sheets are the world's, the roster the seat's | the muster-roll law |
| campfire refresh | **shard** (cooldown) or per-seat clock | card |

---

## §6 The non-contamination protocol (how this lands beside everything else)

1. **Base and branch.** `shard-world` sits on
   `origin/codex/seamless-world-foundation` (her ruling; first cut from
   `origin/main` @ `bc8a0e0a`, rebased the same day with zero conflicts).
   Rebase onto that lane's PUSHED tip at every landing — never its local tip
   (its unpushed commits are not this branch's to carry) and never local
   `main` (see 6.4).
2. **New files first.** All shard code is new files (`src/server/**`,
   `src/net/ws.ts`, `src/net/wsframe.ts`, `scripts/shard.ts`,
   `balance/probe_shard.ts`, this charter, `docs/engine/shard.md`). Shared
   files take ONE small seam each, every hunk carrying a declared token
   (`shardWorld`, `keeperSeat`, `WsTransport`, `probe_shard`); the ownership
   gate runs before every commit from `.claude/ownership.shard.local.txt`.
3. **Stay out of the seamless lane's regions.** No edits to `loadZone`, the
   population/monster-factory/objective/theater/collision/ground paths in
   `world.ts`, `worldgen.ts placeZoneAt`, or `src/world/{climate,biomes,
   continents,dimensions}.ts` internals — the live branch is moving all of
   them into owners. The CLAUDE.md line goes in the Layout section beside
   `src/net/` (that branch prepends its ledger at the top); the roster row
   goes at the end of the fast green block.
4. **The divergence.** Local `main` @ `651d7e05` and `origin/main` @
   `bc8a0e0a` share subjects but not hashes for the trailer/showcase commits
   (cherry-picked onto another worktree and pushed from there), local main
   carries ~10 matrix/talent/madden commits origin lacks, and origin carries
   the visibility-stability PR (#4) + branch previews local lacks. Her call
   how to reconcile; the shard branch sidesteps it by basing on origin.
5. **Integration at the end.** The shard lane owes the seamless lane one
   interface (`SimUnit`: wake/sleep/attach/detach/snapshot) and nothing else;
   the seamless lane owes the shard one adapter (its runtime as a unit). Every
   other fabric reaches the shard through the transport seam it already
   reaches co-op through.
6. **THE ASKS (2026-10-09) — three seams the shard needs from the seamless
   lane's own files, each with its measurement. DELIVERED by the foundation
   session (c1bfe588, integrated at 18a1b437, 2026-10-10; contract in
   docs/engine/shard-runtime-foundation.md; probes probe_worldmass_foci,
   probe_shardworkers, probe_worldmass_checkpoint): player NEIGHBORHOODS
   (`WorldMassRuntime.update(world, boot, foci?)`, overlapping
   population-radius discs form groups, each with the full population budget,
   the keeper excluded), background compilation on one Node worker thread
   (`server/massWorkers.ts`), and compact checkpoints (`serializeWorldState({
   massCheckpoint: true })`: 5.8 MB to 1.9 MB, 96 ms to 58 ms). The three
   items below stand as the record of the ask.** The shard never edits
   `src/worldmass/**` (6.3); these are requests for that lane, carried by her.
   - **THE MANY SHADOWS** (`src/worldmass/runtime.ts` `update`, lines ~720–816):
     the runtime's page requests, places, site discovery, survey, native
     wanted cells, scenery cells and births all key on ONE position,
     `world.player.pos` (the keeper on the focus seat). Ask: `update(world, foci)`
     with one focus per standing player cluster — the union of page cells
     without pruning the other clusters' places, discovery and survey per
     focus, births per focus under the one `maxPopulation` budget shared by
     cluster. Evidence (the soak, six bots 3,500 px apart): the living
     radius around a player away from the focus is 0; a keeper that visits
     clusters in turn (THE ROVING SHADOW, shipped off) lifts the mean to 6.7
     to 8.1 foes but re-keys the runtime on every hop at 135 to 170 ms and
     drops 43 to 68 percent of ticks, so the seam must live inside the
     runtime, not on the keeper's feet.
   - **THE LOADERS OFF THE TICK.** The wilds' background loading expects Web
     Workers; Node has no `Worker`, so on a shard it runs inside the tick: the
     soak traced 10 of the 12 slowest ticks (100 to 490 ms) to
     `massRuntime.update`, and the codespace drops a quarter of its ticks on
     two cores with no player connected. Ask: a `worker_threads`-backed
     loader (the same message contract behind a Node adapter), or a loader
     that yields in slices the host can budget per tick.
   - **THE LAND ONCE.** `serializeWorldState()` takes 150 to 200 ms on the wilds
     and the shard calls it every `persistSec`; of the 6.5 MB it builds, 3.9 MB
     is `worldmass.config`, THE LAND, a pure function of the seed that never
     changes after boot (the land digest proves it), and 2.2 MB the state.
     Ask: a save option (or shape) that omits the config and re-derives it
     from the seed at read time, so the shard serializes the state alone.
   The per-observer cost stands beside these: with ONE focus, six bots spread
   3,500 px already breach the tick gate (p95 47 ms, 8 percent dropped,
   against 13 ms clustered), because dormancy and native paging scale with
   how far apart the observers stand; THE MANY SHADOWS must budget that too.
   - **THE NEIGHBORHOOD GOVERNOR (ask 4, 2026-10-10, measured on 18a1b437).**
     The delivered neighborhoods give EVERY group the full `maxPopulation`
     budget (96), so the live population scales with the number of groups:
     six bots 3,500 px apart stand ~345 natives (one focus stood ~63) and the
     single sim thread falls to a tick of p50 100 to 150 ms, p95 230 to 520 ms,
     87 percent of ticks dropped, inputs fed 20 percent; three bots apart stand
     ~210 natives at p50 45 ms (p95 97 ms). The cost is ~0.2 ms per live actor
     per tick, so one thread carries ~80 live actors inside a 60 Hz budget
     (~150 at 30 Hz; a 30 Hz tick does not help, the per-tick cost is the
     whole problem: six bots at 30 Hz stood p50 141 ms). The living radius
     itself is delivered: least 21 to 32, mean 27 to 44 foes within reach of
     every spread player, against 0 before. Ask: a shard-wide population
     budget shared across groups (per group = max(floor, total / groups)) on
     `update(world, boot, foci, { budget })`, and an adaptive governor the host
     feeds with its measured tick (the soak's `--spread` run is the receipt),
     so a spread party meets a living world the thread can carry; the shard
     cannot lower `maxPopulation` itself because THE LAND DIGEST hashes the
     mass config. Units on worker threads (M6) is the lasting answer.

     **THE EXACT SEAM (the M6 plan §3.3, 2026-10-10):** host state on the
     runtime instance, never in the config, the land digest, the checkpoint or
     any save: `setPopulationBudget({ total, floor } | null)` (a group's limit
     becomes `clamp(floor, config.maxPopulation, floor(total / groups))` in both
     branches of `populationLimit`; reservations, merges and dormancy unchanged;
     lowering never kills; `null` restores today byte for byte, pinned in
     `probe_worldmass_foci`) and `populationStats()` (the groups with their live
     count and limit); optionally `setResidencyRadius(r | null)` so births stay
     within `r` of a focus with the wake and sleep radii following (no
     birth-then-sleep pump). The shard calls the setter from the host once a
     second after detecting the method, so its governor runs cost-only against
     an older foundation. Two findings beside it: the sight memo keyed pairs as
     `a.id * 1e6 + b.id` and a long-lived shard's ids pass a million (fixed on
     the shard lane as THE PAIR STRIDE, `probe_loskey.ts`);
     `restoreNativeActorState` deletes every property before reassigning, which
     likely leaves restored natives in V8's slow object mode (PLAUSIBLE, the
     foundation's to measure).

   **Foundation implementation (2026-10-09):** the isolated
   `codex/shard-runtime-foundation` integration supplies simultaneous seat foci,
   connected-cluster population budgets, Node compiler ports, and seed/preset
   checkpoints that omit the land before serialization. See
   [the runtime contract and verification](../engine/shard-runtime-foundation.md).
   The current world save uses `worldSaveSec` (60 seconds); `persistSec`
   remains the 20-second player mirror beat. Background compilation and the
   multi-focus seam do not by themselves certify the shard's timing gates;
   retain the measured soak results and remaining costs in that record.

---

## §7 Decision cards — for her word

1. **The base** — `origin/main` (chosen, §6.1). Confirm, and rule the local
   `main` divergence.
2. **The world model to build on** — RULED 2026-10-07: the seamless
   foundation (`codex/seamless-world-foundation`) is the base; the
   discrete-zone unit remains the SIM UNIT's shape for the pockets, and the
   surface's partition is M6. Open beneath it: THE WILDS ON THE WIRE (§3.12)
   is the next pass.
3. **The hearth** — shard-grown layout + per-seat use (recommended) vs. an
   instanced Lastlight per account (contradicts "share a Lastlight") vs. the
   founding host's town. Residents and the campfire ride the same ruling.
4. **Account trust** — claim-trusted friends' server first (recommended) with
   the `signed` seam left open vs. server-held accounts from day one.
5. **Event ownership** — hybrid by scale (recommended; the table in §3.7) vs.
   all-owned (invasions per player would fracture the world) vs. all-global
   (loses her "only that player aware"). Plus THE CREDIT LAW for an owned
   event others finish.
6. **The vessel** — RULED 2026-10-07 (her word): the client keeps its hero
   save and uploads it at login (the couch guest shape) with a server mirror;
   a mortal death drops the corpse at the death spot on the shard and ends
   that player's run while the world persists ("equivalent to having their
   character die in a normal run"), and a new character can walk back and
   reclaim it; Immortal vessels keep THE MERCY. BUILT (§8). Open beneath it:
   should a shard pin a mode; should a fresh hero become a vessel; the
   mirror's rollback window.
7. **Settlements** — the short ladder (camp → hamlet → village), what a
   station is, founder/company/public access, raids yes/no, the essence
   prices.
8. **Travel and company** — free movement with a social party (recommended)
   vs. party-follow; XP/loot sharing among strangers in one unit (proximity
   vs. party-only); the enemy scaling cap past 4 seats.
9. **Dependencies** — in-repo RFC 6455 framing (recommended, THE CLEAN TREE)
   vs. the `ws` package; WebSocket now vs. WebRTC through a signaling server
   later (only if measured latency demands it: movement is already
   predicted).
10. **Numbers** — 60 Hz unit tick, 20 Hz wire, `unitLinger` after the last
    seat leaves, the keeper's sweep cadence, seats per shard and per unit,
    the persistence beat, the mirror's rollback window.

**Ruled 2026-10-08 (her second message):** 1 and 2 (the seamless
foundation), 3 A, 4 A, 5 A with the credit law, 6 A with her corpse
covenant (the server remembers the death spot; the client's run ends; a new
character walks back for it), 7 the first cut, 8 A, 9 as built, 10 as set,
11 Codespaces then a VPS, 12 A (done: origin/main is reconciled), 13 A
(done: the wilds are on the wire).

**New cards from the first design critique (2026-10-08) — open:**

14. **Death until the vessel lands** — A: THE MERCY as is. B: a mercy a
    distant player never withholds (THE NEAR LAW now does this), a visible
    tell on the downed body, and a return to the hearth after N seconds.
    C: the ruled covenant now. Rec: B now, C with the vessel (in flight).
    **RULED C (2026-10-08, her word):** a player who dies drops the corpse
    at the death spot with the equipped gear, saved at the server, visible
    to the fallen account alone, and the character dies and is deleted
    unless Immortal; a new character on the same server finds and loots it.
    So every lethal down is the death, as in single player (the covenant
    reads 'down', never 'mercy'); the mercy remains the Immortal's and the
    keeper's. **BUILT:** `VESSEL_CFG.covenantAt = 'down'` and THE FRESH
    HERO'S END (`freshHeroDies`); the slow rig's N section pins the fall at
    once, the fresh end, the Immortal's mercy and the tombstone's word.
    **CLARIFIED (2026-10-09, her word):** the down-is-death law is the
    UNGROUPED player's — "if a player NOT in a group or party dies, they are
    treated as single player regardless of who is AROUND". A player in a
    GROUP (card 23: the party is our co-op mechanic made explicit) keeps
    co-op's downed state: a nearby player may revive them, and "grouped party
    members only officially die if the party dies and no one is left to
    revive or recuperate" — a party wipe fells every downed member, and a
    grouped member's death loses the run as a mortal's does. BUILD with THE
    PARTY: the covenant reads the seat's party — ungrouped: at once; grouped:
    only when no member of its party stands.
    **THE ACTING SEAT (2026-10-09):** the group's hold reads REACH: a down is
    held only while a party mate stands within the near radius
    (`COOP_SCALING.shareRadius`, the killer's due's own reach), so a mate a
    continent away never keeps a body from its covenant; THE MERCY waits on
    party mates alone (a stranger near never withholds it) and never raises a
    body whose stage ends the run; and the fall is decided the tick it lands
    while the body stands dead and untargetable on the wire for
    `VESSEL_CFG.deathBeatSec` before the word, so the killing blow is seen
    (`balance/probe_shardseat.ts`).
15. **Roads that move the whole party** (caravan, town portal, caves,
    classic portals) until per-seat travel exists — A: move everyone.
    B: move only when every connected player gathers, shown as a muster
    ring. C: seal them on shards (TODAY: sealed by THE SEALED ROADS).
    Rec: C while shards are friends-only; B is the first per-seat step.
    **RULED B FOR PARTIES ONLY (2026-10-08):** a party's road waits for the
    party at a visible muster ring; two independent players in one place
    are never moved together and travel home on their own. Until THE PARTY
    (card 23) exists the roads stay sealed (C).
    **RULED (2026-10-10, her word): B stands. She asked what the muster ring's
    detail meant; it is the party's dwell at a road (any member raises it, 400
    px, 20 s), and her agreement lands as built (M1-W4).**
    **BUILT 2026-10-10 (M1-W4, branch shard-m1-muster; receipt
    `balance/probe_shardunits.ts` G), every number a dial (`MUSTER_CFG`):** a
    party member's finished road (an exit, a cave mouth, a realm gate) waits at
    a ring on the road while another member stands in its unit; it fires the
    moment every member standing there stands inside it, else at the wait with
    whoever does (the rest follow later on their own into the same unit); the
    raiser walking off it or the party dissolving lapses it; while it stands
    the party's members there take no road of their own; the party travels in
    one drain into one unit, side by side; an independent crosses at once; a
    ring is drawn, never told (the `mu` row: gold for the party, faint for a
    stranger). The intents (the town portal, the caravan, the waypoint) stay
    each seat's own.
16. **Disconnects** — A: the hero vanishes at once (today; a disconnect is a
    free escape from death). B: the hero lies dormant N seconds and a
    reconnect token reclaims it. C: the server holds the hero until the
    next login. Rec: B now, C with THE VESSEL. **RULED B (2026-10-08).**
    **BUILT as B (2026-10-08):** a socket lost without the client's word
    (`session leaving`) leaves its hero standing and targetable for
    `SHARD_CFG.dormantSec` (30 s; a death meanwhile is the ordinary death),
    and the welcome's reconnect token takes the same seat back from the
    lobby inside `WS_TRANSPORT_CFG.resumeWindowMs` (THE DORMANT SEAT,
    docs/engine/shard.md; `balance/probe_sharddormant.ts`).
17. **Identity and talk** — A: a name entered once, overhead names on
    heroes, world-anchored pings (a visible cue, SHOW DON'T TELL). B: text
    chat as well. Rec: A; chat is yours. **RULED A now, B as a later pass
    (2026-10-08): text chat is important, not paramount.** **BUILT A
    (2026-10-09):** THE IDENTITY CUES — the name entered once rides the
    body and the wire, every other hero wears it overhead (gold for a mate,
    ether for a neighbour), and `g` marks the ground for your party: rings,
    a beacon, an edge chevron off-screen, host-judged for cadence and reach
    (`data/identityCues.ts`, `engine/pings.ts`, docs/engine/shard.md;
    `balance/probe_shardidentity.ts`). Text chat (B) stays the later pass.
18. **World-freezing powers on a shard** (Time Stop, any world-wide hold)
    — A: freeze the whole World. B: scope them to a radius. C: exempt
    other players. Rec: B. **RULED B WITH C (2026-10-08):** a world-freezing
    power on a shard bends a radius and never bends another player. **BUILT:**
    THE SCOPED FREEZE (`Timeflow.chronoScope`, `ActorTimeFilter.within`,
    `SHARD_CFG.chronoRadius`); the fast rig's R section pins it.
19. **Getting the client to players** — A: friends run the branch checkout.
    B: a Pages preview of this branch pinned to the shard's commit (https,
    so wss) and version-gated. C: a packaged build channel. Rec: B.
    **RULED B, HELD (2026-10-08):** scoped to us for now — a launcher change
    that picks the branch a player runs is coming from the launcher lane,
    and production has ONE branch once the seamless foundation merges into
    main; the preview is a stepping stone, never the road.
20. **The joiner's wake** — BUILT as B: every joiner wakes at the hearth
    (never beside the shadowed keeper) and is unseen by foes until its first
    willed input or `spawnGraceSec` (THE HEARTH WAKE + THE SPAWN GRACE).
21. **The probe's tier** — the shard rig now boots four wilds (about 90 s):
    keep it on the fast lane, or split the wilds-save section into a slow
    rig. Rec: split. **RULED: the recommendation (2026-10-08). BUILT:**
    `probe_shard.ts` keeps A–K and P on the fast lane; `probe_shardslow.ts`
    carries Q and L–O on the slow tier.

**Her rulings of 2026-10-08 also settle card 6's open thirds through card
22: a shard pins no life contract — the vessel brings its own from Mu — and
a fresh hero without a run save is never a shard's hero: it becomes a vessel
in Mu first.**

22. **THE LOGIN THROUGH MU** (her ruling 2026-10-08, from card 6's reading):
    the tutorial is LOCAL ONLY — no server, no MMO machinery, "begin" plays
    it as ever. A player connecting to a server (co-op or a shard) with a
    live vessel resumes it; without one, Mu opens as in single player, the
    pick creates the vessel and THEN the client connects, so the shard seats
    the vessel at the hearth (THE HEARTH WAKE) and the gameplay is the
    single-player variant, never co-op's — co-op semantics live inside a
    party alone (card 23). Mu may grow into the hub that sends a chosen
    class to Lastlight on the server, but the easiest faithful path wins:
    the lobby's Join a Server pins the address, Mu plays locally, the pick
    connects. **BUILT:** `connectToShard` (main.ts) — a vessel travels, else
    Mu picks one (the tutorial first for a virgin account) and the bedside
    wake travels it; a fall drifts back into Mu bound for the same server;
    the lobby's connect answers 'connected' or 'mu'. **THE IMMORTAL TRAVELS
    (built):** the wake names its hero by `charId` (THE WAKE'S WORD), so an
    Immortal vessel (a roster save) is read from its own card's slot and
    travels, and its mirrors land in that slot with its card refreshed, never
    in the shared Continue; the lobby takes the run slot's hero first, else
    the one standing roster card (two are ambiguous and Mu picks; a fallen
    vessel never travels); on a shard it keeps THE MERCY until its own
    covenant is ruled (`balance/probe_shardimmortal.ts`). THE KILLER'S DUE
    rides with it: on a shard a kill pays the killing seat alone until THE
    PARTY widens it. Cards 14, 18 and 21 are built; card 16 is in flight.

23. **THE PARTY** (her word 2026-10-08/09 — "players that are PARTIED
    TOGETHER are effectively a unit, our equivalent of co-op; two individual
    players do not NEED to be partied to play in the same vicinity"; and on
    2026-10-09: a group "implies or infers something akin to our coop
    mechanic, which may need a further mechanic to allow players to actually
    group and ungroup together, just like in an MMORPG" — RULED: build it).
    The contract: a party is an explicit social unit
    (invite, accept, leave; a leader only for kicks and the muster) and the
    ONLY thing that makes two players a unit. Independents are neighbors.
    Enemies scale by who stands near them whatever their parties (the mob
    cannot tell friends from strangers — THE NEAR LAW as built). XP pays the
    killer's party within the near radius, never a passing stranger; a
    stranger who dealt the blow is paid by contribution. Loot is PER PLAYER:
    each seat sees and takes its own drops (the corpse law's sibling). Roads
    that move a whole party wait at the muster ring (card 15) and leave
    independents alone. A revive reaches party members and anyone who walks
    up and kneels. The wire: a `party` row per seat (leader, members), the
    invite as a session message, the HUD's party frame. **THE GROUP LAW
    (her clarification 2026-10-09):** inside a party the downed state is
    co-op's — a member may be revived by a nearby player, and the covenant
    fells the downed only when no member of the party stands (the party
    wipe); outside one, every lethal down is the death (card 14 C). BUILD
    NEXT (after the dormant seat and the Immortal's travel land): the party
    registry on the shard (invite, accept, decline, leave, kick; the leader
    for kicks and the muster), the seat's party on the wire, the covenant
    and THE KILLER'S DUE reading the party, a Party panel to invite the
    players in sight, the muster ring for card 15 after that. **BUILT, the
    server half (server/party.ts, net/partyWire.ts, the host's words, the
    covenant's partyHolds, the due's sameParty, the wire's parties rows;
    probe_shardparty.ts) and the client half (ui/party.ts — the menu's
    Party page: your party, the invitations, the players around you; the
    shell collects the invitations and the shard's words):** the muster ring
    (card 15 B) BUILT 2026-10-10 (M1-W4, `server/muster.ts`).
24. **THE QUEST LEDGER** (raised by the gap sweep, §7d item 3) — A: per
    ACCOUNT (each player's quest state lives on the shard keyed by account
    id, the corpse idiom; a quest a player finishes is finished for that
    player alone). B: per WORLD (one shared ledger; one player's turn-in
    finishes it for everyone). C: mixed (authored story quests per account,
    world events and sieges shared). Rec: C, which is A for every quest a
    giver hands a person and B for what the world does to itself.
    **RULED (2026-10-10, her word): the unit is the CHARACTER, exactly as
    single player. Each hero carries its own quest log, its own rolled board
    postings and its own Odyssey leads; the world's consequences (the
    Odyssey's choices, which faction fell, world events, the restock clock)
    are the shard's and shared. Four Immortals of one account each have their
    own quests and meet one world. Built as THE CHARACTER'S QUESTS (W9).**
25. **POCKET TENANCY** (M1's first question) — A: shared pockets (whoever
    walks into a cave meets the same cave, her "generated for any player
    that simultaneously ran across it"). B: one instance per party.
    Rec: A by default, B by a data flag for authored dungeons and arena
    seals.
    **RULED (2026-10-10, her word): A, with B as a data flag per pocket (M1-W4
    builds it).**
    **BUILT 2026-10-10 (M1-W4, branch shard-m1-muster; receipt
    `balance/probe_shardunits.ts` G):** the flag (`tenancy: 'party'`, on a
    sidezone or an arena) is stamped on the minted pocket and the registry keys
    its unit per party (`${zoneId}#${partyId}`, an ungrouped seat's
    `seat:<id>`) for every road leading in; THE INSTANCE FORGETS: an instance
    reads no shared memory row at its wake (it mints fresh), writes none at its
    sleep or for the world save, and keeps its clears its own; it hears no world
    sweep's zone half. No content carries the flag yet. Open for her word: which
    pockets carry it, and whether a party's clear of its instance should also
    count for the world's clears (today it opens nothing outside the instance).
26. **THE RETURN** (where a hero stands after a leave) — A: always the
    hearth (today). B: where it logged out, within a radius, with a leave
    in combat going dormant like a dropped socket (W3 builds the dormant
    half either way). Rec: B.
    **RULED (2026-10-10, her word): B, and stronger: a hero logs back in where
    it logged out, and that is the ONLY behaviour; there is no choice between
    a hearth and a logout spot. The hearth stays a new hero's first wake and
    the wake after a death. W7 builds it.**
    **BUILT (2026-10-10, W7, branch `shard-w7-door`):** THE RETURN. Every
    mirror carries the hero's last stand (the zone or pocket, the spot, the
    story, THE HOSTED SEED), the desk keeps the stand of a leave no client
    heard (the dormant release, a closed tab), and the next login lands the
    hero there under THE SPAWN GRACE: back into a pocket whose unit still
    stands, at the mouth on the surface when the pocket is gone, into the
    unit of any other charted zone; a new hero, a stand from another world
    or ground the chart no longer holds wakes at the hearth with one log
    line. No player-facing choice exists (docs/engine/shard.md "THE RETURN";
    `balance/probe_sharddoor.ts` I).
27. **THE SPOILS' OWNER** (card 23 said per player; the sweep found the
    ground is first-come) — A: strictly per player, forever. B: per player
    with a free-for-all after a timeout. C: A plus a deliberate give or
    trade lane. Rec: A now (the honest floor), C as its own pass; B only
    if you want shared pickup at all.
    **RULED (2026-10-10, her word): A as the default, with the FOUNDATION for
    B: a party may set its own drop rule, owner first and free for all after a
    timeout. Built as THE SPOILS' OWNER (W10).**
28. **THE BLEED-OUT** (a grouped mortal's down) — A: no timer; a downed
    grouped hero waits for a mate as long as the party stands. B: a
    bleed-out of N seconds after which the covenant falls, reset by a
    kneel. Rec: B at 60 s.
    **RULED (2026-10-10, her word): B at 60 s, reset by a kneel; no holding a
    downed player hostage. W8b ships `VESSEL_CFG.bleedOutSec` at 60.**
29. **THE SHELF PER BUYER** — A: one world shelf rolled at the keeper's
    level (today, §5). B: the shelf rolls per buyer's level. Rec: hold A;
    revisit with M2's account gate.
    **RULED (2026-10-10, her word): toward B as accounts diverge: the shelf
    rolls per buyer (per character) from the shared restock clock, at the
    buyer's level and gates, the way Path of Exile's vendors are each player's
    own. Built as THE SHELF PER BUYER (W9).**
30. **THE IMMORTAL'S OWN COVENANT ON A SHARD** — today an Immortal cannot
    die on a shard: a stage that does not end the run never meets the
    covenant and the mercy stands it up. A: the stage's own death policy
    runs on the server and mirrors home (a Sworn stage advances, an
    Undying falls with its frozen fee, the corpse by the stage's rule).
    B: leave Immortals deathless on shards. Rec: A.
    **RULED (2026-10-10, her word): A. Built as THE IMMORTAL'S COVENANT ON A
    SHARD (W10).**
31. **THE M6 ORDER** (the M6 plan `docs/design/shard-m6-plan.md` §6,
    2026-10-10: units and islands across cores) — A: W0 (the one-thread diet:
    the profile, the phase meter, THE THINKING EDGE, local rosters if the
    profile points at the whole-roster scans) and W1 (THE GOVERNOR over the
    foundation's budget seam) now, W2 (THE GLASS UNIT: pockets that speak only
    in messages, still one thread) and W3 (THE THREAD HOST) once the
    foundation commits to the island runtime. B: all four now. C: W0 and W1,
    then decide from the profile and the player counts she expects. Rec: A.
32. **THE GOVERNOR'S NUMBERS** — the per-group floor (Rec: 24, today's
    delivered least); whether the tick may drop to 40 Hz under the heaviest
    load (the wire stays 20 Hz; 30 Hz would halve it); whether THE DOOR (new
    joins held at the lobby under overload) exists at all. Rec: 24, 40 Hz
    allowed, no door until a real host is measured.
33. **THE HARDWARE** — threads need cores and the codespace has two. Rec: a 4
    to 8 core host before W3 lands; W0 and W1 run anywhere.
34. **A WORKER'S DEATH** — A: its players wake at the hearth from their last
    mirror (up to `persistSec` 20 s of progress lost). B: a seat checkpoint
    beat (2 s, a few kB a seat). Rec: B.
35. **ONE CLOCK** — A: lockstep across threads, every thread stepping the same
    tick with the same start time and inputClock, so the slowest thread sets
    the shard's tick. B: a clock per thread with a rebase law at every
    hand-off. Rec: A.
36. **THE ISLAND SEPARATION** — islands split where no player can see across
    (about 3,200 px: the 1,600 px awake radius plus the view) with hysteresis;
    a merge costs a short hold (up to about 100 ms) for the merging players
    only; THE NEAR LAW (1,600 px) and the group merge (2,600 px) never cross
    an island by arithmetic. Rec: as stated; the number is unblessed.
37. **THE TRAVELLING COURT** — A: exact capture of every carried body on a
    cross-thread hand-off (the couch guest's build plus live state, the court
    captured exactly). B: timed summons re-minted at their life fraction. Rec:
    A.

---

## §7b The reconciliation ledger (the base moves daily)

The lane merges the seamless foundation's tip into `shard-world` as a MERGE
(never a rebase — the branch is pushed and hosted), resolves the few hunks the
keeper seams share with the refactor, and re-runs every gate. Each row names
the base taken and what moved.

| date | base merged | hunks | what moved |
|---|---|---|---|
| 2026-10-07 | `67d9c290` (pushed tip) | 0 | the lane's first base (a rebase, before the branch was pushed) |
| 2026-10-08 | `ae5b686f` (31 LOCAL commits of the codex worktree, unpushed at the time) | 3, all in `world.ts` | the party scale moved into `engine/nativeScenePopulation.ts` and THE NEAR LAW moved with it (`scenePartyScaleCount(host, at)`); the experimental exploration rewards were retired upstream, so the keeper-gated `claimExplorationReward` went with them; the coop import kept `COOP_SCALING` for the mercy and XP reads. Of the 17 `keeperSeat` seams, 15 stand in `world.ts` as they were, the two party-scale lines moved with the scale into the scene module, and the retired reward claim's gate went with its method. The merge audit (an Opus critic, 2026-10-08) found THE LAND DIGEST gap (the preset's terrain version moved under the seed — fixed: refused saves are legacy, the welcome proves the land) and THE NEAR LAW AT THE MINT (pre-existing: the mint-time scale read a placeholder — fixed: settled where the body stands); it noted that `mercEase` is read off the keeper's sheet on a shard (a seat's own Fair Company never lightens its hired blades — OWED) and that the shell mints the settlement watch at attach before the first snapshot replaces it (harmless). Nine other probes red after the merge are red on the codex tip itself (its in-flight work), left to that lane. |
| 2026-10-09 | `6948a362` (7 more LOCAL commits: regional courts, winding terrain, complete native locales, fixture ownership) | 0 | a clean auto-merge; a dry run (`git merge-tree`) of shard-world INTO the foundation tip is clean too. THE INTEGRATION POLICY (her question 2026-10-09) is §7c. |
| 2026-10-10 | `18a1b437` THE INTEGRATION: the foundation session merged shard-world (096393f1) and the roads branch (889884fc) into its lane, delivered §6.6's three asks (c1bfe588) and fast-forwarded `shard-world` to the same commit, so both branches stand as ONE tree; §7c's cadence continues from here (the shard keeps merging the foundation down; the foundation lands the shard up). | 0 | the shard rigs, the three new foundation probes and a soak are green on 18a1b437 |
| 2026-10-10 (M1-W4) | `72da43c3` (shard-world: the M6 plan, her rulings, THE PAIR STRIDE) merged into shard-m1-muster | 1, the charter (cards 15 and 25: her rulings as recorded on shard-world, then W4's receipts) | the hand-off's sight-memo prune now decodes by `LOS_PAIR_STRIDE` (b0813633). THE FOUNDATION'S WORLD GUARD (`probe_nativeinstalledsources`, "unknown future edits still fail") reads the merged World as unknown, as it already did 72da43c3's: the reviewed hash for its re-pin is `9fb3f8fb7740bc6218d5deb0dff4b94c953e6ed83260ed52447a3ff97d12df66` (`nativeInstalledShardWorldHash`), and with it accepted every assertion below the guard passes. The ten other fast-lane reds fail on 18a1b437 too. |
| 2026-10-09 (W5) | THE SEAMS THE SHARD NOW CARRIES IN THE FOUNDATION'S FILES, for the landing: `src/worldmass/clearance.ts` passes the cleared site's place to `grantXp` (XP BY PLACE, one line); `src/worldmass/quests.ts` reads a hosted shell's map pins off its journal row and filters bounty pins by `World.handOwns` (three lines). Both additive, byte-identical off a shard. | 0 | recorded so the foundation session meets them knowingly at the landing (§7c). |

## §7c The integration policy (her question 2026-10-09)

The shard lane is a FEATURE BRANCH OF THE FOUNDATION, never a fork. Two
beats keep it so:

- **Downstream, daily:** the foundation's tip merges INTO `shard-world`
  (a merge, never a rebase; probe-gated; one row in the ledger above).
- **Upstream, at every green milestone:** `shard-world` lands INTO
  `codex/seamless-world-foundation`. The lane is additive (its own files
  under `server/`, a handful of `keeperSeat` seams in the engine, its
  rigs on the roster), so landing it early costs the foundation nothing
  and buys two things: the shard's rigs join the foundation's gate, and
  that lane's refactors carry the seams instead of breaking them
  silently (both drifts the merge audit caught were exactly that).

The foundation session performs the landing at a clean point of its own
tree (its worktree is dirty most hours; nothing here forces its ref).
Until then `shard-world` stays a merge away, and the dry run above is the
receipt that the landing is clean today. Neither lane waits for the
other to be "near completion": the foundation reaches content parity
with main on its own clock, and the shard keeps riding it.

## §7d The two sweeps (2026-10-09) and their waves

Her ask: "a multitude of sweeps … synchronization between the client and
server … a seamless, fully integrated MMORPG environment." Two read-only
audits (Opus, every item cited by file and line) ran on the tree at
d6019949 + card 17 A. Their verdicts and where each finding lands.

**THE SYNC CRITIC — "2 of 10 at 120 ms with 10 players."**

| # | Finding (CONFIRMED unless noted) | Wave |
|---|---|---|
| 1 | Rubber-banding BY CONSTRUCTION: `PlayerInput` carries no dt, the transport merges one input per tick, `applyInputs` moves one tick per tick, so a 30 fps client walks at half speed on the server and snaps back every snapshot; stalls merge N inputs into one tick. | W1 THE HONEST INPUT — BUILT 2026-10-09 (3038a198): dt on the wire, move replay under a time budget; probe_shardinput |
| 2 | Every non-keeper seat's held casts run on the monster AI's hold roll (`a !== this.player` in updateCasting): guards drop, channels end, charges release on a 1.2–2.6 s timer. | W3 — BUILT 2026-10-09 (7efc8c8c): seated actors hold on their own input; probe_shardseat |
| 3 | `World.zones` (telegraphs, fields) and leap landing rings never ride the wire: invisible slams, strikes and hazards on a client. | W2 THE WIRE'S EYES — BUILT 2026-10-09 (6edffa88): `ZoneW` rows within reach, leap dest/radius/telegraph; probe_shardwire |
| 4 | THE FOCUS: the mass runtime keys on the keeper's one position; a player 3,000 px away walks a barren, static world. MEASURED (the soak, 6 bots 3,500 px apart): the living radius around each player is least 0, mean 3.2 foes; THE ROVING SHADOW (a keeper that visits each cluster in turn, shipped off) lifts the mean to 6.7 at a 10 s cadence and 8.1 at 2 s but drops 43% and 68% of ticks (each hop re-keys the runtime at 135–170 ms; the extra clusters' natives raise the sustained load). | THE MANY SHADOWS (several foci inside the runtime, no re-keying, per-focus budgets) + the loaders off the tick, with the seamless lane |
| 4b | THE SPREAD COST (the soak): six bots spread 3,500 px with ONE focus already breach the gate (p95 47 ms, 8% dropped) against 13 ms with the same six around the hearth: the runtime's per-observer paths (dormancy, native paging) scale with how far apart players stand. | THE MANY SHADOWS, budgeted — DELIVERED by the foundation (c1bfe588): neighborhoods with exact spatial observer queries; the soak's `--spread` run on 18a1b437 is the receipt (§7d note below) |
| 5 | No stall watchdog, no auto-reconnect; an F5 loses the resume token and the vessel is refused as "already walks the world". | W4 THE SMOOTH SHELL — BUILT 2026-10-09 (67827cfe): the frame strains at 1.5 s, `resumeInPlace` at 5 s or on close, the session in sessionStorage so an F5 resumes the same seat; a `resumeOnly` join takes over a live seat the shard had not yet noticed dead; probe_shardshell |
| 6 | No local action feedback: every press waits a round trip; cast roots snap back; dashes step at 20 Hz. | W4 — BUILT in part: THE PREDICTED ROOT (a ready plain cast starts a local stub, moves after the press replay rooted, the host's cast row reconciles); dashes, leaps, channels, guards and charges remain |
| 7 | Cooldowns and gauges are never serialized: the client's bar never sweeps, ultimates never fill. | W2 — BUILT: THE OWN ENTRY (`SeatW.cd`/`gg` spliced per socket, `tickNetClocks` runs them down) |
| 8 | No interest management: every actor and every dirty build to every client; XP dirties a build; the 1.5 s heartbeat re-dirties all. PLAUSIBLE sizes. | Pass C: BUILT 2026-10-10 (W6 THE WIRE DIET, branch shard-w6-diet): interest per seat (twice the near radius around a seat and its party mates, the party's courts wherever they stand, a far roster of every other seat), one encoded body per distinct audience set, and the codec (0.25 px, 1/512 turn, false flags and zero pools elided, identity once per socket); a wilds snapshot at four players together fell from 25 to 6.3 kB; probe_sharddiet |
| 9 | The client re-applies the WHOLE latest snapshot every render frame: optimistic actions revert until the echo. | W4 — BUILT: `adoptSnapshot` once per arrival, `interpolateSnapshot` per frame (`src/net/shell.ts`), THE ECHO LAW (`SeatMetaW.as`) holds an optimistic build or ping until its echo |
| 10 | `persist()` stringifies and writes ~4 MB on the tick: ~250 ms of no ticks every 20 s. | Pass C |
| 11 | No jitter buffer; corrections hard-snap; the camera has no smoothing. | W4 — BUILT: remote bodies 100 ms behind the server clock with a bent render clock and a 100 ms extrapolation cap, own corrections under 64 px glide out over 120 ms, the camera on a critically damped spring on a client shell only |
| 12 | Own-hero speed modifiers are not predicted (statuses are display stubs). | W1 — BUILT: the own seat's speed and traction ride the wire |
| 13 | Death: the killing blow is never shown; the screen comes ~60 ms after it. | W3 THE DEATH BEAT — BUILT: `VESSEL_CFG.deathBeatSec` 1.5, the client plays the death presentation from the first dead snapshot |
| 14 | THE DRESS BEAT re-ships the whole zone on any doodad churn (up to every 4 s). | Pass C: BUILT 2026-10-10 (W6 THE WIRE DIET): the dress rides each socket's `dd` rows on the next snapshot (doodads and plan structures, keyed by place and kind; a broken or harvested piece vanishes on the next snapshot); the whole zone ships on a zone change, or when the zone's own frame moved; probe_sharddiet E, probe_shard P |
| 15 | Projectiles, tethers, lite hordes and pose scalars step at 20 Hz (no ids, no velocity). | W2 — BUILT for flights (`ProjW.id`+`v`, THE FORWARD LAW) and tethers (actor ids); W6 THE WIRE DIET BUILT the rest: lite bodies ride wire ids and glide under THE FORWARD LAW, the hit flash eases between rows, the pose scalars ride the codec into THE SMOOTH SHELL's glide |
| 16 | Own facing and walk pose are server-driven. | W1 — BUILT |
| 17 | Server-only events with no client cue (shake, low-life surge, corpses, dissolves, the harvest rite's invisible dwell). | W3 (per-seat rows) + Pass B |
| 18 | Quick taps lost in merged ticks. | W1 — BUILT |
| 19 | Damage numbers have no owner. | W2 — BUILT: `TextW.o` + `Settings.floatOwners` |
| 20 | Flow control tests only the userland write buffer: a slow link's latency grows into seconds before a snapshot is skipped. | Pass C: BUILT 2026-10-10 (W6 THE WIRE DIET): the client acks the newest applied tick on its input (and on its own when its inputs go quiet); the shard skips a socket holding more than three unacknowledged frames (frames, never ticks) and carries its changed build, journal and shelf into the frame that resumes it; probe_sharddiet F |

**THE GAP CRITIC — tiers by player impact.**

| # | Finding | Wave |
|---|---|---|
| 1 | One living focus (tier 1). | THE MANY SHADOWS — DELIVERED by the foundation (c1bfe588): player neighborhoods in the wilds runtime |
| 2 | Loot is first-come for everyone; card 23 said per player. | THE OWNED SPOILS (card 27) |
| 3 | Quests are dead on a shard (seven breaks: offers, wire, linger, rewards to the keeper, cargo from the keeper's bag, XP to all, world-wide state). | THE COUNTERS AND THE JOURNAL (card 24 first): BUILT 2026-10-09 (W5 THE COUNTERS AND THE JOURNAL, probe_shardcounters): quest state stays the world's, every act and reward the acting seat's; card 24 still open |
| 4 | Stations never answer a linger (keeper-only dwell; station anchors not shipped). | THE COUNTERS AND THE JOURNAL: BUILT 2026-10-09 (W5 THE COUNTERS AND THE JOURNAL, probe_shardcounters) |
| 5 | Every road off the surface is sealed with no word. | M1 W2 THE ROADS PER PLAYER: BUILT 2026-10-09 (branch shard-m1-roads): every road moves the seat that took it, alone; the dock, the voyage, the Wraithsail and the Descent's shaft say their word once per approach on the seat's own row and draw no ring; probe_shardunits F and H. M1 W4 THE REALM ROADS BUILT 2026-10-10: every realm gate opened (its prep in the source, its first wake in the realm unit), a dimension's crossing on the Unbroken Wilds keeping its word; probe_shardunits K, probe_shardslow S |
| 6 | Held casts drop after ~2 s. | W3 |
| 7 | Chests, shrines, diamonds, fractures, waypoints answer only the keeper. | W3 |
| 8 | The bounty board is dead on a shard. | THE COUNTERS AND THE JOURNAL: BUILT 2026-10-09 (W5 THE COUNTERS AND THE JOURNAL, probe_shardcounters) |
| 9 | A new account never gets flasks on a shard. | W3 |
| 10 | Nothing earned reaches the home account; the shard account is in memory only. | M2 THE SEAT'S GATE |
| 11 | The group hold has no distance; the mercy waits on strangers. | W3 (card 28 for the bleed-out) |
| 12 | Events have no owner and gather on the keeper. | M3 |
| 13 | Harvest is closed to remote seats. | THE COUNTERS AND THE JOURNAL: BUILT 2026-10-09 (W5 THE COUNTERS AND THE JOURNAL, probe_shardcounters) |
| 14 | Mercenaries cannot be hired. | M2 |
| 16 | Event, objective and quest XP pays everyone. | THE COUNTERS AND THE JOURNAL: BUILT 2026-10-09 (W5 THE COUNTERS AND THE JOURNAL, probe_shardcounters) |
| 17 | Leaving mid-fight is a full heal and a free trip home. | W3 (card 26) |
| 18 | Refusal words are silent for every player. | W3 |
| 19 | The world runs at the highest player's level. | M3 (card 29) |
| 20 | Immortals cannot die on a shard. | card 30 |
| 23, 24, 26, 27, 29, 30 | Reckoning counts the server; no build stamp; the horn from anywhere; UI buttons that bypass requests; notices and banners to everyone. | W3 |
| 25 | The client map shows no quest pins or corpse marker. | THE COUNTERS AND THE JOURNAL: BUILT 2026-10-09 (W5 THE COUNTERS AND THE JOURNAL, probe_shardcounters) |

The three waves W1, W2 and W3 run in parallel on worktrees off the card
17 A commit, each with its own probe; Passes B and C follow on the merged
tree; the milestone waves wait on cards 24–30.

## §7e The player's first hour (2026-10-10)

A read-only audit (Opus) walked a brand-new player's first hour on a hosted
world. W7 THE FRONT DOOR answers the door and the goodbye, and card 26 as she
ruled it the same day (`docs/engine/shard.md`, THE FRONT DOOR and THE RETURN;
`balance/probe_sharddoor.ts`); W8a THE ONE CROSSING answers the arrival
(`docs/engine/shard.md`, THE ONE CROSSING; `balance/probe_shardcrossing.ts`).

| # | Finding (CONFIRMED unless noted) | Wave |
|---|---|---|
| D1 | The served page booted into the single-player start menu; Begin played the solo tutorial and a solo run; the binding to the server was one in-memory variable that a reload or the main menu dropped. | W7: BUILT 2026-10-10. THE SERVED MARK: the shard stamps the index it serves (a forwarded host's page and the dev door `?dev&shard=` count too), and such a page's primary row is **Enter the world**, the solo rows one row down. THE DOOR keeps the binding in sessionStorage through a reload and the menu; only a deliberate leave or a solo road chosen at the menu forgets it. |
| D2 | The lobby's server road was illegible: the copy-paste note first, class cards that meant nothing for a server, a false travel note ("a fresh Warrior"), errors as "Connection failed: Error: ...", and a full shard and a hero frame over 256 KB closed with no word. | W7: BUILT 2026-10-10. The road is class-free (the cards wait for Host or Join); its line names the hero that travels, or says Mu picks one; failures read as one plain line; the door refuses a full world (`SHARD_REFUSAL.full`) and a hero past the wire's cap (`SHARD_REFUSAL.heroTooLarge`) with their words, and the client checks THE JUDGMENT's own cap before it uploads. |
| D3 | Joining with a solo hero silently deleted that run's world (the first mirror overwrote the run slot), and Continue then built a fresh SOLO world from the mirror, stranding the shard hero. | W7: BUILT 2026-10-10. HOME SLOTS: every write home names its world (the address, the seed, the name the welcome carries), from the first snapshot that seats the hero; Continue on a bound save reads **Return to <world>** and connects with its charId, and the solo resume refuses a bound save. THE SOLO GUARD: a hero whose slot holds a standing solo world travels only after the lobby's line and confirm (or the menu's), and no write replaces that world without the word. |
| D4 | Exit Game and a closed tab never said goodbye: the hero lay dormant and targetable for 30 s and the last 20 s were unsaved; a leave mid-fight left the hero standing with no mirror and no word. | W7: BUILT 2026-10-10. HONEST LEAVING: Leave the World and Exit Game say the deliberate word and await the farewell mirror (or a short cap), then land with one true line; a leave mid-fight hears "your hero stands its ground for 30 s" on the seat's own note, never a modal. THE UNLOAD WORD (best effort): a page going away tells its world over its socket and by a beacon (the beacon is the one that survives a real reload); a calm hero sleeps untargetable on a 15 s reload grace (a reload takes the seat back; a closed tab's hero leaves), and the moments since the last beat stay honestly unsaved (Exit avoids that). |
| D5 | A failed return discarded the shard's word ("Connection to the host was lost."), offered no way back, and a stale served tab never reloaded after a build change. | W7: BUILT 2026-10-10. THE RETURN'S WORD: the menu line names the world and carries the shard's word; THE DOOR offers **Return to <world>** (a resume inside the dormant window, else a fresh login that lands where it left); a reload past the window logs a bound hero back in by itself; a served page whose world refuses its build reloads once. |
| D6 | Co-op wording on a shard ("Leave Co-op", "Leave this co-op session?", "host"); heroes never named filled the server as "Warrior". | W7: BUILT 2026-10-10. A hosted world says "world" and "server" ("Leave the World", "Leave this world?", the world's name), the WebRTC lane keeps "co-op" and "host". THE STOPGAP NAME: an unnamed hero wears its class and a two-digit number its account picks, the next free one on a clash (display only; the Mu card's naming is the honest fix). |
| D7 | `server/shard.ts`'s header still said `ws://` addresses and a 20 s world save. | W7: fixed 2026-10-10. The served address, the https and bare-host forms, the 60 s world beat beside the 20 s mirrors, and the `--per-ip`, `--client` and new `--name` flags. |
| 26 | Her ruling the same day: a hero logs back in WHERE IT LOGGED OUT, the only behaviour. | W7: BUILT 2026-10-10. THE RETURN: every mirror carries the last stand, the desk keeps the stand of a leave no client heard, and the next login lands the hero there under THE SPAWN GRACE: back in a standing pocket, at a gone pocket's mouth, the hearth only for a new hero or a foreign or missing place (card 26's receipt above). |
| A1 | The server-bound wake shows a local town, then snaps: the served build runs the classic profile, so a classic Lastlight bedside stands up, freezes when the socket is assigned, then the screen snaps to the shard's wilds hearth with no cover (the frame loop's loading gate was host-only). Two arrivals in two different towns. | W8a THE ONE CROSSING: BUILT 2026-10-10. The wake mints its vessel on a World that loads no zone and draws nothing, and the Mu crossing's cover stands from the character flush through the connect, the shell, the zone message and the first snapshot to the first page ring around the hero; a direct join, a reload's return and a hand-off ride the same lease, THE RETURN in place never covers. A wilds shell stands no local town either. Measured in the browser: no frame drawn between the pick and the hero on the shard's ground. |
| A2 | Terrain streams in around the hero with no cover at the hearth (PLAUSIBLE). | W8a: BUILT. The cover releases only when every page of the 3x3 around the hero is published (`WILDS_CLIENT_CFG.coverRing`), the pages counted and measured on the cover. |
| A3 | The map's explored fog resets after every cave and every login (the shell disposed its runtime for a pocket and booted a fresh one on the way out); the boot on every climb-out is a hitch (PLAUSIBLE). | W8a: BUILT. THE RUNTIME SURVIVES POCKETS (the same runtime re-seated: the survey, the page cache and no second boot; the boot measured 2.6 to 6 s of main thread in Node, the climb-out about 3 ms) and THE KEPT MAP (the explored cells per account and world in localStorage, re-claimed at the next login). |
| A4 | (found by W8a's browser walk) A door the shard opened before a join is shut in the shell's walk: the shell lays its settlement with the doors closed, applyZone adopts each door's open flag, so the snapshot's idempotent door sync never repaints the grid. A login after the Waking House door was pushed met it shut in prediction. | W8a: BUILT, THE SHARD'S OPEN DOORS (the surface zone message carves them into the shell's own grid; probe_shardcrossing G). |
| A5 | (found by W8a) After THE RETURN in place, `leave()`'s farewell never hears the hero's last mirror (resumeInPlace's handler dispatches only while `this.ws` is its socket, and `leave()` nulls it first), so the socket stays open the whole `farewellMs` and a quick re-join meanwhile is refused as the hero's twin. | W7: BUILT 2026-10-10. The farewell rides whichever socket stands (THE RETURN's resumed one included) and the mirror's ack closes it; THE COMPLETED LEAVE resolves the farewell only once the socket has closed (the shard runs the leave before it answers the close), so a re-join right after it is a fresh seat; and the shard's belt finishes a said leave whose close it never heard before the same hero's return (probe_sharddoor F). |
| A6 | (found by W8a) A pocket on a wilds shell keeps `arena.boundless` from the surface (the zone message ships no boundless flag), so a cave draws as streamed ground with no border and the camera never clamps to it. | W8a: BUILT 2026-10-10, THE ZONE'S OWN BOUNDS: the zone message states its arena's `boundless` (absent = bounded) and every client's zone handling sets it from that word, so a pocket reads bounded (the clamp, the camera and the floor) and the surface boundless again on the climb-out; probe_shardcrossing D. |

What W7's build found beyond the audit (for her word where marked):

- A shard served on `localhost` or a LAN address was invisible to the old
  served-client check (only forwarded hosts counted), so even its own page
  offered `ws://localhost:8787`; THE SERVED MARK covers every host.
- A leave said mid-fight waited the whole farewell cap for a mirror that
  would never come; the held word now ends the wait at once.
- A reload under THE SPAWN GRACE is an untried seat and leaves at once, so the
  reloaded page's resume found nothing; the bound hero now logs back in by itself.
- The plain hearth wake moves the hero alone (its court stays where the
  graft stood it, beside the shadowed keeper); THE RETURN's landing carries the
  court, the hearth wake is left as found.
- FOR HER WORD: a hero bound to a world that is gone for good (a deleted
  codespace) has no road back to solo play; a deliberate "release this hero
  from its world" action would give it one.
- FOR HER WORD: a closed tab cannot hear its last mirror, so up to one beat
  (20 s) of a hero's progress is lost; a shard that keeps each hero's latest
  mirror and hands it back at the next login would close that, at the cost of
  card 6's "the hero is the client's".
- FOR HER WORD: the lobby's lone-vessel read takes a hero bound to another
  world to this one without a word (its binding moves with it).
- The listener's connection cap (64) still answers an HTTP 503 a browser's
  WebSocket cannot read; the seat cap (16) speaks first in practice.
- Found in the browser check: a real reload in Chromium drops the socket's
  last frame, so the `leaving` word alone never arrived; THE UNLOAD BEACON
  (`navigator.sendBeacon` to `/leave`) is the half that lands, and was added.
- Found in the browser check: the first Exit read "did not answer in time" because
  that hero had come back through THE RETURN in place: W8a's A5, built above.
- Found in the browser check, OUTSIDE W7's regions (for the wave that owns the
  renderer and the wire's actor rows): a hosted client's game loop dies the
  first time an enemy casts in view. `renderer.ts` drawActor's cast telegraph
  (`castTelegraphs`, on by default) calls `instanceDelivery(fc.inst)` on the
  client's cast stub, whose def carries no delivery (`net/snapshot.ts`, the
  remote cast row's adoption), so `inst.def.delivery.type` throws into
  reportFatal ("The run hit an error"). Reproduced twice on the Unbroken Wilds
  at the hearth; the probes and the soak draw nothing, so none of them can
  see it.

## §8 M0 receipts (2026-10-07, this pass)

**Built** (every file new unless named): `src/net/wsframe.ts` (the RFC 6455
codec, pure), `src/net/ws.ts` (`WsTransport`, the client role),
`server/shardTransport.ts` (the host role over `node:http` upgrade, input
sanitizing, keepalive, backpressure), `server/shardHost.ts` (`ShardHost`:
boot, the keeper seat, the host frame, the wire beats, persistence),
`server/shard.ts` (`npm run shard`), `tsconfig.shard.json` (joins `npm run
check`), `docs/engine/shard.md`, `balance/probe_shard.ts` + its roster row.
Seams in shared files: `Seat.keeper` + three one-line gates + THE MERCY
branch in `world.ts` (`keeperSeat`), three keeper skips in
`net/snapshot.ts`, the lobby's "Join a Server" row (`ui/lobby.ts`), the
lobby's `connect` callback in `main.ts`, the `shard` script in
`package.json`, the CLAUDE.md pointer. No change to any engine law; the
solo invariant holds by construction (no shard → no keeper → every gate
reads as before).

**The probe** (`npx tsx balance/probe_shard.ts`): 50 checks, ALL PASS —
the codec (masked, 70 KB, byte-fed fragmentation, control frames, the four
refusals), the boot (keeper tagged/untargetable/passive at the hearth, the
hosted seed, a hosted world never holds), the join (welcome seats p1 with
the seed, the zone lands before any snapshot, 15 snapshots in 60 ticks, no
p0 seat or actor row on the wire), the hand (inputs walk the hero 85 px
east in 45 ticks, seq acked), the hostile wire (a spoofed seat drives
nobody, malformed inputs/actions/session kinds never fault, non-JSON closes
and despawns), the party (1 player scales as one, 2 as two, the keeper
nothing), XP (the keeper banks none), THE MERCY (downed, never a wipe; still
down at 60% of reviveSec; up at 110%), the leave (socket drop despawns), and
persistence (a second host resumes the saved clock and 39-zone chart).

**The live walk** (worktree dev server on 5283 against `npm run shard --
--port 8787 --open --ephemeral`): the start menu's Co-op (Beta) → Rogue →
Join a Server → `ws://localhost:8787` → Connect seated the browser as p1
(`WsTransport`, `clientSeatId` p1, world seed 0xa942abc5); the shard log
reads `p1 joined as rogue`; after the welcome the shell applied the shard's
snapshots (46 actors, world clock 147 s), a held D key walked the hero
275 → 360 px with the host acking seq 83, and a second Node client read the
same snapshot with both seats and no keeper row (19 KB on the open
account). The pane's throttled rAF needed `__game.step()` to advance
frames — the standing harness gotcha, not a shard fault.

**Measured** (§1's table stands): ~1 ms per 60 Hz tick for a small wild
zone; 44-52 KB per snapshot of which 43.7 KB is the `memoryAccess` row
(chip filed on main); the shard's wire is otherwise ~1-19 KB per tick.

**M0.6, the same day — THE WILDS ON THE WIRE, walked live:** a browser
Warrior joined a `--worldmass --open` shard, the shell built its World with
the shard's town features, started the runtime inert (population 0, 994
doodads from the wire, 53 bodies from the wire, `walk === massRuntime.walk`),
walked out of the Waking House through its door, across the hearth's ward at
night, through the east gate and onto open country: the HUD read "The
Unbroken Wilds — Country Lv 1", the ground painted from the seed, natives
streamed around the shadowed keeper, and the dress beat re-shipped the zone
message four times on the way so forest oaks, standing stones, berry bushes
and brush stood where the server grew them. The probe's section P pins each
law headless, including the dress beat firing exactly once for a changed
roster and never for a still one.

**M0.5, the same day, on the seamless foundation** (branch rebased onto
`origin/codex/seamless-world-foundation` @ `67d9c290` with zero conflicts;
all three type-check lanes and the 50-check rig green on the new base):
`startWorldMass` under the keeper stood the Unbroken Wilds in 2.9 s;
600 ticks ran in 5.8 s (9.7 ms a tick) with 38 natives alive and no faults;
the zone message weighed 69 KB (813 doodads, 13 structures, `walk: null`),
the snapshot 18 KB with 48 actors; `clampPos` 400 px east of the keeper
answered real ground. Probe section K pins it: the runtime stands, three
seconds tick faultless, the welcome says `worldmass: true`, a joiner rides
the surface snapshot beside the natives. The shell does not render the
wilds yet (§3.12, THE WILDS ON THE WIRE).

**THE WILDS SAVE, the same day (branch `shard-wildsave`):** a `--worldmass`
shard is persistent. The write needed nothing new: `serializeWorldState()`
already embeds the mass half, from a live runtime or from the surface a
pocket left behind, so `ShardHost` keeps its save path on the wilds (its own
`shard_<seed>_wilds.json`, `SHARD_CFG.wildsSaveSuffix`) and the classic beat
writes it atomically. The read is new: `server/wildsSave.ts` `readWildsSave`
(the wrapper, the world schema, the mass checkpoint, the seed thread) and
`resumeWilds`, the mass lane's Continue order with the keeper as the player
(`adoptWorldState` → `startWorldMass(…, { restoreOnly: true })` →
`restoreMassSideareas` without the active pocket → `resumeSpawn('town')`, the
runtime's own hearth wake → `await prepareResumeNeighborhood` →
`finishResume`). Construction went two-phase: `ShardHost.ready()` resolves
after the resume, `listen` awaits it, and `tick`/`persist` refuse before it
(THE RESUME LAW; the CLI awaits `ready()` before `listen` and `start`). A save
that will not stand gives way to a fresh keeper world and a fresh wilds with
one log line, the refused file set aside beside it. The shard files took small
seams only: the keeper-world boot factored into `standKeeperWorld` for the
fallback, the `world` field writable for that one swap, and the classic
restore refusing a world half that carries `worldmass`.

The probe's section Q (`npx tsx balance/probe_shard.ts`, 14 new checks, ALL
PASS with A-P unchanged): a fresh wilds on its own file; 180 frames, then a
joiner set down east of the hearth walks 300 px over the wire (doodads
949→1128, population 17); `persist()` writes 3.92 MB in ~0.19-0.25 s with 8
natives and no `.tmp` left; THE RESUME LAW (until `ready()` the runtime stands
restore-only, a tick steps nothing and a persist writes nothing); the clock
back to the saved second (4.5500 vs 4.5500); the runtime finished and live
on the surface; 8/8 saved natives standing with the same body and wounds; the
keeper at the settlement's spawn (225, 226), saved ~3,400 px east of it; the
welcome carrying the same seed; 120 frames without a fault. The pocket: the
hearth's own cellar hatch entered through the engine's `enterSidezone` (the
sideareas probe's path), 30 frames and a write inside it (the surface it left
behind plus the active pocket), the resume waking the keeper at the hearth
with the pocket pinned, and the same hatch re-entering the same pocket. The
refusal: a tampered config hash (the world half adopts, the mass half
refuses) gives way to a fresh wilds with one log line and the file set aside.

**Measured** (this machine, partly under load from co-sessions): a fresh
wilds boots in 2.9-5.9 s; a resume stands up in 3.0-4.5 s (the constructor's
synchronous steps ~0.9-1.1 s, the first live update the rest); a persist costs
~0.19-0.27 s per write (3.9 MB: 2.2 MB of terrain edits, the hearth's
foundation and the frontier trails, and 1.3 MB of pinned adventure config), a
stall the bounded pump drops rather than replays once per `persistSec`. The
rig ran 21 s before section Q and 69-90 s with it on this machine (four wilds
boots and resumes plus ~550 frames; the spread is co-session load), so its
`fast` roster tier deserves a look.
**THE VESSEL + THE DEATH COVENANT** (card 6 as ruled, 2026-10-07; branch
`shard-vessel`; the contract is `docs/engine/shard.md` "The vessel and the
corpse"). Built: `server/vessel.ts` (THE JUDGMENT, the graft, THE MIRROR, the
covenant watcher), `server/corpses.ts` (the records file, the standing bodies,
the reclaim), `src/net/vesselWire.ts` (the rows and their sanitizers),
`src/meta/shardVessel.ts` (the client's link: the mirror's slot write, the
reckoning at home, the drawn bodies). Seams: `Account.accountId`, minted from
webcrypto by a profile's first load and never by `makeAccount` (sims and
probes stay byte-identical); `saveVesselMirror` and `throngRowsOf` in
`meta/character.ts` (the local save's throng fold lifted out, byte-identical);
four `SessionMsg` kinds (`heroSave`, `corpse`, `corpses`, `leaving`);
`PeerInfo.accountId`; the join's `accountId`/`vessel`; THE FAREWELL in
`WsTransport.leave`; the host's join extras (`ShardJoin`); one-line routes in
`ShardHost` (join, rejoin, leaving, tick, stop); the lobby's traveler line;
`onClientRunEnd` stages the death screen. No engine seam: the covenant reads
the down from the ShardHost side the tick it lands, ahead of THE MERCY's clock.
Beyond the card: a mortal vessel that LEAVES while down has fallen (no escape
through the door), each tombstone keeps THE LATE WORD its client is owed and
re-speaks it at any re-upload of that vessel (the client converges after a
crash or a lost socket; it wipes before it mints, so a reckoning can be lost
but never repeated), the farewell's requested mirror is throttled, and the
shard's `rejoin` now sends `newRun` before the re-seat's zone message (M0's
order reached the client before its shell and zone subscription stood up, so
a rejoined hero had no terrain — the covenant's own road back to the body).

Probe receipts (`npx tsx balance/probe_shard.ts`: 116 checks, ALL PASS, exit
0). L: a made account carries no id; a profile's first boot mints one and
every later load keeps it; a legacy cached save is minted and cached; a
malformed id is dropped; minting never draws the seeded stream; the id rides
the join to the host alone. M: `ShardVesselLink` saves the account before the
shard keys a record by its id; a 6.7 KB level-12
warrior seats at its level with its bag and doll over the lobby card; eight
hostile shapes and a twin upload fall back fresh; the mirror lands on the
persistence beat (1195 ticks) in the run slot with no world half and the
vessel's own ledger and run config; a late mirror never lands once another
run owns the slot; the farewell's last mirror lands before the close; the
mirror round-trips as the next upload. N: with an ally
standing the down stays co-op's; alone, the vessel falls (`corpse` then
`runEnd`; the body recorded at the death spot holding its 4 worn pieces; 60
carried, 60 minted; the client's credits, chronicle, death tally and run
counters; the slot wiped; the seat gone; the records file holding body and
tombstone); an Immortal vessel and a fresh hero are downed and the mercy
stands them up; the fallen vessel's stale save takes no seat and hears its
word again; a vessel downed beside an ally whose client leaves has fallen
(body, tombstone, the owed word), its unheard client re-uploads, hears
`corpse` then `runEnd`, mints 9 and wipes, and its class pick rejoins with
the terrain after its `newRun`. O: a second boot remembers the body; the
rejoin's fresh hero (terrain after `newRun`) finds it 1500 px from the
bedside, told by its own row; another account sees nothing and cannot
reclaim; the owner's dwell runs the corpse run's own clock, the 4 exact
pieces come home to its bag, the record clears on disk, the deed rides the
next row; a worldmass shard on the same directory keeps the tombstone while
its world half stays ephemeral. The rig now lets its sockets settle 600 ms
before `process.exit`:
Node on Windows asserted inside libuv when the exit landed mid-close, a red
exit code under `npm run probe` on an all-green rig.

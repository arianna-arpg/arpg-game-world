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
zone id, so the shell drops its runtime for the pocket and re-attaches when
the surface returns. Server side, two laws the single-focus runtime needs:
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
| M1 | THE SIM UNITS | unit registry, wake/sleep, `detachSeat`/`attachSeat`, per-unit snapshots, the keeper's world sweep, multi-presence `simView`, the chart on the wire | `shardWorld` (sweep gate, alias adoption, hand-off) | probe: two seats in two zones at once; byte-identical solo |
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
15. **Roads that move the whole party** (caravan, town portal, caves,
    classic portals) until per-seat travel exists — A: move everyone.
    B: move only when every connected player gathers, shown as a muster
    ring. C: seal them on shards (TODAY: sealed by THE SEALED ROADS).
    Rec: C while shards are friends-only; B is the first per-seat step.
    **RULED B FOR PARTIES ONLY (2026-10-08):** a party's road waits for the
    party at a visible muster ring; two independent players in one place
    are never moved together and travel home on their own. Until THE PARTY
    (card 23) exists the roads stay sealed (C).
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
    (2026-10-08): text chat is important, not paramount.**
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
    the lobby's connect answers 'connected' or 'mu'. Immortal vessels (roster
    saves) cannot travel yet — a later pass. THE KILLER'S DUE rides with it:
    on a shard a kill pays the killing seat alone until THE PARTY widens it.
    Cards 14, 18 and 21 are built; card 16 is in flight.

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
    probe_shardparty.ts):** the panel is the next commit; the muster ring
    (card 15 B) after it.

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

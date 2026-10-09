# The Shard — the headless host (M0 contract)

The charter is `docs/design/shard-world.md`; this is the engine-side contract
of what M0 built and how to run it. One sentence: **a shard is the game's own
co-op host with no renderer, running the real engine in Node and serving
players over WebSocket, and a client reaches it through the same transport
seam the WebRTC lane uses.**

## Running it

```bash
npm run shard -- --port 8787 --open
```

Or double-click **`Host Shard.bat`** (the Play Game.bat idiom: checks Node,
installs once, passes every argument through, opens the account). It calls
`npm.cmd` directly, which sidesteps PowerShell's "running scripts is
disabled" refusal of `npm.ps1`; in a PowerShell window the same fix is
`npm.cmd run shard`, or once per machine
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

| flag | meaning |
|---|---|
| `--port <n>` | listen port (default 8787; `0` = any free port, printed) |
| `--host <addr>` | bind address (default `0.0.0.0`) |
| `--seed <n>` | THE HOSTED SEED, hex with `0x` or decimal (default: a fresh roll) |
| `--class <id>` | the keeper's class (cosmetic; it never fights) |
| `--worldmass` | THE UNBROKEN WILDS: host the seamless foundation's continuous surface; a joining shell renders it from the seed (charter §3.12). Persistent like a classic world, to its own `shard_<seed>_wilds.json`; a saved one resumes in the mass lane's order before the first socket (`resumeWilds`, "Persistence on the wilds" below). |
| `--open` | THE OPEN ACCOUNT: every class, station feature and memory unlocked on the shard account (play-test servers) |
| `--ephemeral` | never write the world; default writes `saves/shard_<seed>.json` (`shard_<seed>_wilds.json` on the wilds) every `SHARD_CFG.persistSec` and on Ctrl-C. A world resumes when the shard starts again with the same `--seed`: the file is named by it |
| `--save-dir <p>` | where shard saves land |
| `--per-ip <n>` | sockets one address may hold (`SHARD_WIRE_CFG.maxPerIp`, default 8); `0` = no cap — behind a port forwarder (a codespace) every player arrives from the forwarder's one address |
| `--client <dir>` | THE SERVED CLIENT: a web build (`npm run build:web` → `site/play`, the default when it exists) handed out on plain GETs at `/`, so a hosted world is one link and client and server never drift; THE STATUS PAGE moves to `/status` |

A player joins from the start menu's **Co-op (Beta)** → class card → **Join a
Server** → `ws://<machine>:<port>` → Connect. A plain GET on the same port
(a browser tab on `http://<machine>:<port>/status`, or `/` when no client is
served) answers THE STATUS PAGE: the
world's kind and seed, the zone, the clock, uptime, the seated players, tick
time p50/p95, dropped ticks, faults and where it saves. Both launchers
(`Host Shard.bat`, the codespace's `start-shard.sh`) stand the Unbroken Wilds
with the open account by default; a restart with no `--seed` brings the
newest saved world of that kind back. The render shell, prediction,
the meta intents and the run-lifecycle channel are the co-op lane's,
unchanged. Type-checks ride `npm run check` (`tsconfig.shard.json` covers
`server/` with node types; `src/net/` stays browser-safe under the main
gate). The regression rigs are `balance/probe_shard.ts` (the fast half: the host, the wire,
the keeper laws, the wilds on the wire; `npm run probe -- shard`) and
`balance/probe_shardslow.ts` (the slow half: THE WILDS SAVE and THE VESSEL, several
wilds boots; `npm run probe -- --slow` or `npm run probe -- shardslow`); THE DORMANT
SEAT's is `balance/probe_sharddormant.ts`.

## The pieces

| piece | file | law |
|---|---|---|
| THE WIRE FRAME | `src/net/wsframe.ts` | RFC 6455 as pure functions over `Uint8Array`: text/binary/continuation, close/ping/pong, client masks unmasked, server frames written unmasked, oversize (1009) and malformed (1002) frames reported never thrown. Zero dependencies — THE CLEAN TREE. |
| `WsTransport` | `src/net/ws.ts` | the CLIENT role of `NetTransport` over the native `WebSocket`; `connect(url, info)` resolves `{ self, seed }` off the shard's welcome (THE SEED THREAD); `WireMsg` is `webrtc.ts`'s `NetMsg` grammar verbatim. A socket that dies before the welcome is the connect's failure; after it, `onHostLost`. `leave()` says the word (`session leaving`) before it closes (THE DORMANT SEAT, below). |
| `ShardTransport` | `server/shardTransport.ts` | the HOST role over `node:http` upgrade + the frame assembler. Seat ids bind to the CONNECTION at join; inputs and session messages are keyed by that binding, never by the seat a client claims. Every input is shape-checked (`sanitizeInput`); unknown session kinds drop; a congested socket is skipped (never stalls the loop); a keepalive ping reaps silent sockets; non-JSON or protocol errors close the socket and end its seat at once (THE REFUSED WIRE); any other lost socket leaves its seat DORMANT (below). |
| `ShardHost` | `server/shardHost.ts` | boot (`bootShardEngine`: shims, package factions, the content census; registrations via `src/sim/arena`'s import list), one `World` from a real expedition manifest, the host frame verbatim (`poll seats → applyInputs → drain meta intents → updateAI → update`), the zone message on change, the meta heartbeat, 20 Hz snapshots, the persistence beat, a bounded fixed-step pump that logs engine faults instead of dying. |
| THE HONEST INPUT | `net/intent.ts` (`HONEST_INPUT_CFG`, `mergeInputs`) / `World.walkFrames`, `World.moveBudget`, `World.passInputTime` / `SeatW.spd`, `SeatW.trc` → `World.ownWalk` / `net/predict.ts` | shard sync pass A (items 1, 18, 12, 16): the rubber band was built in, because a client predicted each frame at that frame's dt while the shard kept ONE input per seat per tick and walked it at its own tick's dt. Every client frame now carries `dt` (main.ts stamps its clamped frame dt; host and scripted seats send none, and an input with no dt walks the tick's dt exactly as before: THE SOLO INVARIANT). `mergeInputs` (the shard's transport and the WebRTC host alike) keeps the later axes, aim, held and seq, ORs every edge and meta edge, holds a slot pressed anywhere in the batch for the tick (THE QUICK TAP: a tap whose down and up land in one tick still casts its non-toggle skill), and gathers every dt-carrying frame into `moves` (at most `maxBatch`). `World.applyInputs` walks each move once at its own dt (clamped to `maxMoveDt`, the client's own frame clamp) under THE TIME BUDGET: a per-seat credit that starts at `graceSec`, refills with the input clock since the seat's last walk (raw tick seconds, never bent by timeflow, plus the seconds a stalled pump drops, which `passInputTime` credits before the catch-up runs; a WebRTC host credits what its own frame clamp cuts off), banks at most `bankSec`, and clips the move that would pass it (the rest refused and counted on `World.moveBudget`), so over its life a seat walks at most the clock plus the grace and a still frame claims nothing. The ack stays the last consumed seq; casts, aim and edges apply once per tick, and a step anywhere in the batch is a willed input (THE SPAWN GRACE ends on it). The seat row ships `spd` (`Actor.walkSpeed`: the moveSpeed stat with its status sources and a held stance's kit, the fold `moveActor` walks) and `trc` (`Actor.walkTraction`, absent on firm ground); `applySnapshot` writes them to `World.ownWalk`, which the shell's own hero walks in `moveActor` (the shell's statuses are display stubs), so a chilled or hasted hero predicts at the host's pace. The client's replay (`replayOwnFrames`) stamps the gait once per frame, a predicting shell (`clientActionHook`) leaves its own hero's walk pose to that local cycle, and `faceOwnAim` turns the hero to the aim it sends unless a cast or a lock holds it. Dials: `HONEST_INPUT_CFG.maxMoveDt` 0.05, `graceSec` 0.1, `bankSec` 0.5, `maxBatch` 240. Still open: the ground's own move scales (a road's boost, wading, scree) ride no row, so the shell misses them by their few percent until the ack; on slippery ground the shell still anchors without replaying (the momentum is the host's). Probe: `balance/probe_shardinput.ts`. |
| THE WILDS SHELL | `src/net/wildsClient.ts` | the render shell's half of a hosted Unbroken Wilds: `wildsShellAttach` starts the mass runtime restore-only (inert) from the welcome's seed on a World built with the shard's town features, `wildsShellStream` streams pages around the own hero each frame (the runtime's own streaming block over public members) and keeps the sky on the shard's clock, `wildsShellZone` re-seats the mass walk under the server's doodads on the surface and drops the runtime for a pocket. Wired from main.ts (`clientWilds`). |
| THE SHADOW / THE DRESS BEAT | `ShardHost` | on the wilds the keeper shadows the focus seat `SHARD_CFG.keeper.shadowOffset` px behind it each tick (the runtime streams, births and dwells around `world.player`); a changed doodad roster re-ships the zone message at most once per `SHARD_CFG.dressSec`. |
| THE WILDS SAVE | `server/wildsSave.ts` | a `--worldmass` shard's persistence: the classic `ShardSave` write already carries the mass half; `readWildsSave` reads the wilds' own file, `resumeWilds` stands it back up in the mass lane's resume order with the keeper waking at the hearth, and THE RESUME LAW holds every socket, tick and write until `ShardHost.ready()` resolves. |
| THE KEEPER SEAT | `Seat.keeper` (world.ts) | the parked p0: exempt from `partyScaleCount`, `grantXp`, absent from `serializeSnapshot`'s seats/actors/meta rows; in `updateDownedSeats` it is THE MERCY — a downed seat with no other standing seat rises after `keeper.reviveSec`, by clock, never by reach. THE WARDEN IS NO BODY: its hands take nothing (`pickupSeat`), it has no shoulder (`separateActors`), it is invulnerable (lava and water under THE SHADOW), THE WARDEN STANDS every tick in both lanes (flags re-worn, downed/dead cleared, its level mirroring the highest standing player's — the world's "character level" for event gates, vendor shelves and bounty work), a keeper world never concludes a wipe, and on a shard any seat may carry a quest item, take a giver's contract, claim a quest reward and swap gems against its OWN combat clock (the `localSeat` gates read the keeper). THE SEALED ROADS: the shard stamps the keeper's act clock every tick, so it is never idle and no station, mouth or portal ever fires off its standing — roads that would move the whole party stay shut until per-seat travel exists (card B). Absent on every non-shard world: the solo invariant. |
| THE NEAR LAW | `COOP_SCALING.shareRadius` (data/coop.ts), set by the shard to `SHARD_CFG.nearRadius` | a kill's XP pays only the seats within the radius of its place (`grantXp(amount, at)` from `kill`; zone and quest rewards stay world-wide), an enemy's party scale counts the seats near IT (`partyScaleCount(at)` → `scenePartyScaleCount(host, at)` in `engine/nativeScenePopulation.ts`, where the seamless lane keeps the scale), and the mercy counts an ally only within reach. 0 (the default every other lane keeps) is the old world-wide party, byte-identical. |
| THE HEARTH WAKE / THE SPAWN GRACE | `ShardHost.onJoin` / `hearthSeat` / `endGraces` | every joiner stands up on a free spot at THE HEARTH SEAT — the wilds' native settlement keeps its own bedside (`MassSettlement.spawn`, the same spot on a fresh or a resumed surface), a classic world's is where the keeper first stood — never beside the shadowed keeper, wherever THE FOCUS has walked it. The joiner is untargetable until its first WILLED input (a direction, a held or edged slot, a meta press) or `SHARD_CFG.spawnGraceSec`, whichever comes first; the grace is per seat, ends with the seat, and the keeper never wears one. |
| THE LAND DIGEST | `wildsSave.shellLandDigest` / `ShardTransport.land` / `wildsShellAttach(world, seed, land)` | the land is the seed's AND the preset's: a shell lays `startWorldMass`'s reservation over the build's preset, whose digest is the mass runtime's own `configHash`. The wilds save reader refuses (and the boot sets aside) a save whose digest differs — her ruling 2026-10-08: old saves are legacy, never migrated — and the welcome carries the digest the shard runs, so a client built on another preset refuses the join loudly instead of predicting against walls the server does not have. |
| THE KILLER'S DUE | `World.grantXp(amount, at, to)` / `seatOfRoot` | her ruling 2026-10-08 (the gameplay is single player's, never co-op's, until THE PARTY): with a radius set and the killing seat known (the credited killer's owner chain — a minion's kill is its keeper's), a kill pays that seat alone; an unowned kill still pays by reach. A party will widen "that seat" to its party. |
| THE SCOPED FREEZE | `Timeflow.chronoScope` / `ActorTimeFilter.within` / `World.castChrono` | card 18 B with C: on a shard every chrono cast bends a radius (`SHARD_CFG.chronoRadius`) around its caster and never the caster's own team — one player's stop never bends another player, a world-scoped spec becomes a bubble, an enemy's stop freezes the players inside its reach. Off a shard the spec's own scope stands. |
| THE PARTY | `server/party.ts` (`PartyDesk`, `PARTY_CFG`) / `net/partyWire.ts` / `ShardHost.onPartyWord` | card 23 (her word): the explicit social unit — players are independent neighbors until they group. A client's `party` session word (invite / accept / decline / leave / kick, `seat` naming the other) reaches the desk; an invite lands on its target as `partyInvite`, every refusal answers the asker as `partyWord` (one line); any member may invite, the leader exists for kicks (and the muster to come), a leaving leader hands the lead to the eldest member, a party of one dissolves, a seat gone from the world is gone from its party and its invites, invites lapse after `inviteSec`, the keeper is never seated. The snapshot carries `parties` (`PartyRow`s — ids only, a few bytes) on EVERY snapshot of a hosted world (`World.partyRows`, published by the host when the desk's `rev` moves; a client that applies only the newest of a queued run must never miss a change, so no change beat here). THE GROUP LAW (card 14, her clarification): `VesselDesk.partyHolds` — inside a party a lethal down is a DOWN while a mate stands, and the covenant fells every downed member at THE PARTY WIPE; ungrouped, the down is the death. THE KILLER'S DUE widens to the killer's party within the near radius (`World.sameParty` off `partyMates`). The status page lists the parties. THE PARTY PANEL (`ui/party.ts`, the menu's "Party" page, sealed off a hosted world) draws your party (the leader marked; leave; the leader kicks), the invitations that landed (accept / decline) and the ungrouped players around you (invite) off `World.partyRows`, the transport's peers and the session words the shell collects; it re-draws on `PARTY_PANEL_CFG.refreshMs`. |
| THE IDENTITY CUES | `data/identityCues.ts` (`HERO_NAME_CUE`, `PING_CUE`) / `engine/pings.ts` / `World.placePing` / `net/snapshot.ts` `pings` / renderer `drawPings` | card 17 A (her ruling): a name entered once, overhead names, world-anchored pings — shown, never told. THE NAME: a joined body wears the name it entered once (the vessel's own, else the join's — `ShardHost.onJoin`), it rides the actor row, and every OTHER player's hero wears it over the scalp (her gold for a party mate, ether for an independent neighbour, dimmed when down; `Settings.heroNames` 'all' / 'party' / 'off'); the co-op strip on a hosted world is YOUR party, never every neighbour. THE PING: the `ping` bind (keyboard `g`, pad unbound) sends the meta word `{ t: 'ping', x, y }` with the aim's world point (the pad's reticle when it owns the aim) — host-judged like every meta intent: `PING_CUE.cooldownSec` per seat refuses, a point beyond `maxReach` lands ON the reach ring along the bearing (never refused), ONE standing mark per seat (a new press replaces it), `lifeSec` on the world clock. The snapshot carries the live `pings` on every snapshot of a hosted world (the host's list is the truth each beat; the shell's optimistic mark is replaced by it). A mark is seen by its setter and the setter's party (`World.pingVisibleTo` over `sameParty`, which reads the desk on the host and the shipped rows on a client; solo and couch see every local mark): rings breathing out of the point under a bobbing beacon shard, and, off-screen, a chevron on the frame's inset edge facing it (`pingEdgePoint`). |
| THE LOGIN THROUGH MU | `main.ts connectToShard` | card 22: a join with a traveling vessel travels it; without one, Mu opens as in single player (the tutorial first, locally, for a virgin account) and the bedside wake travels the vessel it just saved; a fall reads its reckoning and drifts back into Mu bound for the same server. The lobby's connect answers 'connected' or 'mu'. |
| THE NEAR LAW AT THE MINT | `World.settleNearScale` | `createMonster` scales a body at its (0, 0) placeholder before its caller seats it, so with a radius set the scale is queued and settled where the body actually stands after each tick's update, and settled for every living enemy at a join (`addSeat` seats the newcomer beside the shadowed keeper before the hearth wake moves it) and at a leave. The life-fraction law is `rescaleEnemies`', which the engine keeps with its rounding (the seamless lane's brittles probe pins and replays it); the shard's settle clamps so no rounded life tops a fractional maximum, and a wilds save resumes "the same wounds" to the number. Off a shard the radius is 0 and the queue never fills. |
| THE DORMANT SEAT / THE RECONNECT TOKEN | `ShardTransport` (`onPeerDormant`, `release`, `onPeerResume`, `isDormant`), `ShardHost` (`onDormant`, `onResume`, `sweepDormancy`), `WsTransport` (`shardResumeFor`) | card 16 B (ruled 2026-10-08): a dropped socket is never a free escape. A socket that closes without its client's word (`session leaving`, which `leave()` always says) never despawns its seat: the hero lies DORMANT for `SHARD_CFG.dormantSec`, standing, input-less and fully targetable, on every roster and snapshot with no `pleave`, its vessel and corpse records kept (the corpse desk sleeps it: no reclaim dwell, no row to a socket that is gone). Dying meanwhile is the ordinary death (THE DEATH COVENANT reads a dormant vessel as any other, and its fall ends the dormancy at once); when the clock runs out the old leave path runs and the peers hear `pleave` then. Every welcome carries THE RECONNECT TOKEN (`resume.token`, `node:crypto`, minted at every join and turned at every resume); a `join` carrying `resume { seat, token }` that names a DORMANT seat re-binds the new connection to it (the same seat, actor and vessel record; no `pjoin`; the host re-ships the terrain, the whole meta, the bodies' row and an input ack from zero), and anything else (a wrong or spent token, a seat that is not dormant) joins fresh with one log line. The client keeps its last session (`{ url, self, token, at }`, page memory, `at` re-stamped when the host is lost) past a lost host; the lobby's Connect offers it to the same normalized address inside `WS_TRANSPORT_CFG.resumeWindowMs` (no auto-reconnect yet), and a deliberate `leave()` forgets it. THE UNTRIED SEAT (still under THE SPAWN GRACE: it never willed a step, so it has nothing to escape) and THE REFUSED WIRE (a socket the shard closed for breaking the grammar) leave at once, as does every seat of a closing shard. A dormant seat holds its place under `maxSeats`. The status page marks it (`dormant: true`, `dormantLeftSec`). |

## M0 semantics (honest, inherited from co-op)

- The whole party travels together (`loadZone` carries every seat); a seat
  cannot be in a zone the keeper is not in. Lifted by M1 (THE SIM UNITS).
- A joiner with no saved hero is a fresh level-1 hero of the chosen class
  with the base bar and no kit; it saves nothing when it leaves. A joiner
  WITH one travels as its VESSEL (below, "The vessel and the corpse").
- Every account-gated read rides the SHARD's account (THE KEEPER'S GATE):
  with a fresh account the hearth is a hamlet and no station answers; `--open`
  is the play-test answer until M2 (THE SEAT'S GATE).
- Events are the world's, seated around the keeper's zone. Lifted by M3.
- A player death with no other player standing is a DOWN, and the keeper's
  mercy stands it up where it fell after `SHARD_CFG.keeper.reviveSec`; the
  world never ends. A MORTAL vessel's such down is THE DEATH COVENANT
  instead (below); Immortal vessels and fresh heroes keep the mercy.
- The wire is the co-op snapshot (full state, JSON, 20 Hz, no interest
  management) under THE WIRE DISCIPLINE's first row: the account-derived
  `memoryAccess` view rides every `WIRE_CFG.memoryAccessBeat`-th snapshot
  (30, i.e. 1.5 s) instead of all of them, and a client keeps the last row it
  saw — a quiet snapshot fell from 45 KB to 1.6 KB.

## Persistence on the wilds

A `--worldmass` shard is persistent like a classic one. THE WRITE is the
classic beat unchanged: `ShardHost.persist()` wraps
`World.serializeWorldState()` in the `ShardSave` wrapper and writes it
atomically (tmp + rename) every `SHARD_CFG.persistSec` and at `stop()`. The
mass half needs no writer of its own because the world half already embeds
it: `worldmass` is the live runtime's `snapshot()` (terrain edits, claims,
every native body with its spot and wound, the settlement, sites, ecology,
sky), or, while a native pocket owns the scene, the surface the world left
behind at the mouth; `massSideareas` carries the pockets the surface minted.
The wilds write their OWN file, `shard_<seed>_wilds.json`
(`SHARD_CFG.wildsSaveSuffix`), so neither lane can adopt or overwrite the
other's world, and a classic restore refuses a world half carrying
`worldmass`. `readWildsSave` also refuses a checkpoint whose run is another
seed's (THE SEED THREAD: a joining shell lays the land from the welcome's
seed).

THE READ is `resumeWilds` (`server/wildsSave.ts`): the mass lane's own
Continue order (`src/meta/resumeWorld.ts`) with the keeper as the player.

1. `adoptWorldState(ws)`: the graph, the clock, zone memories, quests, overlays.
2. `startWorldMass(run seed, ws.worldmass, { restoreOnly: true })`: the
   surface, its natives and settlement, inert.
3. `restoreMassSideareas(…, strict)`: the pockets' roots and pinned caves,
   never the active pocket.
4. `resumeSpawn('town', …)`: on a live runtime the START_ZONE load is the
   runtime's own `wake`, at the settlement's spawn.
5. `await prepareResumeNeighborhood(world, …)`.
6. `finishResume(world)` under the world's own global policies.

THE HEARTH WAKE LAW: the keeper wakes at the hearth, never 'exact' at its
saved spot. THE SHADOW moves it onto the first focus seat anyway, and a world
nobody stands in breathes around its hearth. A save taken inside a pocket wakes
on the surface with the pocket still pinned to its mouth: the same mouth
re-enters the same pocket, and its zone memory rides the world half, so its
survivors stand while the memory's TTL holds.

THE RESUME LAW: construction is two-phase. The constructor runs steps 1-4
and `ShardHost.ready()` resolves after 5-6; until then the shard answers no
socket (`listen` awaits `ready`), steps no tick and writes no save, so no
player and no frame ever meets a half-stood world. The CLI awaits `ready()`
before `listen` and `start`; an in-process host awaits it before its first
tick. A save that will not stand (an unreadable or refused wrapper, another
seed's run, a checkpoint the runtime rejects after the world half adopted)
gives way to a fresh keeper world and a fresh wilds with ONE log line, and its
file is set aside as `<save>.refused-<ms>` so the next persist beat never
overwrites the only copy. Probe section Q pins all of it, the pocket and the
refusal included.

Measured (probe section Q, seed `0x0ddba11`, after a 300 px walk into open
country): the save weighs ~3.9 MB (2.2 MB of it terrain edits, the hearth's
foundation and the frontier trails; 1.3 MB the pinned adventure config) and
`persist()` takes ~0.19-0.27 s, a stall the bounded pump drops rather than
replays once per `persistSec`; a fresh wilds boots in 2.9-5.9 s and a resume
stands up in 3.0-4.5 s (the constructor's synchronous steps ~0.9-1.1 s, the
first live update the rest).

## The vessel and the corpse

Card 6 as ruled (her word, 2026-10-07): the shard's world persists; the hero
is the client's. A client keeps its hero save and uploads it at login; the
shard mirrors it home; a MORTAL vessel's death leaves its corpse on the shard
and ends that player's run, "equivalent to having their character die in a
normal run", and the next hero of the same account can walk back to the body
and reclaim it. Immortal vessels keep THE MERCY.
THE IMMORTAL TRAVELS: a roster vessel travels too and its mirrors land in its
own roster slot (its card refreshed, the shared Continue untouched), because
the bedside wake names its hero by `charId` (`connectToShard(url, classId,
{ charId })` → `readTravelingVessel(account, charId)`) while the lobby reads
the run slot first, else the one standing roster card
(`balance/probe_shardimmortal.ts`).

| piece | file | law |
|---|---|---|
| THE IDENTITY | `meta/account.ts` (`accountId`, `ensureAccountId`, `isAccountId`) | every profile's account carries a stable random 128-bit hex id, minted once by its first load (`ensureAccountId` in `loadAccount`/`loadAccountAsync`: the synchronous boot load mints in memory, the disk-first load adopts that id or the cache's and caches it; the disk takes it with the account's next ordinary write, because a compatible boot never writes the disk, and `ShardVesselLink` saves the account before a shard keys any record by it; a save that predates it mints at its next load) from `crypto.getRandomValues`, never `Math.random` (the seeded stream never moves). `makeAccount` and `deserializeAccount` never mint and `serializeAccount` omits an empty id, so every sim and probe account stays byte-identical (THE SOLO INVARIANT: a parity rig comparing two worlds' accounts caught the first, eager draft). The `join` carries it; the host keeps it per seat and NEVER re-broadcasts it (the welcome/pjoin roster rows omit it). It keys this player's own records and nothing else. |
| THE VESSEL | `server/vessel.ts` (`VesselDesk`, `judgeVessel`) | the `join` may carry `vessel`: the client's hero as a CharacterSave with NO world half (the couch guest's shape; `meta/shardVessel.ts` `readTravelingVessel`: the hero the wake names, else the run slot's, else the lone standing roster vessel; a fallen one never travels). THE JUDGMENT (structure, finite numbers, size, schema, class, character id, then `rebuildSavedMeta`) gates it; a vessel that fails, has no account id, already fell here, or already walks the world joins as the fresh card hero with one log line. The graft is the couch guest's (`rebuildSavedMeta` + `World.adoptSeatMeta`) plus the seat-scoped half of `applySavedCharacter` (the seated heal, flask banks, primed pours, guard clocks, fielded bonds and rosters; bonds whose skill the build lacks sleep and ride home as they came). The uploaded class wins over the lobby card. |
| THE MIRROR | `VesselDesk.mirror` | on the persistence beat (`SHARD_CFG.persistSec`, ephemeral worlds too), at THE FAREWELL (`session leaving`: the client's `WsTransport.leave()` holds the socket open for the last mirror, up to `WS_TRANSPORT_CFG.farewellMs`; honored once per `VESSEL_CFG.farewellEverySec`) and at a clean shutdown, the shard ships `session heroSave` to that seat alone: `serializeCouchGuest`'s shape, no world, the build and carry as the shard holds them, and the vessel's own run ledger, run config, contracts and sleeping bonds passed through verbatim (never the shard's). The client writes it to the hero's own slot (`saveVesselMirror`: the shared Continue slot for a run-mode vessel, its own card's slot for a roster vessel), honoring only the vessel it sent, and only while the shard session is current or no other run is live (a farewell's late mirror never overwrites a new run's save). |
| THE DEATH COVENANT | `VesselDesk.tick` → `fall` | a vessel whose stage's `onDeath` is `'end'` (read from `meta/modes.ts`, never a mode id) and whose down only THE MERCY would answer (`VESSEL_CFG.covenantAt` `'mercy'`: while another player stands, the down stays co-op's to revive) FALLS that same tick, before the mercy's clock could ever stand it up: its worn and side-board gear (`captureLoot`, the DeathRecord's own policy) is recorded as a corpse keyed by account (caves and empty carries leave none, the corpse run's law), its fall is TOMBSTONED, the client hears `corpse` (where it lies + the reckoning the shard appraised: the seat's carried essence at the mortal exchange times the stage's rate) then `runEnd`, and the seat leaves the world. A mortal vessel whose client LEAVES while it is down has fallen too (leaving is never the road out of a death). `updateDownedSeats`' law is untouched (no engine seam). |
| THE LATE WORD | `ShardCorpses.markFallen` / `VesselDesk.seat` | each tombstone keeps the word its client is owed (the note + the reckoning). A re-upload of a fallen vessel never takes a seat: it hears `corpse` then `runEnd` again, so a client that never heard (a crash, a dropped socket, a leave while down) runs its reckoning and wipes its slot, and its class pick's `rejoin` seats a fresh hero. The client wipes BEFORE it mints, so a crash between the two can lose a reckoning but never repeat one. |
| THE RECKONING, at home | `meta/shardVessel.ts` (`ShardVesselLink`) | the client mints the shard's appraisal into its own account (credits, the chronicle row, the death tally, its own run counters, class claims, released contracts), wipes its run slot (permadeath), and shows the ordinary death screen naming the ground, then the Vault, then the class pick whose `rejoin` re-seats a fresh hero under the same account id (the shard now sends `newRun` BEFORE the re-seat's zone message: the client's shell and its zone subscription stand up on `newRun`, so M0's order left a rejoined hero without terrain). No local corpse is recorded: the body is the shard's. |
| THE CORPSE RETURNS | `server/corpses.ts` (`ShardCorpses`) | the records file `saves/shard_<seed>.records.json` (bodies + tombstones; written on change, loaded at boot, kept beside the world save but independent of it: `--worldmass` and other ephemeral worlds still remember their dead; absent only under `--ephemeral`). Any seat that named the account sees that account's bodies in its zone (static zones by id; a churned generated id re-binds by map coordinate inside `CORPSE_MATCH_RADIUS`), drawn on its own shell from `session corpses` rows sent to it alone. The reclaim is the corpse run's dwell (`'corpse_reclaim'` transit row: reach, discipline, clock) for the owning seat only; the gear comes home into THAT seat's bag (ground drops are not owner-gated on a shared world; a full bag spills at its feet as owed property), the record clears, and the claimant's account deed rides the next row. |

Wire rows (types and sanitizers in `src/net/vesselWire.ts`):

| row | direction | carries |
|---|---|---|
| `join { accountId?, vessel? }` | client → shard | the account id; the hero (CharacterSave, no world) |
| `session heroSave { save }` | shard → one seat | the vessel's mirror |
| `session corpse { note, reckoning }` | shard → one seat | `ShardCorpseNote` (id?, charId, name, classId, level, zoneId, zoneName, pos, pieces, diedAt) + `ShardReckoning` (rows, carried, mult, minted, renown, level, zones, kills, modeId, modeStage); `runEnd` follows. Sent at the fall, and again (THE LATE WORD) at any re-upload of the fallen vessel |
| `session corpses { zoneId, bodies, reclaimed? }` | shard → one seat | its own standing bodies (`ShardBodyRow`: id, x, y, classId, level, dwell) + reclaims since the last row |
| `session leaving` | seat → shard | THE FAREWELL: mirror me before my socket closes; and THE DELIBERATE LEAVE: that close ends my seat at once, never dormant |

Honest limits: a fresh hero (no upload) keeps M0's semantics (no mirror, the
mercy); trust is the claim tier (the shard believes a well-formed vessel, the
client believes the shard's reckoning); the reclaim's corpse deed reaches the
account, other shard deeds (kills, discoveries) still feed the shard's account
until M2's account deltas; account Relics never travel (the save excludes
them) and a shard death does not run the pack-Relic loss; the client's world
map does not mark a shard corpse (the shell's map is its own until the chart
rides the wire).

## Dials

`SHARD_CFG` (server/shardHost.ts): `tickHz` 60, `stateHz` 20,
`metaHeartbeatSec` 1.5, `persistSec` 20, `maxCatchUpTicks` 5,
`keeper { classId, name, reviveSec 8, shadowOffset 0 }`, `nearRadius` 1600, `dressSec` 4, `spawnGraceSec` 20, `chronoRadius` 900,
`dormantSec` 30 (THE DORMANT SEAT: world seconds a lost socket's hero stands before the leave path runs), `saveDir`,
`PARTY_CFG` (server/party.ts): `maxMembers` 6, `inviteSec` 60;
`wildsSaveSuffix` `'_wilds'` (THE WILDS SAVE's own file, `wildsSave`), `faultLogSec` 5, `telemetryTicks` 600;
`WILDS_CLIENT_CFG.surveyEveryFrames` 30 (src/net/wildsClient.ts). `SHARD_WIRE_CFG`
(server/shardTransport.ts): `maxClientMessage` 256 KB, `sendBufferCap` 96 KB,
`pingSec` 15, `reapSec` 45, `maxSlots` 16, `resumeTokenBytes` 16 (THE RECONNECT TOKEN, hex on the welcome). `WS_TRANSPORT_CFG.defaultUrl`
(src/net/ws.ts) is the lobby box's first offer (the box remembers the last
address that seated you, `localStorage` key `hw_shard_url`), `defaultPort` 8787
the port a bare host name is given, `connectTimeoutMs` 10 s how long a connect
waits for a welcome before it fails as silence; `normalizeShardUrl` turns the
`https://` address a codespace shows into `wss://`, `http://` into `ws://` and a
bare host into `ws://host:8787`; `farewellMs` 1500 is how long
a leaving vessel holds its socket for the last mirror; `resumeWindowMs` 30 s is how long after a
lost session the lobby's Connect still offers its seat and token (THE RECONNECT TOKEN). `WIRE_CFG.memoryAccessBeat`
(src/net/snapshot.ts) is the account-view beat; the view is built every tick and
also ships on any tick it differs from the one this world last shipped (THE CHANGE
BEAT), so a graduation reaches every client on the next snapshot and the beat only
re-sends an unchanged view.

## THE SOAK — load and endurance

```bash
npm run soak:shard -- --bots 10 --seconds 120
```

`balance/soak_shard.ts` boots a REAL `ShardHost` in its own process (the
Unbroken Wilds on the open account, ephemeral), listens on a free loopback
port and runs the host's own wall-clock pump (`ShardHost.start()`, the CLI's),
so pacing, catch-up and dropped ticks are a hosted world's, never
probe-stepped. THE FLEET (`balance/soak_bots.ts`) is forked into a process of
its own: N clients parsing every snapshot would otherwise share the server's
event loop, heap and GC, and the numbers would be the bots' as much as the
world's. Every bot is the shipped client (`WsTransport` over Node's
`WebSocket`) with a small brain: a random walk that re-picks its heading every
1-3 s inside ±1500 px of the hearth (turning home past the edge), aiming at
the nearest live `team === 'enemy'` row within 400 px and standing to hold
slot 0 while one is within 160 px. The classes are dealt round-robin (warrior,
magician, rogue, necromancer). Inputs ride THE FLEET'S CLOCK at a true 60 Hz,
a browser's frame clock: on Windows (15.6 ms timers) the fleet spins one core
on `setImmediate`, elsewhere it sleeps to a millisecond short of each frame.

The run has three phases:

1. **Warm-up** (measured apart, never gated): the bots join 200 ms apart, so
   THE HEARTH WAKE and THE SPAWN GRACE run as in play. Once the first two
   stand seated they form a party over the session wire (`party invite`, then
   the invitee's `accept` on its `partyInvite`), so THE GROUP LAW and the
   party rows ride the soak.
2. **The window**: `--seconds` of steady load, opened and closed by a forced
   full GC, so the heap reads LIVE memory at both edges. It is sampled every
   5 s. At its midpoint the last bot's socket is closed without `leave()`
   (no `session leaving`, so THE DORMANT SEAT) at its first quiet moment (no
   foe in sight, up to 15 s), and 5 s later a new transport takes the seat
   back with the token its welcome left (`shardResumeFor`, read right after
   each bot's own welcome: THE REMEMBERED SESSION is one per page and the
   fleet shares one module). A bot whose fresh hero falls (`runEnd`) answers
   with its class pick's `rejoin` 3 s later, so the load never thins.
3. **Teardown**: every bot leaves with its word and the host stops.

| flag | meaning |
|---|---|
| `--bots <n>` | bot players (default 10; the door caps grow to the fleet, and `maxPerIp` is lifted as the CLI's `--per-ip 0` does, since every bot arrives from one address) |
| `--seconds <s>` | the measured window (default 120) |
| `--seed <hex\|dec>` | THE HOSTED SEED (default `0x0ddba11`, the probe's wilds: one fixed world, so runs compare; `Math.random` is seeded from it too, so the boot draws the same world) |
| `--classic` | a classic world (the hearth) instead of the Unbroken Wilds |
| `--no-drop` | skip THE DORMANT SEAT's cut (also `--drop off`) |
| `--report <path>` | the JSON report (default `balance/reports/soak_<stamp>.json`, gitignored) |
| `--thresholds <path>` | the gates (default `balance/soak.config.json`) |

Exit 0 means every gate held, 2 a breach (each one named), 1 that the harness
itself failed.

**What it reads.** One seam in the shard's own code: `ShardTransport.bytesOut`
and `framesOut`, bumped in `write()` for every frame handed a socket. The
rest is metered on the instances (the pump calls `this.tick`, the host calls
`this.net.*`), so no engine or host code changes: the tick time around every
`ShardHost.tick`; one snapshot's encoded size as the counters' bytes ÷ frames
around `sendState` (written once per socket, never encoded twice); zone bytes
around `sendZone`/`sendZoneTo`; FED, the share of seat-ticks whose
`drainInputs` held that seat's input; pump wakes (ticks that start more than
0.5 ms after the previous one ended); THE SHADOW's jumps (the keeper moving
more than 300 px in one tick: a new focus seat); every V8 pause from a `gc`
`PerformanceObserver`; the heap polled every 250 ms (each window keeps its
trough); `host.status()`, and the shard's own dormancy, resume and party
ears for the drop and the party.

**The gates** (`balance/soak.config.json`; each row documents itself there).
All are read over the window. `require: false` turns a boolean gate into a
report-only row.

| gate | limit | reads |
|---|---|---|
| `tickP95Ms` | ≤ 20 ms | the 95th-percentile host tick (engine step, snapshot serialize and encode, the wire, the beats), set for 10 bots; the 60 Hz budget is 16.7 ms |
| `droppedShare` | ≤ 5% | ticks the pump dropped to bound a stall ÷ (stepped + dropped) |
| `heapGrowthMB` | ≤ 64 MB per 120 s | the live heap at the window's close minus its open, the fleet seated at both edges (growth under constant load, not the seats' cost); never less than 64 MB for a shorter window |
| `faults` | 0 | `ShardHost.faults + ShardTransport.faults` over the whole soak |
| `errors` | 0 | the harness's own failures: a bot never seated, a welcome with no token, a socket lost without the cut, a fleet that died early, THE BREAKER, seats left standing |
| `resume` | required | the cut seat lay dormant on the shard AND the same seat id came back (the shard re-bound it, the client heard `resumed`) |
| `party` | required | the shard's own `PartyDesk` rows held both founders |

**Reading the table.** One row per 5 s sample: `seats` (non-keeper; `*` = a
seat lay dormant), `conn` (sockets bound to seats), `actors`, the window's
tick p50/p95/max and dropped ticks, `wake/s` (pump wakes a second), `fed`, the
p95 snapshot, outbound kB/s per client (kB = 1000 bytes), and the heap's
trough in MB. Below it: the run's tick percentiles; the worst 5 s window; the
five slowest ticks, each with any GC or shadow jump inside it; dropped ticks;
GC pauses (how much landed inside ticks); the pump (wakes/s, ticks per wake);
shadow jumps; fed; the warm-up; snapshot sizes; outbound per client split
into snapshots, zone and other; the heap edges (plus the troughs' slope); the
dormant seat; the party; the bots (deaths, rejoins); errors; then the gates.
The JSON adds every sample, the per-bot stats, the slowest ticks of both
phases, the GC breakdown by kind and the host's log.

**How to read fed and the wakes.** `World.applyInputs` steps a seat that has
no input this tick not at all, and two client frames that land in one wake
merge into one tick of movement (`mergeInputs`: the edges are kept, the walk
is not). So fed is the share of server ticks a remote hero actually walks.
The pump's wake rate follows the host's timer resolution: Windows wakes a
16.7 ms interval on its 15.6 ms system tick (about 32 Hz, two ticks per wake)
unless some process has raised the resolution, so a Windows soak can swing
between runs. The `wake/s` column says which world a run measured.

**Measured** (2026-10-09, i9-10900K × 20, Windows 10, Node 24.9, with
co-sessions holding ~45-50% of the CPU). Four bots, 60 s: tick p50 7.1 /
p95 11.6 ms, nothing dropped, fed 92% at 54 wakes/s; an earlier run under
coarse timers and heavier load read p95 24.5 ms (a breach), 4.3% dropped,
fed 55% at 22 wakes/s. Ten bots, 120 s, three runs: tick p95 17.3 / 21.1 /
20.4 ms against the 20 ms gate (p50 10.1-13.2 ms), 0.25-2.3% dropped, fed
52-78%, heap +3.8 to +5.6 MB, no faults; the dormant seat resumed and the
party formed every time. A wilds snapshot weighs 23 kB at four players (78%
actor rows, 17% the vendor shelf, which rides every snapshot between
restocks) and 27 kB at ten: at 20 Hz, ~540 kB/s per client, ~5.4 MB/s of
egress for ten. The tick spikes (100-490 ms) are mostly `massRuntime.update`
(10 of the 12 slowest ticks in a 90 s attribution pass): the wilds' warm
queues (`geographicWarm`, `nativeWarm`, `processionWarm`) run inline when
`typeof Worker === 'undefined'`, which is always true on Node. A classic
world's tick reads p50 2.7 ms.

## Hosting on Codespaces

A codespace on this branch is a SESSION HOST, not a server: it runs while
someone is using it and stops after its idle timeout (5 to 240 minutes,
default 30; player traffic is not activity, only typing, the mouse and a
terminal are), it always stops within 12 hours, and starting it again brings
back the same world and the same address. The always-on answer is the VPS
(charter card 11). A 2-core codespace spends 2 core-hours per hour of the
120 (Free) or 180 (Pro) a personal account gets each month.

`.devcontainer/devcontainer.json` makes the codespace ready: Node 22,
`npm ci` and the web client built (`npm run build:web`) on create, port 8787
forwarded, and `start-shard.sh` at every start and attach. The script stands
the shard up DETACHED — its own session (`setsid`) with the hangup ignored,
because a lifecycle hook runs under a terminal whose hangup reaches every
process left in its session and Node undoes `nohup` at boot — under a
supervisor that restarts THE BREAKER's exit (2), a close fault (3) or a crash
after five seconds from the newest saved world (a clean exit stays down), one
lock making it idempotent, the log in `shard.log`, the world in the
codespace's `saves/`. Flags ride the `SHARD_ARGS` secret (default
`--port 8787 --open --worldmass`; the script prepends `--per-ip 0` because
every player arrives from the forwarder's one address). The shard speaks plain
HTTP and WebSocket; the forwarder adds TLS, so the public address is always
`https://<name>-8787.app.github.dev` and the client turns it into `wss://`.
With the client served by the shard itself (THE SERVED CLIENT), that one
https address is both the game and the server: its lobby offers the shard
that served it.

1. Once, before creating it: Settings → Codespaces → Default idle timeout →
   240 minutes. Optionally add the `SHARD_ARGS` secret with access to this
   repository (a changed secret applies at the next start).
2. Create it: the repository → branch `shard-world` → Code → Codespaces →
   New with options → 2-core; or
   `gh codespace create -R arianna-arpg/arpg-game-world -b shard-world -m basicLinux32gb --idle-timeout 240m`
   (the CLI needs the `codespace` scope: `gh auth refresh -h github.com -s codespace`).
3. Wait for the creation log to finish `npm ci` and the build. Then
   `tail shard.log` shows "listening" and `curl -s localhost:8787/status`
   prints the status JSON.
4. After EVERY start: make the port public — Ports → 8787 → Port Visibility →
   Public, or `gh codespace ports visibility 8787:public -c <name>`
   (`gh codespace list` shows the name). The script tries this itself once the
   shard answers; visibility can revert on a restart, so check it each time.
   Nothing in `devcontainer.json` can set it.
5. Open `https://<name>-8787.app.github.dev/` in a private browser window.
   A browser meets GitHub's one-time "Codespaces Access Port" page first —
   press Continue once (it sets a cookie; the game's own sockets ride it) —
   then the game's start menu (or, with no served client, the status JSON).
   A GitHub sign-in page means the port is private; any other page means
   the WebSocket will fail too. `curl` and the game's sockets never see the
   interstitial.
6. Players open the same link: Co-op (Beta) → Join a Server → Connect (the
   address is already their own page's), or paste the https address into a
   client built from this branch — THE LAND DIGEST refuses a build that lays
   another land.
7. Keep the codespace's tab open while playing. When it stops, start it again
   at github.com/codespaces and repeat steps 4 and 5; the shard resumes the
   newest `saves/shard_*` world and loses at most `SHARD_CFG.persistSec`.
8. Stop it after a session (`gh codespace stop -c <name>`). Back up before the
   30-day deletion of a stopped codespace:
   `gh codespace cp -e -r -c <name> 'remote:/workspaces/arpg-game-world/saves' ./shard-saves/`.
9. Look inside: `gh codespace ssh -c <name> -- 'tail -20 shard.log'` (the
   sshd feature); `gh codespace logs -c <name>` shows the creation log.
10. To update: `git pull && npm ci && npm run build:web`, then
   `pkill -f server/shard.ts` (a clean exit stops the supervisor) and
   `bash .devcontainer/start-shard.sh`; served clients update with it.

With the port public, anyone with the link reads the status page (the seed,
the zone, every seated player's name and level) — fine among friends.

THE VESSEL: `VESSEL_CFG` (server/vessel.ts): `maxBytes` 240 KB (under the
wire's 256 KB frame cap), `maxLevel` 999, `maxDepth` 24, `maxNodes` 60000,
`maxString` 4096, `maxName` 64, `maxCharId` 64, `maxBar` 32, `maxItemUid`
2^31-1, `covenantAt` `'down'` (her ruling 2026-10-08, card 14 C: every lethal
down of a mortal vessel is its death, as in single player; `'mercy'` is the old
law — a mortal fell only when no other player stood to kneel), `freshHeroDies`
true (THE FRESH HERO'S END: a vessel-less seat's down ends it too — `runEnd`, the
seat gone, nothing to reclaim), `farewellEverySec` 2. The mirror rides `SHARD_CFG.persistSec`. `SHARD_CORPSE_CFG`
(server/corpses.ts): `perAccount` = `MAX_DEATH_RECORDS` (3, the account
ring's size), `fallenPerAccount` 64, `schema` 1, `reclaimRadius` 110 /
`reclaimDwell` 1.0 (fallbacks behind the `'corpse_reclaim'` transit row),
`clampRadius` 16, `dwellStep` 0.1, `flash` (64 px, 0.5 s, the reclaim gold).
`VESSEL_WIRE_CFG` (src/net/vesselWire.ts): `maxText` 96, `maxValue` 1e9,
`maxBodies` 32.

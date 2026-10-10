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
| `--ephemeral` | never write the world; default writes `saves/shard_<seed>.json` (`shard_<seed>_wilds.json` on the wilds) every `SHARD_CFG.worldSaveSec` and on Ctrl-C. A world resumes when the shard starts again with the same `--seed`: the file is named by it |
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
SEAT's is `balance/probe_sharddormant.ts`, THE ACTING SEAT's `balance/probe_shardseat.ts`, THE SMOOTH SHELL's `balance/probe_shardshell.ts`, THE SIM UNITS' `balance/probe_shardunits.ts` (THE ROADS PER PLAYER's F and H there, the wilds pocket road in `probe_shardslow.ts` S), THE WIRE DIET's `balance/probe_sharddiet.ts`.

## The pieces

| piece | file | law |
|---|---|---|
| THE WIRE FRAME | `src/net/wsframe.ts` | RFC 6455 as pure functions over `Uint8Array`: text/binary/continuation, close/ping/pong, client masks unmasked, server frames written unmasked, oversize (1009) and malformed (1002) frames reported never thrown. Zero dependencies — THE CLEAN TREE. |
| `WsTransport` | `src/net/ws.ts` | the CLIENT role of `NetTransport` over the native `WebSocket`; `connect(url, info)` resolves `{ self, seed }` off the shard's welcome (THE SEED THREAD); `WireMsg` is `webrtc.ts`'s `NetMsg` grammar verbatim. A socket that dies before the welcome is the connect's failure; after it, `onHostLost`. `leave()` says the word (`session leaving`) before it closes (THE DORMANT SEAT, below). |
| `ShardTransport` | `server/shardTransport.ts` | the HOST role over `node:http` upgrade + the frame assembler. Seat ids bind to the CONNECTION at join; inputs and session messages are keyed by that binding, never by the seat a client claims. Every input is shape-checked (`sanitizeInput`); unknown session kinds drop; a congested socket is skipped (never stalls the loop); a keepalive ping reaps silent sockets; non-JSON or protocol errors close the socket and end its seat at once (THE REFUSED WIRE); any other lost socket leaves its seat DORMANT (below). |
| `ShardHost` | `server/shardHost.ts` | boot (`bootShardEngine`: shims, package factions, the content census; registrations via `src/sim/arena`'s import list), one `World` from a real expedition manifest, the host frame verbatim (`poll seats → applyInputs → drain meta intents → updateAI → update`), the zone message on change, the meta heartbeat, 20 Hz snapshots, the persistence beat, a bounded fixed-step pump that logs engine faults instead of dying. |
| THE HONEST INPUT | `net/intent.ts` (`HONEST_INPUT_CFG`, `mergeInputs`) / `World.walkFrames`, `World.moveBudget`, `World.passInputTime` / `SeatW.spd`, `SeatW.trc` → `World.ownWalk` / `net/predict.ts` | shard sync pass A (items 1, 18, 12, 16): the rubber band was built in, because a client predicted each frame at that frame's dt while the shard kept ONE input per seat per tick and walked it at its own tick's dt. Every client frame now carries `dt` (main.ts stamps its clamped frame dt; host and scripted seats send none, and an input with no dt walks the tick's dt exactly as before: THE SOLO INVARIANT). `mergeInputs` (the shard's transport and the WebRTC host alike) keeps the later axes, aim, held and seq, ORs every edge and meta edge, holds a slot pressed anywhere in the batch for the tick (THE QUICK TAP: a tap whose down and up land in one tick still casts its non-toggle skill), and gathers every dt-carrying frame into `moves` (at most `maxBatch`). `World.applyInputs` walks each move once at its own dt (clamped to `maxMoveDt`, the client's own frame clamp) under THE TIME BUDGET: a per-seat credit that starts at `graceSec`, refills with the input clock since the seat's last walk (raw tick seconds, never bent by timeflow, plus the seconds a stalled pump drops, which `passInputTime` credits before the catch-up runs; a WebRTC host credits what its own frame clamp cuts off), banks at most `bankSec`, and clips the move that would pass it (the rest refused and counted on `World.moveBudget`), so over its life a seat walks at most the clock plus the grace and a still frame claims nothing. The ack stays the last consumed seq; casts, aim and edges apply once per tick, and a step anywhere in the batch is a willed input (THE SPAWN GRACE ends on it). A walking seat's row (one that stepped within `walkRowSec`) ships `spd` (`Actor.walkSpeed`: the moveSpeed stat with its status sources and a held stance's kit, the fold `moveActor` walks) and `trc` (`Actor.walkTraction`, absent on firm ground), so a still seat's snapshot carries neither and keeps the pre-pass shape key for key (THE WIRE'S EYES); `applySnapshot` writes them to `World.ownWalk`, which keeps the fold last heard while the rows are quiet, which the shell's own hero walks in `moveActor` (the shell's statuses are display stubs), so a chilled or hasted hero predicts at the host's pace. The client's replay (`replayOwnFrames`) stamps the gait once per frame, a predicting shell (`clientActionHook`) leaves its own hero's walk pose to that local cycle, and `faceOwnAim` turns the hero to the aim it sends unless a cast or a lock holds it. Dials: `HONEST_INPUT_CFG.maxMoveDt` 0.05, `graceSec` 0.1, `bankSec` 0.5, `maxBatch` 240, `walkRowSec` 0.5. Still open: the ground's own move scales (a road's boost, wading, scree) ride no row, so the shell misses them by their few percent until the ack; on slippery ground the shell still anchors without replaying (the momentum is the host's). Probe: `balance/probe_shardinput.ts`. |
| THE WILDS SHELL | `src/net/wildsClient.ts` | the render shell's half of a hosted Unbroken Wilds: `wildsShellAttach` starts the mass runtime restore-only (inert) from the welcome's seed on a World built with the shard's town features, `wildsShellStream` streams pages around the own hero each frame (the runtime's own streaming block over public members) and keeps the sky on the shard's clock, `wildsShellZone` re-seats the mass walk under the server's doodads on the surface and drops the runtime for a pocket. Wired from main.ts (`clientWilds`). |
| THE SHADOW / THE DRESS BEAT | `ShardHost` | on the wilds the keeper shadows the focus seat `SHARD_CFG.keeper.shadowOffset` px behind it each tick (the runtime streams, births and dwells around `world.player`); a changed doodad roster is read at most once per `SHARD_CFG.dressSec`: under THE WIRE DIET (below) the dress itself already rode each socket's `dd` rows, and the beat re-ships the whole zone message only when the zone's own frame (its theme, exits, lanes, walk: everything but the doodads and the plan structures) moved; with the diet switched off it re-ships the whole message, the old law. |
| THE WILDS SAVE | `server/wildsSave.ts` | a `--worldmass` shard's persistence: the classic `ShardSave` write already carries the mass half; `readWildsSave` reads the wilds' own file, `resumeWilds` stands it back up in the mass lane's resume order with the keeper waking at the hearth, and THE RESUME LAW holds every socket, tick and write until `ShardHost.ready()` resolves. |
| THE KEEPER SEAT | `Seat.keeper` (world.ts) | the parked p0: exempt from `partyScaleCount`, `grantXp`, absent from `serializeSnapshot`'s seats/actors/meta rows; in `updateDownedSeats` it is THE MERCY — a downed seat with no other standing seat rises after `keeper.reviveSec`, by clock, never by reach. THE WARDEN IS NO BODY: its hands take nothing (`pickupSeat`), it has no shoulder (`separateActors`), it is invulnerable (lava and water under THE SHADOW), THE WARDEN STANDS every tick in both lanes (flags re-worn, downed/dead cleared, its level mirroring the highest standing player's — the world's "character level" for event gates, vendor shelves and bounty work), a keeper world never concludes a wipe, and on a shard any seat may carry a quest item, take a giver's contract, claim a quest reward and swap gems against its OWN combat clock (the `localSeat` gates read the keeper). THE SEALED ROADS: the shard stamps the keeper's act clock every tick, so it is never idle and no station, mouth or portal ever fires off its standing — roads that would move the whole party stay shut until per-seat travel exists (card B). Absent on every non-shard world: the solo invariant. |
| THE NEAR LAW | `COOP_SCALING.shareRadius` (data/coop.ts), set by the shard to `SHARD_CFG.nearRadius` | a kill's XP pays only the seats within the radius of its place (`grantXp(amount, at)` from `kill`; zone and quest rewards stay world-wide), an enemy's party scale counts the seats near IT (`partyScaleCount(at)` → `scenePartyScaleCount(host, at)` in `engine/nativeScenePopulation.ts`, where the seamless lane keeps the scale), and the mercy counts an ally only within reach. 0 (the default every other lane keeps) is the old world-wide party, byte-identical. |
| THE HEARTH WAKE / THE SPAWN GRACE | `ShardHost.onJoin` / `hearthSeat` / `endGraces` | every joiner stands up on a free spot at THE HEARTH SEAT — the wilds' native settlement keeps its own bedside (`MassSettlement.spawn`, the same spot on a fresh or a resumed surface), a classic world's is where the keeper first stood — never beside the shadowed keeper, wherever THE FOCUS has walked it. The joiner is untargetable until its first WILLED input (a direction, a held or edged slot, a meta press) or `SHARD_CFG.spawnGraceSec`, whichever comes first; the grace is per seat, ends with the seat, and the keeper never wears one. |
| THE LAND DIGEST | `wildsSave.shellLandDigest` / `ShardTransport.land` / `wildsShellAttach(world, seed, land)` | the land is the seed's AND the preset's: a shell lays `startWorldMass`'s reservation over the build's preset, whose digest is the mass runtime's own `configHash`. The wilds save reader refuses (and the boot sets aside) a save whose digest differs — her ruling 2026-10-08: old saves are legacy, never migrated — and the welcome carries the digest the shard runs, so a client built on another preset refuses the join loudly instead of predicting against walls the server does not have. |
| THE KILLER'S DUE | `World.grantXp(amount, at, to)` / `seatOfRoot` | her ruling 2026-10-08 (the gameplay is single player's, never co-op's, until THE PARTY): with a radius set and the killing seat known (the credited killer's owner chain — a minion's kill is its keeper's), a kill pays that seat alone; an unowned kill still pays by reach. A party will widen "that seat" to its party. |
| THE SCOPED FREEZE | `Timeflow.chronoScope` / `ActorTimeFilter.within` / `World.castChrono` | card 18 B with C: on a shard every chrono cast bends a radius (`SHARD_CFG.chronoRadius`) around its caster and never the caster's own team — one player's stop never bends another player, a world-scoped spec becomes a bubble, an enemy's stop freezes the players inside its reach. Off a shard the spec's own scope stands. |
| THE PARTY | `server/party.ts` (`PartyDesk`, `PARTY_CFG`) / `net/partyWire.ts` / `ShardHost.onPartyWord` | card 23 (her word): the explicit social unit — players are independent neighbors until they group. A client's `party` session word (invite / accept / decline / leave / kick, `seat` naming the other) reaches the desk; an invite lands on its target as `partyInvite`, every refusal answers the asker as `partyWord` (one line); any member may invite, the leader exists for kicks (and the muster to come), a leaving leader hands the lead to the eldest member, a party of one dissolves, a seat gone from the world is gone from its party and its invites, invites lapse after `inviteSec`, the keeper is never seated. The snapshot carries `parties` (`PartyRow`s — ids only, a few bytes) on EVERY snapshot of a hosted world (`World.partyRows`, published by the host when the desk's `rev` moves; a client that applies only the newest of a queued run must never miss a change, so no change beat here). THE GROUP LAW (card 14, her clarification): `VesselDesk.partyHolds` — inside a party a lethal down is a DOWN while a mate stands, and the covenant fells every downed member at THE PARTY WIPE; ungrouped, the down is the death. THE KILLER'S DUE widens to the killer's party within the near radius (`World.sameParty` off `partyMates`). The status page lists the parties. THE PARTY PANEL (`ui/party.ts`, the menu's "Party" page, sealed off a hosted world) draws your party (the leader marked; leave; the leader kicks), the invitations that landed (accept / decline) and the ungrouped players around you (invite) off `World.partyRows`, the transport's peers and the session words the shell collects; it re-draws on `PARTY_PANEL_CFG.refreshMs`. |
| THE IDENTITY CUES | `data/identityCues.ts` (`HERO_NAME_CUE`, `PING_CUE`) / `engine/pings.ts` / `World.placePing` / `net/snapshot.ts` `pings` / renderer `drawPings` | card 17 A (her ruling): a name entered once, overhead names, world-anchored pings — shown, never told. THE NAME: a joined body wears the name it entered once (the vessel's own, else the join's — `ShardHost.onJoin`), it rides the actor row, and every OTHER player's hero wears it over the scalp (her gold for a party mate, ether for an independent neighbour, dimmed when down; `Settings.heroNames` 'all' / 'party' / 'off'); the co-op strip on a hosted world is YOUR party, never every neighbour. THE PING: the `ping` bind (keyboard `g`, pad unbound) sends the meta word `{ t: 'ping', x, y }` with the aim's world point (the pad's reticle when it owns the aim) — host-judged like every meta intent: `PING_CUE.cooldownSec` per seat refuses, a point beyond `maxReach` lands ON the reach ring along the bearing (never refused), ONE standing mark per seat (a new press replaces it), `lifeSec` on the world clock. The snapshot carries the live `pings` on every snapshot of a hosted world (the host's list is the truth each beat; the shell's optimistic mark is replaced by it). A mark is seen by its setter and the setter's party (`World.pingVisibleTo` over `sameParty`, which reads the desk on the host and the shipped rows on a client; solo and couch see every local mark): rings breathing out of the point under a bobbing beacon shard, and, off-screen, a chevron on the frame's inset edge facing it (`pingEdgePoint`). |
| THE ROVING SHADOW (an experiment, SHIPS OFF) | `SHARD_CFG.rove` ({ sec, clusterPx }) / `ShardHost.roveTarget` / the status page's `rove` | THE SHADOW gives the mass runtime ONE position (the keeper on the focus seat), so a player away from the focus walks a world where nothing is born (the sweeps' tier-one finding, charter §7d). With `rove.sec` > 0 and the standing seats in more than one cluster (bodies farther apart than `clusterPx`, 0 = the runtime's populationRadius), the keeper visits each cluster in turn for `sec` seconds of world time, the focus's cluster first, standing on the visited cluster's most recent seat; one cluster is THE SHADOW exactly as before and never hops. MEASURED 2026-10-09 (`npm run soak:shard -- --bots 6 --seconds 60 --spread 3500 --rove N --no-drop`, bots seated 3,500 px apart on a ring): rove off = the living radius (live foes within 1,300 px of each standing seat) least 0, mean 3.2, tick p95 47 ms, 8% dropped (the spread ALONE breaches: the runtime's per-observer paths, dormancy and native paging, scale with how far apart players stand); rove 10 s = mean 6.7, p95 79 ms, 43% dropped, each hop ~170 ms; rove 2 s = mean 8.1, p95 111 ms, 68% dropped, hops ~135 ms, and the sustained load grows with the natives the extra clusters bear. So the dial ships at 0: a teleporting keeper re-keys the runtime (pages, places, scenery, ecology) on every hop, and a living world around N spread players costs CPU the single-position runtime cannot pay inside the tick. The honest road is THE MANY SHADOWS inside the runtime (several foci without re-keying, per-focus population budgets) with the loaders off the tick (Node has no Worker; a worker_threads shim), both in the seamless lane's files. The dial, the probe (probe_shardslow R) and the soak's `--spread`/`--rove` stay so the next measurement is one command. |
| THE LOGIN THROUGH MU | `main.ts connectToShard` | card 22: a join with a traveling vessel travels it; without one, Mu opens as in single player (the tutorial first, locally, for a virgin account) and the bedside wake travels the vessel it just saved; a fall reads its reckoning and drifts back into Mu bound for the same server. The lobby's connect answers 'connected' or 'mu'. |
| THE NEAR LAW AT THE MINT | `World.settleNearScale` | `createMonster` scales a body at its (0, 0) placeholder before its caller seats it, so with a radius set the scale is queued and settled where the body actually stands after each tick's update, and settled for every living enemy at a join (`addSeat` seats the newcomer beside the shadowed keeper before the hearth wake moves it) and at a leave. The life-fraction law is `rescaleEnemies`', which the engine keeps with its rounding (the seamless lane's brittles probe pins and replays it); the shard's settle clamps so no rounded life tops a fractional maximum, and a wilds save resumes "the same wounds" to the number. Off a shard the radius is 0 and the queue never fills. |
| THE WIRE'S EYES | `net/snapshot.ts` (`ZoneW`, `zonesOf`, `flightOf`, `SEAT_OWN_ROWS` / `ownEntryJson`, `vendorRowsOf`; the client's `zoneStub`, `applyOwnClocks`, `tickNetClocks`) / `ShardTransport.sendState` / `World.seatText`, `creditFloat` / renderer `drawTexts` | shard sync pass A (items 3, 7, 15, 19, and the shelf): the rows a client draws from that rode no wire before; each is absent in its common case, so a snapshot with nothing to show keeps the pre-pass shape key for key. ZONES: the ground telegraphs and lingering fields (`World.zones`) whose edge lies within reach of a seated player's body (`WIRE_CFG.eyes.zoneReach`; 0 = THE NEAR LAW's radius, 0 there too = every zone; the keeper is never a viewer), the nearest first past `zoneMax`, as the zone painter and the hotbar read them (`ZoneW`: a wire id, position, radius, color, shape, facing and arc, `ex` for the live field or the telegraph's rising `fill`, the story, the grounded strike's grounds, a fissure's segment and lit faces, the edge band and the fill-in cage, the lob's launch point, an armed pulse's next beat, the body a worn field rides, and for a seated hero's own field its caster, skill and toggle) and never gameplay state. The client rebuilds render stubs (the cast-stub idiom: drawn, never run; absent = none stand), glides position, radius, facing and fill by id, and seats a riding field on its pooled body at draw time. `ActorW.leap` carries a telegraphed dive's `dest`, `radius` and `telegraph` color (the landing ring). FLIGHTS: `ProjW.id` is a flight's stable wire id and `v` its velocity in px/s (its displacement since the last snapshot, its heading times speed at birth); the client glides a flight from where it last DREW it to the newest snapshot, flies it on along `v` for at most `projAheadSec` past the newest one, and THE FORWARD LAW holds a flight that flew past where the next snapshot found it instead of running it backward. `TetherW.ai` / `bi` name a band's endpoint bodies (the `bl` idiom): its ends ride the client's interpolated and predicted bodies at draw time. THE OWN ENTRY (`SeatW.cd`, `SeatW.gg`; `SEAT_OWN_ROWS` names them): a seat's running cooldowns as `[remaining, total]` on `clockGrid` (the remainder rounded up, so a client never reads a skill ready early) and its bar's gauge banks as `[fill, locked, ready]`. The shard ships each socket its own seat's rows and never another's (`ownEntryJson`: the body stringified once with the seats held out by a sentinel, each socket's seats map spliced in, one shared bare frame for every socket whose seat carries none, a plain stringify per socket if the sentinel is ever not found exactly once); a broadcast lane (co-op) carries every seat's and each client reads its own. THE OWN META rides the same split: `seatMeta[seat]` (the build, bag, doll and wallets a client ever reads, shipped on a change and on the 1.5 s heartbeat) reaches its own socket alone, the key struck whole for a socket whose seat has none on that snapshot; `ownEntryView` is the per-socket view and every spliced frame is its JSON byte for byte. A resumed dormant seat hears its own build on its first snapshot (`onResume` marks it dirty), and main.ts's coalescing guard carries an unapplied own entry forward as before (the map it merges now only ever holds the own seat). The client anchors the hotbar's cooldown maps on each NEW snapshot, runs them down each frame at its hero's recovery rate (`tickNetClocks` in the client loop) and sets its bar's gauge banks so the fill, the gate's readiness and the lock read as the host's. FLOAT OWNERS: `TextW.o` is a damage or heal number's credited seat (the striker's or healer's owner-chain root, THE KILLER'S DUE's read; a DoT number names a seat only when every tick of its window was that seat's), stamped on a hosted world alone; `Settings.floatOwners` 'all' (the default, every lane's old behaviour) / 'party' / 'mine' curates other seats' numbers there (`floatOwnerShown` over `World.sameSeatParty`), and an unowned float always draws. THE SHELF BEAT (`WIRE_CFG.vendorBeat`, the memoryAccess idiom): `vendor`, `vendorRestockAt` and `vendorCap` ride together on a change (a purchase, a restock, a hold, the cap) and on the beat, and are absent between; the client keeps the last it saw, and a snapshot it never applied (it applies the newest of a queued run) still delivers its change through `prev`. |
| THE DORMANT SEAT / THE RECONNECT TOKEN | `ShardTransport` (`onPeerDormant`, `release`, `onPeerResume`, `isDormant`), `ShardHost` (`onDormant`, `onResume`, `sweepDormancy`), `WsTransport` (`shardResumeFor`) | card 16 B (ruled 2026-10-08): a dropped socket is never a free escape. A socket that closes without its client's word (`session leaving`, which `leave()` always says) never despawns its seat: the hero lies DORMANT for `SHARD_CFG.dormantSec`, standing, input-less and fully targetable, on every roster and snapshot with no `pleave`, its vessel and corpse records kept (the corpse desk sleeps it: no reclaim dwell, no row to a socket that is gone). Dying meanwhile is the ordinary death (THE DEATH COVENANT reads a dormant vessel as any other, and its fall ends the dormancy at once); when the clock runs out the old leave path runs and the peers hear `pleave` then. Every welcome carries THE RECONNECT TOKEN (`resume.token`, `node:crypto`, minted at every join and turned at every resume); a `join` carrying `resume { seat, token }` that names a DORMANT seat re-binds the new connection to it (the same seat, actor and vessel record; no `pjoin`; the host re-ships the terrain, the whole meta, the bodies' row and an input ack from zero), and anything else (a wrong or spent token, a seat that is not dormant) joins fresh with one log line. The client keeps its last session (`{ url, self, token, at }`, page memory and, since THE SMOOTH SHELL, sessionStorage; `at` re-stamped while snapshots land and when the host is lost) past a lost host; the lobby's Connect offers it to the same normalized address inside `WS_TRANSPORT_CFG.resumeWindowMs` (and THE SMOOTH SHELL's RETURN reconnects in place, below), and a deliberate `leave()` forgets it. THE UNTRIED SEAT (still under THE SPAWN GRACE: it never willed a step, so it has nothing to escape) and THE REFUSED WIRE (a socket the shard closed for breaking the grammar) leave at once, as does every seat of a closing shard. A dormant seat holds its place under `maxSeats`. The status page marks it (`dormant: true`, `dormantLeftSec`). |
| THE ACTING SEAT | `World.touchers` / `seatHudWire` / `actingSeat` / `seatKills` / `dealTravellerFlasks` (world.ts), `net/seatView.ts`, `net/shardBuild.ts`, `snapshot.ts` `SEAT_OWN_ROWS`, `VesselDesk` (vessel.ts), `ShardTransport.leaveHolds` / `sendState` | every interaction on a hosted world judges the seat that acted, never "the local player" (the parked keeper). A seated body holds its own channels, charges and guards (`updateCasting`'s monster clock is for brains and hired blades, whose pilot only taps). A refusal note and the low-life surge become that seat's own rows (`SeatW.fn`, `SeatW.lh`, under THE OWN ENTRY's `SEAT_OWN_ROWS`), so `sendState` ships them to that seat alone; a notice or an eyecatch with an audience (`stampAudiences`) makes `sendState` build each connection's frame itself (`seatAudienceSplit`: the shared body encoded once, and spliced in per connection THE OWN ENTRY's view of the seats and the build (`ownEntryView`: its own rows and its own `seatMeta` alone), the notices it hears and an eyecatch it may see; no audience list ever ships), else THE OWN ENTRY decides; the client floats its note over its own head and drives its own low-life glow (`applyOwnSeatRows`). THE DEATH BEAT (`VESSEL_CFG.deathBeatSec`): a fall is decided the tick it lands (the body, the tombstone, the reckoning), the body then stands dead and untargetable on the wire for the beat, and only then does its client hear `corpse` and `runEnd` and the seat leave; a hosted client plays `DEATH_PRESENTATION` from its first dead frame and opens the reckoning at the reveal. Chests, shrines (the draught on the toucher), encounter diamonds, fractures and waypoints answer every standing player (`touchers`: never the keeper, never a hired blade). A traveller whose own ledger says the welcome gift was never handed is dealt the flasks, learned and seated, and the gift is stamped on that ledger (this world's innkeep answers only its keeper). THE GROUP LAW holds a down only for a party mate within the near radius, and THE MERCY waits on party mates alone and never raises a body whose stage ends the run. A leave said while hurt or hurting within `combatLeaveSec` sleeps like a lost socket (THE DORMANT SEAT, no farewell mirror). The reckoning counts the seat's own kills and places walked (zones; surface cells of `placeCellPx` on the wilds). THE BUILD STAMP (`shardBuildStamp`: the save-compatibility pair and `SHARD_WIRE_PROTOCOL`) rides the join and the welcome: another build is refused at the door with one word for the lobby (`refused`), and a vessel the shard will not seat is never seated fresh (`session refused`: back to Mu bound for this world, or a door word for a twin). A notice an acting seat caused reaches its party (`NoticeEntry.to`; the `events` and `war` channels and a mint site's `scope: 'world'` reach everyone) and an eyecatch the caster's party and every seat within the near radius. The muster horn answers only a hand on it. `balance/probe_shardseat.ts`. |
| THE SMOOTH SHELL | `net/shell.ts` (`WireShell`, `WIRE_SHELL_CFG`) / `snapshot.ts` (`adoptSnapshot`, `interpolateSnapshot`, `noteActionEcho`, `SeatMetaW.as`, `CastW.sk`) / `WsTransport.resumeInPlace`, `rememberedShardSession` / `ShardTransport` (`resumeOnly`, `reclaim`) / `render/camera.ts` (`springFollow`, `CAMERA_FOLLOW_CFG`) / renderer `linkStrain`, `cameraFollow` | shard sync pass B (items 9, 11, 5, 6): the render shell's whole timeline lives in one `WireShell` that main.ts feeds arrivals, frames and inputs. THE SPLIT: `applySnapshot` is now its two halves back to back; a live shell ADOPTS each snapshot once, on arrival (actors made and dropped, statuses, cast stubs, cues, cosmetics, zones, flights, texts, the own build, the shelf, parties, pings), and each frame only places what was adopted (positions, facing, the pose scalars, cast-bar fill, the flights' glide, worm segments), so the vendor shelf, the statuses and the own build are no longer rebuilt sixty times a second. THE ECHO LAW: every client action carries a rising `seq` on its session message; the host (the shard's drain and main.ts's WebRTC host alike) judges it, applied, refused or dropped, and echoes the newest it judged on that seat's build (`SeatMetaW.as`, marking the build dirty so the echo rides the next snapshot; reset at a resume); a shell holds an optimistic build, and its own unjudged ping mark (the old `at >= snap.time` rule is gone), against any snapshot whose echo is older than its newest optimistic action, for at most `echoHoldMs`. THE JITTER BUFFER: a ring of `ring` snapshots; remote bodies render at the server's clock (the earliest-arrival line over the last `clockWindow` arrivals) less `delayMs`, between the two snapshots bracketing that time, on a render clock bent at most `dilation` to hold the depth; starved, a body runs on along its velocity at most `extrapolateMs` past the newest snapshot, then holds; far behind (`reseatMs`), the clock re-seats forward; it never runs backward, and a zone change restarts the ring. Flights, ground telegraphs and the drawn clock keep THE WIRE'S EYES' present-time glide over the newest adopted pair (a dodge reads where the bolt truly is), and the own hero is its own. THE SOFT CORRECTION: the frames the last prediction already held replay first, and where they land against it is a correction, carried as a render offset that decays 95% over `offsetDecayMs` when under `offsetSnapPx` (a snap above); the camera follows on a critically damped spring (`CAMERA_FOLLOW_CFG.omega`, a re-seat past `snapPx`), set on a client shell alone, so solo and every host keep the hard lock byte for byte (omega 0 is the hard lock). THE WATCHDOG: no snapshot for `stallMs` strains the frame (a void vignette closing in under a taut ether rim, no text: `renderer.linkStrain`, rising over `strainRiseMs`) and stills the walk the shell sends; `reconnectMs`, or a closed socket, starts THE RETURN: `WsTransport.resumeInPlace` re-opens the socket under the same transport with THE RECONNECT TOKEN and `resumeOnly`, every subscriber kept, retrying until the dormant window closes, and only then the start menu with the one word. The shard re-binds the seat (dormant, or LIVE when its own token comes back with `resumeOnly`: the old link died unheard and is let go) or refuses (`SHARD_REFUSAL.resume`), never seating a fresh hero; THE IDENTITY re-binds a DORMANT vessel seat for a join carrying its account and character with no token (a new tab), instead of the twin refusal. The remembered session also lives in sessionStorage (`{url, seat, token, expiresAt}`, refreshed while snapshots land), so a reload inside the window boots straight back into the same seat (`rememberedShardSession`, main.ts's boot, `resumeOnly`). THE PREDICTED ROOT: a fresh press of an affordable, ready plain cast bar (no strike timing, conversion, trigger, replenishment or movement delivery) stands a local cast stub at once (the bar and its prepare pose); the frames after the press replay under it (a rooting cast walks none, a mobile one walks at its factor); the host's cast row reconciles it (the bar on the shell's clock, never backward), and a press the host never casts ends after the measured RTT plus `rootGraceMs`. Dashes and leaps stay as they are. The host's own-hero cast row names its skill (`CastW.sk`, players only), so the shell's cast carries the REAL instance: a mobile cast, a guard or a held channel replays at the host's factor (a stub's bare def threw inside `moveActor` under a mobile cast or a walking channel such as Whirlwind, freezing the client, and walked a guard at the default step). Dials: `WIRE_SHELL_CFG` `ring` 8, `delayMs` 100, `dilation` 0.05, `dilationGain` 1, `reseatMs` 250, `extrapolateMs` 100, `clockWindow` 40, `rewindSec` 1, `offsetSnapPx` 64, `offsetDecayMs` 120, `stallMs` 1500, `reconnectMs` 5000, `strainRiseMs` 1200, `echoHoldMs` 3000, `rootGraceMs` 100, `rttMs` 120, `rttBlend` 0.2, `predictBuffer` 240; `CAMERA_FOLLOW_CFG` `omega` 30, `snapPx` 480, `maxDt` 0.1. `balance/probe_shardshell.ts`. |
| THE WIRE DIET | `src/net/wireDiet.ts` (`WIRE_DIET_CFG`; the codec `dietRow` / `dietFarRow` / `dietKept` / `dietInflate`, `DietMemo`; `dressKey`, `applyDressDelta`; `glideLite`) / `server/wireDiet.ts` (`ShardDiet`: `bind`, `frames`, `hold`, `zoneShipped`, `needsZone`, `frameMoved`; `dressScan`, `dressRowOf`) / `ShardTransport.sendStateTo` (`sendDiet`, `noteAck`, `Conn.inflight`) / `WsTransport` (the ack, the memo) / `ShardHost.wire` (`diet.bind`, the dress beat) | shard sync pass C (items 8, 14, 15 and 20): a hosted world's snapshot goes out per audience. The host binds each unit's snapshot to its World (`ShardDiet.bind`); `sendStateTo` hands a bound snapshot to the diet, and an unbound one (or `enabled` false) keeps the pre-diet frames. INTEREST: a seat's frame carries the actors, flights, numbers, flashes, ground rows, drops, orbs, death bursts, bands and lite bodies within `reachPx` of its hero or a party mate's hero (0 = twice THE NEAR LAW's radius, 3,200 px on a shard), so a party never loses sight of itself; always its party's courts (every body whose owner chain roots in a member's controlled or home body), wherever they stand; and THE FAR ROSTER: every other seat of the unit as a minimal hero row (`ActorW.fr`: its place, facing, name, pools and seat), so a shell's party view, the strip and the overhead names keep every seat. The seats map carries the near seats (their own rows struck) and the socket's own entry. ONE ENCODING PER AUDIENCE SET: seats whose selections match (a party always; neighbours standing together) share one encoded body (`ShardDiet.encodings` counts them), and only each socket's tail is its own: THE OWN ENTRY's row and build, the notices it hears, its eyecatch, its dress delta, the shelf and the account view. THE CODEC: every actor row is quantized and elided once a snapshot (positions on 1/`posSteps` px, facing and pose angles on 1/`turnSteps` of a turn, the hit flash in hundredths rounded up, the walk and action poses as small integer tuples `bw` / `ba`, false flags and zero pools left out) and THE IDENTITY ONCE strikes the fields that hold still (`DIET_IDENTITY`: radius, color, shape, team, name, maxima, flags, material, look, parts, rarity, def, faction, cosmetics, adorn, brain variant, encounter group): they ride a body's first frame on a socket and every frame after they changed, the row says `k` between, and the socket's memo (`DietMemo`: exactly the bodies of its last frame, as the shard's per-socket record) restores them; a miss asks a whole resend (`rs` on the next ack). The frame names its grid (`dz`); `WsTransport` inflates before any subscriber, so every reader sees canonical `ActorW` rows. THE DRESS LEDGER: per World, the doodad roster and the plan structures exactly as the zone message ships them (`dressRowOf` is serializeZone's row, pinned by the probe), diffed by object when the engine's doodad revision, the list or the structures move (an in-place change, a harvested node's husk, a frozen pool, is its old key removed and its new row added; the radius is the drying ground's `ev` row and a door's state the `doors` row), logged as revisions (`dressLog`). A zone message stamps a socket's revision (`zoneShipped`, after the message counts out to the ledger) and each frame carries the composed delta since (`dd`: `r` keys `x,y,kind` as the zone message ships them, `a` rows, `sr` / `sa` structures); a socket on another World's, zone's or epoch's ground, or past the log's reach, hears the whole zone first (the self-heal). The shell lays `dd` on every arrival in the shard's own order, adopted or not (`WireShell.arrive`; an older snapshot only fills the bracket, yet its delta lands, once), and FIRST in the adoption (before the doors, hollows, annexes, wells, felled and drying reconciles, which then find its pieces), re-deriving the bridge and ground lists and the touched kinds' doodad families (the nav grid, the canopy index, the ground bake's gather). The full zone ships on a zone change (and when the zone's own frame moved: THE DRESS BEAT above). THE LITE IDS: each lite body keeps one wire id per life (`lt.i`; a slot's rebirth re-salts its seat hash, so a new id), and the shell glides it like a flight (from where it was drawn to the newest row, flown on along its own pace for `projAheadSec`, THE FORWARD LAW), its bob's phase on its id; the hit flash eases between the bodies' pair on a hosted shell (a fresh blow stands at once), and the pose scalars ride the codec into THE SMOOTH SHELL's own glide. FLOW CONTROL: every input carries the newest snapshot tick the client applied (`ak`), and a client whose inputs went quiet acks on its own every `ackEvery` arrivals; the shard skips a socket that acked once while more than `maxUnacked` frames written to it await its ack (`ShardDiet.skipped` counts the skips). The window counts FRAMES, never ticks: a skipped gap holds none, so one resumed frame never reads as every beat it skipped (counting ticks starved a quiet client after any gap: one frame out, its ack never due). A skipped or congested beat carries the rows that ride only on a change (the journal, the build, the shelf, the account view) into the frame that resumes the socket, and its dress rides the composed delta. THE SOLO INVARIANT: every path is gated on a row only the shard writes (`dz`, `dd`, `lt.i`) or on a hosted shell (`partyRows !== null`); solo, the co-op host and the WebRTC lane are byte-identical. `SHARD_WIRE_PROTOCOL` 2. Measured in THE SOAK below. `balance/probe_sharddiet.ts`; `probe_shard` P pins the dress law both ways. |
| THE COUNTERS AND THE JOURNAL | `World.questHand` / `withQuestHand` / `handSeats` / `handOwns` / `deedHand` / `updateClientCounters` / `counterOwned` / `seatHarvestView` (world.ts), `net/journalWire.ts` (`journalRowOf`, `harvestRowOf`, `applyCounterRows`, `counterZoneOf`, `applyCounterZone`), `snapshot.ts` `SEAT_OWN_ROWS` (`jn`, `hv`), `main.ts` `pollClientCounters`, `ShardHost` (`seatCorpseMarks`) | the gap sweep's items 3, 4, 8, 13, 16 and 25: a hosted world's counters, quests, bounty board, harvest rites and objective pay answer the seat whose hands are on them, never the parked keeper. THE CLIENT'S COUNTERS: the zone message ships (hosted worlds alone) each station's piece as the host resolved it (its spot, structure, town site and story: a shell's own town may stand at another rung, so it never re-derives a site; `World.netStationAnchors`), the Sacrificial Fonts and the station features the host owns (`counters`: THE KEEPER'S GATE, a shell reads them through `counterOwned` and never its own account, so a hosted shell never offers the campfire, whose refresh stays the world's). The shell runs its own seat's lingers at the bench, the board, the Font, the Tracker, the Oracle and the counters (`updateClientCounters`, the Caravanner's idiom: the arrival latch re-arms per adopted zone, and the seat index follows the pooled own body so the idle clock reads the steps prediction replays) and opens the same panels; every act inside them stays a host-judged request, and the board's take, pin and coast writs now ask the seat's own reach. Mireille's care (life, mana, founts, her blessing on the seat's own clock) and the giver's linger run on the host for every standing player, each on its own dwell. THE QUEST HAND: quest STATE stays the world's (card 24 is unruled); every quest read and act answers the hand, the scoped seat (`withQuestHand`: a journal row, a giver linger, a claim), else on a hosted world the acting seat, else the hero. The giver stands by the hand, the gates and the offer level read its class, vocations and level, a collect quest's cargo is in its bag (and on a hosted world the one cargo is carried when any player holds it), and the pay is its own: the chosen piece into its bag, its passive and vocation points, its gem and essence pay at its feet, its XP by the credit law (its party within the near radius of the giver). A deed the sim noticed with no act behind it (a field cleared, a place satisfied) pays the standing player nearest its place (`deedHand`). THE JOURNAL ROW (`SeatW.jn`, THE OWN ENTRY): the seat's quest log, offers, rewards and imbues, completed ids, its own map pins (its quests' targets and turn-ins, its own remembered bodies off the corpse desk, the surface pins on the wilds) and the bounty boards within `boardReach`, recomputed every `everySnapshots` or after the seat's own act (one snapshot's pass reads each board's route searches once, `World.withApproachPass`), shipped on a change and on the beat; an empty journal never rides (an emptied one rides `emptyBeats` beats more). A shell adopts it once per arrival (THE SPLIT's arrival half, `adoptSnapshot`), and its quest reads, the board panel, the map's pins, the HUD's quest compass and a waiting reward's journal answer from it; its station lingers run beside the Caravanner's, outside both halves. THE BOARD PER SEAT: one hand per seat per board (`BountyPosting.holder`, and `holderChar` for a hero that travels), only the holder sees, abandons and turns in its hand, the pay lands at the turning seat's feet, its receipt prints for it alone, its "return to the board" notice reaches its party, and a hand whose holder left the world is unheld (anyone's) until its hero comes back; the slate deals for any standing player at the board on the shared beat. THE HARVEST: the arming scan reads every standing player (its own combat clock for the calm), the rite rides its own row (`SeatW.hv`: the nodes within `harvestReach`, its own arming, its own rite) and holds its hands (`SeatW.rooted`), and its symbol presses ride the input path. XP BY PLACE: `grantXp` takes several places; on a hosted world a grant naming none pays the acting seat's party near the act, and the encounter, extraction, borough, fracture, ritual, straying, drove, wisplight, harborhold, zone objective (`objectivePlaces`: its hold fixtures, its quarry's body, else the field's last counted fall), geographic objective and cleared-site payouts name their places, so a player AFK at the hearth never levels off the field. `balance/probe_shardcounters.ts`. |
| THE SIM UNITS, W1 | `src/engine/shardUnits.ts` (`UNIT_CFG`, `RoadTicket`, `ShardWorldLink`, `SeatPacket`, `SHARD_UNIT_FIELDS`, `pinIn` / `pinOut`, `detachSeat` / `attachSeat`) / `server/simUnits.ts` (`UnitRegistry`, `SimUnit`, `SeatWorlds`) / `World.shardWorld`, `shardUnitHost`, `landSeatAt`, `captureLiveMemory`, `sleepZone`, `atZone` / `ShardTransport.sendStateTo`, `sendZoneToMany` / `ShardSave.run` | M1's first wave (the plan is `docs/design/shard-m1-plan.md`): one World per live zone. THE KEEPER is the World a shard always had (`ShardHost.world`: the chart, the WorldSim, the clock, the account, the world sweeps); every other live zone is a UNIT: a staged World under a throwaway account, booted into its zone with `createPlayer({ load: false })` and its own parked warden (keeper-tagged, invulnerable, untargetable, passive, levitating), wearing the host's published fields (the timeflow policies, the party, `World.shardWorld = { role, key, enqueue, dispatch }`). THE PIN: at every entry into a unit the keeper's world-level fields (the census's alias and counter rows: the chart and the pockets, the memories, the quests, the slate, the run ledger, the once-latches, the notice feed, `nextGenId`) are copied onto it, and at its exit every one the unit reassigned is copied back, so a runtime reassignment in either World is never lost and two units minting in one tick never share a `gen_` id; THE ONE CLOCK pins `time` and `inputClock` in at the keeper's tick-start reading, so every unit lands where the keeper lands. THE PRIMARY GATE (`World.update`'s `unitWorld`, `updateHarborholds`): a unit skips the keeper's world sweeps (the sim, the odyssey, the forechart, the web settle, the omens, the deed recovery, the class claims, the mycelia, the deepwinter reconcile, the bulletins, the mint and ignition drains, the warband arrivals, the warp sweep, the floating zones); the keeper ticks first and drains every world queue, so until W3 splits them a unit only misses what belongs to its own zone. THE ALIAS CENSUS (`SHARD_UNIT_FIELDS`, derived each run by the probe from world.ts): every field whose own container is a string-keyed map, set or record, a WorldSim, a ledger or an account, every field the world save touches (THE SAVE LAW: never per-unit) and every field the gated sweeps write one call deep (THE SWEEP LAW) carries a row: alias, counter, clock, keeper (the keeper's copy is the one its sweeps and save read), host, seat (moved or dropped by the hand-off) or unit with a reason (per-visit, zone-local, memo, seat-keyed, warden-only, dev, shell); a row naming a missing field fails. THE HAND-OFF moves a seat as the same Actor objects, ids kept: `detachSeat` (in the source, under its pin) refuses a held seat or one mid-harvest or mid-trace, ejects a borrowed body, takes THE CARRY SET (the hero and every living, non-construct body whose whole owner chain to it is carried; the rest of the chain is culled quietly, as a zone change drops it), clears the hero's chain now in the controllers that tear down on absence (the companion bond exported whole, assault courts, challenges, attack sequences, guard arts, satellites, auroras, guardians, creepers), purges every flight, field (a toggled one refunded through `expireZone`), band and pending row the chain owns, strips the sources keyed by the source's own counters (domains, auras both ways, altars), releases grips, drops the source's target refs on the court and lifts the seat rows (the ack, the spent presses, the kill tally, companion grants, replenishment clocks, tree buff sources, trace rests, pips, the timers; the lite-tier throng rows are freed and re-spawned beside the hero); `attachSeat` resets the court at the door (the cue arrays, THE BLINK LAW, marks, the retinue's AI and orders), re-binds the status relays, lands it through THE FILTERED HOST (`World.landSeatAt`: the one landing law over a view of that seat and its court alone; 'entry' applies loadZone's back-portal rule to the destination's live exits), installs the rows and re-derives the build. The arrival wears THE SPAWN GRACE for `UNIT_CFG.arrivalGraceSec` (or until its first willed input) and hears its unit's zone message at once. THE REGISTRY (`UnitRegistry`): THE SEAT LEDGER (where every seat stands; a join lands in the keeper), THE HEARTH ALIAS (the keeper hosts the zone it stands in, read live) and THE WILDS LAW (on the Unbroken Wilds the keeper hosts the whole surface and only pockets wake), THE HAND-OFF QUEUE (tickets drained after every unit ticked; the direct `travel(seatId, zoneId)` door serves the probes and the dev lane until W2's roads emit tickets), THE WAKE (the ladder installed, the placeholder hearth never captured), THE LINGER (a unit seatless for `unitLinger` runs the departure's leave verbs, its zone memory captured exactly as a departure captures it, and drops; the hearth never sleeps, a dormant or downed seat keeps its unit), THE SOFT CAP (`maxUnits`: the longest-seatless unit sleeps at once; a wake is never refused), THE UNIT BREAKER (a unit faulting `SHARD_CFG.faultBreakerTicks` ticks running sends its seats to the hearth and drops uncaptured; the keeper keeps THE BREAKER), THE PERSIST CAPTURE (every awake unit writes its live memory row before the world save), and the status page's `units` and each seat's `unit`. THE UNIT WARDEN and THE UNIT SHADOW: every unit's warden stands its flags each tick on its unit's focus seat; the keeper mirrors the highest standing level shard-wide, a unit the highest in it. THE WIRE PER UNIT: each unit ships its own snapshot (one `snapTick` per beat across the shard) and its own zone message (a change, THE DRESS BEAT) to its own seats (`sendStateTo`, `sendZoneToMany`); the party rows are world-wide, published into every unit (beside THE CORPSE ON THE CHART's marks hook, re-published when a refused wilds save replaces the keeper's World); each seat's journal and harvest rows (THE COUNTERS AND THE JOURNAL) are judged in its own unit, and a hand-off marks the arrival's journal so its new zone's boards and pins ride the first snapshot it hears there; pings stay unit-local. THE DESKS PER UNIT: the vessel and corpse desks read each seat's own unit through `SeatWorlds` (a body records its unit's zone and spot, and a pocket leaves none; a pocket mirror carries its companions; THE GROUP LAW's kneel needs a mate in the same unit; THE DEATH COVENANT judges every seat in its own unit), THE DORMANT SEAT resumes with its unit's zone, and THE MERCY stands up a downed Immortal in any unit. THE RUN ROW: `ShardSave.run` persists the keeper's clears, run ledger, throng claims and annex finds, restored after the world half stands (a clear off the chart drops; absent = today). W2 opened the roads one seat at a time (THE ROADS PER PLAYER, the next row). THE SOLO INVARIANT: no sim or co-op World ever carries the link, and THE ROAD-WALK DIGEST of a seeded solo walk (an exit, a cave mouth, the climb-out, a town portal round trip) is pinned. `balance/probe_shardunits.ts`. |
| THE ROADS PER PLAYER, W2 | `src/engine/shardRoads.ts` (`scanShardRoads`, `SHARD_ROADS_CFG`, `seatDoorOf` / `seatLadderOf`, `shardRoadArrive` / `shardRoadDepart`, `roadDwellRow`, `shardSpotOf` / `ladderOfSpot`) / `World.mouthUnder`, `mouthRefusalUnder`, `realmGates` / `gateUnder`, `wardSealUnder`, `holdfastNear`, `exitUnder` / `exitLockHint`, `isExitLocked(e, from)`, `shardExitRoad` / `shardMouthRoad`, `sealedRoadUnder`, `shardRoadHost`, `netRoadDwell` / `SeatW.rd` / the `waypoint` intent / `ShardWorldLink.liveSeed`, `hearth` / `UnitRegistry.liveSeedOf` | M1's second wave: every road off a zone judged per seat (the catalog is the section below). THE LIFT: the road block's scans (the mouth under a body and a shut mouth's refusal, the realm gates and the gate under a body, the ward seal, the holdfast's parley ring, the exits under a body and a lock's own word) are named World methods the solo block calls with the local hero in its old order, pinned by two road-walk digests taken before the lift (W1's solo walk and the co-op host's walk with a second seat carried along, a sealed door's word included). THE SHARD SCANNER (`scanShardRoads`, one gated call at the end of the road block on a hosted world): every standing player seat holds at most one road dwell, read with its own body and built only while it is idle and unshoved; a finished dwell builds the road's ticket in the source (`shardExitRoad`, travelThrough's twin: the seat's own ladder's climb-out, the far span mouth resolved in the destination, a `?` frontier charted in place, the escape credit judged from the seat's door and paid to its party within reach; `shardMouthRoad`, enterSidezone's twin: the pocket minted in the source, on the wilds the keeper's native mint, the traveller's level for a character pocket, the seat's own ladder one rung deeper), and THE HAND-OFF QUEUE moves that seat alone. Per-seat road state lives beside each unit World (never a World field): THE SEAT'S DOOR (THE RETREAT LAW: `isExitLocked` spares each seat its own edge, so a second arriver from another side keeps its way back), THE SEAT'S LADDER (a seat with none reads its unit's), THE EXIT GRACE (a climbed-out seat on its mouth never dwells straight back down), the holdfast's parley and the words already heard. The intents re-opened: `townPortal` (the seat's own spot, ladder and door are the portal's origin; the dwell enqueues instead of loading and the unit's other seats keep their frame; the way back reads an awake source's live seed), `caravanTo` and the new `waypoint` (the asking seat judged, a render shell's map asks through the intent); THE HEARTH ALIAS lands each in the keeper (its waypoint, else THE HEARTH SEAT). THE SEALED WORDS: the dock, the harbor board's passage, the Wraithsail lying alongside and the Delver's shaft stay sealed (each owns a per-World singleton run), as does a realm gate until W4 builds its road; each says its word once per approach on the seat's own note row (THE ACTING SEAT) and builds no dwell, so no ring. THE ROAD RING (`SeatW.rd`, THE OWN ENTRY): the dwell the host fills rides its own seat's row and a shell draws it (`World.netRoadDwell`). The executor resolves a landing in the destination after its wake, installs the road's per-seat rows there, runs the road's after-word (the escape's word, the waypoint's clear bubble) and takes one road per seat per drain. `balance/probe_shardunits.ts` B (the digests), F and H; the wilds pocket road is `balance/probe_shardslow.ts` S. |
| THE WORLD SWEEP (THE SIM UNITS, W3) | `World.atZone` / `presentWorlds` / `occupiedAudience` (world.ts) / `ShardWorldLink.dispatch` / `worlds`, `UNIT_CFG.freezeLinger` (engine/shardUnits.ts) / `UnitRegistry.dispatch` / `worlds` / `frozen` / `beginTick` (server/simUnits.ts) / `OverlayView.presentZoneIds` / `censusByZone`, `zonePresent` / `presentCensus` (world/overlay.ts) / `nativeSimView` (engine/nativePopulationResolution.ts) / `WorldBulletin.to` (world/bulletins.ts) | M1's third wave: the world sweeps that drain a world queue and then act on one zone reach every awake sim unit, and the overlays learn where players stand. THE SPLIT DISPATCH: `World.atZone(zoneId, fn)` runs `fn` on the World standing in the zone and returns its answer; solo and the co-op host it is the conditional it replaced (this zone, else nothing), byte for byte; on a shard the keeper's sweeps reach the unit standing there through the link's `dispatch`, under that unit's pin at THE ONE CLOCK's tick-start reading (a frozen unit included: its zone is awake ground), and a call made from inside another unit waits for THE HAND-OFF QUEUE's drain (a pin never opens inside a pin, and the keeper is never entered with a unit's stale alias fields). The registry resolves the World that STANDS in the zone, never THE WILDS LAW's travel alias. The keeper drains each world queue once and dispatches the zone half: warband arrivals (the pack lands in the unit standing in its target zone and nowhere else), the haunt's dawn dissolutions (the fade in the grief's unit), the harborhold lifecycle (the dress, the services, the gate reseal, the in-zone word and the overrun text in the hold's unit; THE MUSTER's pause belt asks the hosting unit's live defense; a hold no World stands in hears "word comes"), the deadwake's ebbs (one notice to the seats of every occupied zone within the tide's reach). The keeper's alone, with their in-zone halves left to each World: the world-boss mints (walls, passing, fight sync stay), the Long Night's sky feed, announcements and warp reconcile (the ground, the coach, the pour stay), the quickening's stamps (the materialize beat, the kin pulse, the echo stay), the bounty watch (the slate's reconcile; its holder sweep reads every unit's seats, so a hand is unheld only when its holder left the world). The gloaming's outlasted edge is watched by every World (each floats the word over its own players) and banked once, by the keeper. The bloom's activity map is built once, each zone's engine-local term (theater runs, encounters) read in the World standing there. The bulletins drain once; the war below is heard by the seats standing in its plane (`WorldBulletin.to`, the notice's audience), and so is a demon rift's tearing. THE OCCUPIED LAW: on a hosted world `nativeSimView` reports `presentZoneIds` (every live World's zone, the keeper's first) and `censusByZone` (each one's own live census) beside the keeper's `currentZoneId`; exactly the five readers whose job is never acting on ground a player stands in read them, through `zonePresent` and `presentCensus` (the warband pump's throttle, the deadwake's consume, the faction field's live-census diffusion, the plague's patient zero, the conclave's targeting); every owner-centric read keeps the keeper's (M3's). MANY ORIGINS: the forechart's halo round-robins over the occupied zones, one origin a sweep; the omens murmur to every occupied zone within reach (one whisper an omen, each zone its own bearing over its own player; the reveal reads from the nearest); a floating zone wires in near any occupied zone; the conclave's ignite level reads every occupied zone. THE ACTING SEAT's audience (a line a seat's act caused reaches its party) is gathered over every unit's seats: the feed is one. THE LINGER FREEZE (`UNIT_CFG.freezeLinger`, default on): a seatless unit takes no step and ships nothing through its whole linger, its bodies and flights holding where the last seat left them; a seat's return resumes it under THE ONE CLOCK's re-pin of `time` and `inputClock` (the semantics of a sleep and a wake: the world moved on while nobody watched); a dormant or a downed seat is a seat, so its unit ticks on; the status page marks a frozen unit. THE SOLO INVARIANT: THE SWEEP-WALK DIGEST of a seeded solo expedition that lights every split sweep's event was pinned before the split and holds after it. `balance/probe_shardunits.ts` J. |

## M0 semantics (honest, inherited from co-op)

- The whole party travels together (`loadZone` carries every seat); a seat
  cannot be in a zone the keeper is not in. Lifted by M1 (THE SIM UNITS): W1
  built the fabric (one World per live zone, THE HAND-OFF, the wire and the
  desks per unit; a seat moves through the registry's direct `travel` door),
  and W2 built the roads per player: a road moves the seat that took it,
  alone ("The roads per player" below).
- A joiner with no saved hero is a fresh level-1 hero of the chosen class
  with the base bar and no kit; it saves nothing when it leaves. A joiner
  WITH one travels as its VESSEL (below, "The vessel and the corpse").
- Every account-gated read rides the SHARD's account (THE KEEPER'S GATE):
  with a fresh account the hearth is a hamlet and no station answers; `--open`
  is the play-test answer until M2 (THE SEAT'S GATE).
- Events are the world's, seated around the keeper's zone. Lifted by M3.
  M1's world sweep (W3) already reaches every sim unit: a world queue's
  zone half lands in the unit standing in that zone, and THE OCCUPIED LAW
  keeps the consuming, seeding and targeting fields off every zone a
  player stands in; who owns an event, and who may see it, stays M3's.
- A player death with no other player standing is a DOWN, and the keeper's
  mercy stands it up where it fell after `SHARD_CFG.keeper.reviveSec`; the
  world never ends. A MORTAL vessel's such down is THE DEATH COVENANT
  instead (below); Immortal vessels and fresh heroes keep the mercy.
- The wire was the co-op snapshot (full state, JSON, 20 Hz, no interest
  management; lifted by THE WIRE DIET, sync pass C: each socket hears its
  own audience's frame, compact, with its dress as deltas and its pace set by
  its own acks) under THE WIRE DISCIPLINE's first row: the account-derived
  `memoryAccess` view rides every `WIRE_CFG.memoryAccessBeat`-th snapshot
  (30, i.e. 1.5 s) instead of all of them, and a client keeps the last row it
  saw — a quiet snapshot fell from 45 KB to 1.6 KB.

## The roads per player (M1 W2): the catalog

On a hosted world a road moves the seat that took it, alone: its decision
point builds a ticket in the unit the seat stands in, and the registry runs
it after every unit ticked (THE HAND-OFF QUEUE). THE HEARTH ALIAS and THE
WILDS LAW pick the destination's unit: the hearth is the keeper's, and on
the Unbroken Wilds every surface id is the keeper's while only pockets wake
units. Plan: `docs/design/shard-m1-plan.md` section 4.

| road | state | the ticket |
|---|---|---|
| exit to a charted zone | open | the seat's own door for THE RETREAT LAW; the escape credit paid in the source to its party within reach; lands by the back-portal rule |
| exit to a `?` frontier | open | charted in the source (the chart and `nextGenId` ride THE PIN home); the live exit names the new ground |
| cave mouth (classic) | open | the pocket minted and furnished in the source, the traveller's level for a character pocket, the find ledgered; the seat's ladder one rung deeper |
| cave mouth (the wilds) | open | the keeper's native mint (the mass walk and its roots); a pocket unit wakes, the keeper stays on the surface |
| traversal mouth (geyser, chasm arch) | open | the instant step: the cinematic owns the one local player |
| cave climb-out | open | one rung up the seat's own ladder, landing at the mouth by the indoor and story rules, under the seat's exit grace |
| wilds pocket climb-out | open | the keeper (never a pocket World loading the surface), landing at the mouth, under the grace |
| span far mouth | open | the far member's own span mouth, resolved in the destination after its load |
| town portal, out | open (the intent re-opened) | the seat's own spot is the origin; the keeper, beside its waypoint or THE HEARTH SEAT; on the Unbroken Wilds the return passage stands on the surface the seat landed on (the hearth's id never names it, so a solo wilds portal's return passage stays hidden: the seamless lane's) |
| town portal, back | open | the source's unit at the portal's spot, down the saved descent; an awake source answers the faded check with its live seed |
| caravan | open (the intent re-opened) | the route minted in the source; band 0 lands in the keeper |
| waypoint | open (the new `waypoint` intent) | the seat judged (the attuned set, its hunters); lands at the far stone, a fresh wake clearing its bubble; a client's map offers it once the chart rides the wire (its own chart today) |
| ward seal, holdfast toll | open | not travel: per-seat dwells acting in the same unit |
| realm gates (demon rift, crusade sanctum, necropolis, fracture rift, court door, dimension arch, breach) | sealed until W4: "this gate does not open on this world yet" | `RealmGateRow.road` is the slot W4 fills per gate (the prep in the source, the ticket's first wake in the realm) |
| the dock (casting off) | sealed: "the quay is still at this world's edge" | none |
| the voyage (the harbor board's passage) | sealed: "no ship sails from this world yet" | none |
| the Wraithsail (lying alongside the dock) | sealed: "the Wraithsail does not answer here" | none |
| the Descent's shaft | sealed: "the shaft is sealed on this world" | none |
| skyfall, pit fall, mode fall | unchanged (only the world's own player falls through; the wardens levitate) | none |

Each sealed word is heard once per approach on the seat's own note row
(`SeatW.fn`) and builds no dwell, so its client draws no ring; the words are
placeholders in `SHARD_ROADS_CFG.words`. A refused hand-off (a held seat, a
harvest, a trace) leaves the seat where it stood, and its dwell starts over.

## Persistence on the wilds

A `--worldmass` shard is persistent like a classic one. THE WRITE is the
classic beat unchanged: `ShardHost.persist()` wraps
`World.serializeWorldState()` in the `ShardSave` wrapper and writes it
atomically (tmp + fsync + rename) every `SHARD_CFG.worldSaveSec` (THE WORLD SAVE BEAT, 60 s; the mirrors keep `persistSec`) and at `stop()`. The
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
| THE VESSEL | `server/vessel.ts` (`VesselDesk`, `judgeVessel`) | the `join` may carry `vessel`: the client's hero as a CharacterSave with NO world half (the couch guest's shape; `meta/shardVessel.ts` `readTravelingVessel`: the hero the wake names, else the run slot's, else the lone standing roster vessel; a fallen one never travels). THE JUDGMENT (structure, finite numbers, size, schema, class, character id, then `rebuildSavedMeta`) gates it; a vessel that fails, has no account id, already fell here, or already walks the world is never seated as a fresh hero in its place (THE ACTING SEAT): its client hears `session refused`, back to Mu bound for this world when the hero cannot travel, or a door word when it already walks here or the client keeps no account (one log line either way); a join that carries no vessel is still the fresh card hero. The graft is the couch guest's (`rebuildSavedMeta` + `World.adoptSeatMeta`) plus the seat-scoped half of `applySavedCharacter` (the seated heal, flask banks, primed pours, guard clocks, fielded bonds and rosters; bonds whose skill the build lacks sleep and ride home as they came). The uploaded class wins over the lobby card. |
| THE MIRROR | `VesselDesk.mirror` | on the persistence beat (`SHARD_CFG.persistSec`, ephemeral worlds too), at THE FAREWELL (`session leaving`: the client's `WsTransport.leave()` holds the socket open for the last mirror, up to `WS_TRANSPORT_CFG.farewellMs`; honored once per `VESSEL_CFG.farewellEverySec`) and at a clean shutdown, the shard ships `session heroSave` to that seat alone: `serializeCouchGuest`'s shape, no world, the build and carry as the shard holds them, and the vessel's own run ledger, run config, contracts and sleeping bonds passed through verbatim (never the shard's). The client writes it to the hero's own slot (`saveVesselMirror`: the shared Continue slot for a run-mode vessel, its own card's slot for a roster vessel), honoring only the vessel it sent, and only while the shard session is current or no other run is live (a farewell's late mirror never overwrites a new run's save). |
| THE DEATH COVENANT | `VesselDesk.tick` → `fall` | a vessel whose stage's `onDeath` is `'end'` (read from `meta/modes.ts`, never a mode id) and whose down only THE MERCY would answer (`VESSEL_CFG.covenantAt` `'mercy'`: while another player stands, the down stays co-op's to revive) FALLS that same tick, before the mercy's clock could ever stand it up: its worn and side-board gear (`captureLoot`, the DeathRecord's own policy) is recorded as a corpse keyed by account (caves and empty carries leave none, the corpse run's law), its fall is TOMBSTONED, the client hears `corpse` (where it lies + the reckoning the shard appraised: the seat's carried essence at the mortal exchange times the stage's rate) then `runEnd`, and the seat leaves the world (after THE DEATH BEAT: the fall is decided that tick, the body stands dead and untargetable on the wire for `VESSEL_CFG.deathBeatSec`, then the word and the leave; THE ACTING SEAT). A mortal vessel whose client LEAVES while it is down has fallen too (leaving is never the road out of a death). `updateDownedSeats`' law is untouched (no engine seam). |
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
| `session leaving` | seat → shard | THE FAREWELL: mirror me before my socket closes; and THE DELIBERATE LEAVE: that close ends my seat at once, never dormant (unless said mid-fight: THE ACTING SEAT sleeps it like a lost socket, with no farewell mirror) |
| `join { build }` / `welcome { build }` | both ways | THE BUILD STAMP (`net/shardBuild.ts` `shardBuildStamp`: the save-compatibility pair and `SHARD_WIRE_PROTOCOL`): the shard refuses a join from another build (or none) at the door with `{ t: 'refused', word }` before any seat is made, and a client refuses a welcome that carries another (THE ACTING SEAT) |
| `session refused { word, mu? }` | shard → one seat | THE ACTING SEAT: the vessel this join carried will not be seated, and no fresh hero takes its place; `mu`: the hero cannot travel, so the client drifts back into Mu bound for this world; absent, a door word (this hero already walks here) and the client goes home with it |

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
`metaHeartbeatSec` 1.5, `persistSec` 20 (the mirror beat), `worldSaveSec` 60 (the world save beat), `maxCatchUpTicks` 5,
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
THE WIRE'S EYES (src/net/snapshot.ts): `WIRE_CFG.vendorBeat` 30 (THE SHELF BEAT: snapshots
between unchanged vendor rows, 1.5 s); `WIRE_CFG.eyes`: `zoneReach` 0 (px from a seated
player's body to a zone's edge; 0 = `COOP_SCALING.shareRadius`, the shard's
`nearRadius` 1600, and 0 there too = every zone), `zoneMax` 160 (zone rows per snapshot),
`clockGrid` 0.05 (the own cooldown rows' grid, s), `projAheadSec` 0.1 (a flight's longest
fly-on past the newest snapshot); `FLOAT_OWNER_CFG.mode` 'all' (world/bulletins.ts, the
default under `Settings.floatOwners`).
THE WIRE DIET: `WIRE_DIET_CFG` (src/net/wireDiet.ts): `enabled` true (false = the pre-diet frames, the A/B switch), `reachPx` 0 (px of interest around a seat's hero and its party mates' heroes; 0 = twice THE NEAR LAW's radius, 3,200 px on a shard; 0 there too = everything), `posSteps` 4 (an actor row's position on a 0.25 px grid), `turnSteps` 512 (its facing and pose angles in 1/512 turn), `maxUnacked` 3 (frames a socket that acked once may hold unacknowledged before the shard skips it), `ackEvery` 2 (arrivals a client lets pass with no input to carry its ack before it acks on its own; held at or below maxUnacked + 1), `dressLog` 96 (dress revisions a World keeps; a socket further behind hears the whole zone). `SHARD_WIRE_PROTOCOL` 2.
THE COUNTERS AND THE JOURNAL: `JOURNAL_WIRE_CFG` (src/net/journalWire.ts): `everySnapshots` 10 (snapshots between a seat's journal recomputes; its own act recomputes at once), `beat` 30 (an unchanged journal re-ships every 1.5 s), `harvestReach` 240 (px from a seat to a standing node for its rite row), `boardReach` 360 (px from a seat to a board for the board's view to ride its journal), `emptyBeats` 2 (beats an emptied journal still rides); `COUNTER_FEATURES` (the station features a shell reads off the zone message).

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
| `--spread <px>` | THE SPREAD: the harness seats each bot at its own anchor on a ring of this radius about the hearth and the bot roams around that anchor (a party that split up; 0 = everyone around the hearth). The table's `spread` column is the widest distance between two standing seats, `living` the live foes within the population radius of each standing seat, least / mean (THE LIVING RADIUS, the premise the one-focus law breaks) |
| `--rove <sec>` | THE ROVING SHADOW's visit length (`SHARD_CFG.rove.sec`; 0 = the focus alone, the shipped law) |
| `--diet off` | THE WIRE DIET switched off (`WIRE_DIET_CFG.enabled`): the pre-diet frames, so one build measures both sides of the A/B under the same load |
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

**THE WIRE DIET, measured** (2026-10-10, the same machine with co-sessions
holding about six cores, so every tick gate breached on both sides of the
A/B; `--diet off` is the pre-diet frames in the same build under the same
load). Four bots, 30 s: snapshot p50 / p95 24.8 / 27.6 kB and 408 kB/s per
client with the diet off; 6.1 / 7.7 kB and 108 kB/s with it on (the
pre-diet base commit read 24.9 / 27.2 kB and 501 kB/s on a calmer machine);
tick p50 / p95 14.4 / 41.1 ms off against 14.3 / 40.9 ms on, so the diet's
own cost hides in the load (in isolation it is about half a millisecond a
beat more than the pre-diet send for four seats and 77 bodies). Six bots
3,500 px apart, 60 s (the population breaches the tick gates either way,
94% dropped): 140.8 / 145.6 kB off against 11.3 / 15.2 kB on, one zone
re-ship against none. Where the bytes went: at four players around the
hearth every body stands within the reach, so interest cuts nothing there;
quantization alone saves about 6% (the floats were never the weight), the
elided false flags and zero pools about a quarter, and the identity sent
once per socket most of the rest (the static fields were most of every
row).

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
   newest `saves/shard_*` world and loses at most `SHARD_CFG.worldSaveSec` of the world (the heroes at most `persistSec`).
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

THE SMOOTH SHELL: `WIRE_SHELL_CFG` (src/net/shell.ts) and `CAMERA_FOLLOW_CFG` (src/render/camera.ts), every dial named in its pieces row above.

THE SIM UNITS: `UNIT_CFG` (src/engine/shardUnits.ts): `unitLinger` 30 (THE LINGER: world seconds a unit with no seat stays awake before it sleeps, its zone memory captured as a departure captures it; a seat that turns back inside it walks into the same live zone), `maxUnits` 32 (THE SOFT CAP: awake units, the keeper not counted, past which the longest-seatless one sleeps at once; a wake is never refused), `arrivalGraceSec` 3 (THE SPAWN GRACE at a hand-off arrival; a join keeps `SHARD_CFG.spawnGraceSec`), `freezeLinger` true (THE LINGER FREEZE, W3: a seatless unit takes no step and ships nothing through its linger, and a seat's return resumes it on THE ONE CLOCK; false = every awake unit ticks through its linger, W1's behaviour; M1-W1 measured about 5 ms a tick per awake field unit). THE UNIT BREAKER reads `SHARD_CFG.faultBreakerTicks`.

THE ROADS PER PLAYER: `SHARD_ROADS_CFG.words` (src/engine/shardRoads.ts): the sealed roads' words, placeholders until hers (`dock`, `voyage`, `wraithsail`, `descent`, and `realm` for a realm gate whose road W4 has not built), each heard once per approach on the seat's own note row. The dwells and reaches are the transit rows every World reads (`data/transit.ts`); the scanner adds no number of its own.

THE ACTING SEAT: `VESSEL_CFG.deathBeatSec` 1.5 (THE DEATH BEAT: seconds a fallen body stands dead and untargetable on the wire before its word; 0 = at once), `combatLeaveSec` 8 (a leave said by a standing hero hurt, or hurting, this recently sleeps like a lost socket), `placeCellPx` 2000 (a place walked on the Unbroken Wilds: a surface cell this wide; elsewhere a zone). `ACTING_SEAT_CFG` (src/engine/world.ts): `worldChannels` `['events', 'war']` (notice channels every player of a hosted world hears, whoever caused them), `noteSec` 1.2 (seconds a refusal note rides its seat's snapshots). `SEAT_VIEW_CFG` (src/net/seatView.ts): the client's own note, World.text's look (`noteLife` 1, `noteRise` 28, `noteLift` 16, `noteColor`, `noteSize` 11). `SHARD_WIRE_PROTOCOL` 1 (src/net/shardBuild.ts): bump it when the shard's wire changes in a way an older peer cannot read; a save-compatibility bump moves the stamp by itself.

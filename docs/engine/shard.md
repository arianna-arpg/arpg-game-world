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
wilds boots; `npm run probe -- --slow` or `npm run probe -- shardslow`).

## The pieces

| piece | file | law |
|---|---|---|
| THE WIRE FRAME | `src/net/wsframe.ts` | RFC 6455 as pure functions over `Uint8Array`: text/binary/continuation, close/ping/pong, client masks unmasked, server frames written unmasked, oversize (1009) and malformed (1002) frames reported never thrown. Zero dependencies — THE CLEAN TREE. |
| `WsTransport` | `src/net/ws.ts` | the CLIENT role of `NetTransport` over the native `WebSocket`; `connect(url, info)` resolves `{ self, seed }` off the shard's welcome (THE SEED THREAD); `WireMsg` is `webrtc.ts`'s `NetMsg` grammar verbatim. A socket that dies before the welcome is the connect's failure; after it, `onHostLost`. |
| `ShardTransport` | `server/shardTransport.ts` | the HOST role over `node:http` upgrade + the frame assembler. Seat ids bind to the CONNECTION at join; inputs and session messages are keyed by that binding, never by the seat a client claims. Every input is shape-checked (`sanitizeInput`); unknown session kinds drop; a congested socket is skipped (never stalls the loop); a keepalive ping reaps silent sockets; non-JSON or protocol errors close the socket, which despawns its seat. |
| `ShardHost` | `server/shardHost.ts` | boot (`bootShardEngine`: shims, package factions, the content census; registrations via `src/sim/arena`'s import list), one `World` from a real expedition manifest, the host frame verbatim (`poll seats → applyInputs → drain meta intents → updateAI → update`), the zone message on change, the meta heartbeat, 20 Hz snapshots, the persistence beat, a bounded fixed-step pump that logs engine faults instead of dying. |
| THE WILDS SHELL | `src/net/wildsClient.ts` | the render shell's half of a hosted Unbroken Wilds: `wildsShellAttach` starts the mass runtime restore-only (inert) from the welcome's seed on a World built with the shard's town features, `wildsShellStream` streams pages around the own hero each frame (the runtime's own streaming block over public members) and keeps the sky on the shard's clock, `wildsShellZone` re-seats the mass walk under the server's doodads on the surface and drops the runtime for a pocket. Wired from main.ts (`clientWilds`). |
| THE SHADOW / THE DRESS BEAT | `ShardHost` | on the wilds the keeper shadows the focus seat `SHARD_CFG.keeper.shadowOffset` px behind it each tick (the runtime streams, births and dwells around `world.player`); a changed doodad roster re-ships the zone message at most once per `SHARD_CFG.dressSec`. |
| THE WILDS SAVE | `server/wildsSave.ts` | a `--worldmass` shard's persistence: the classic `ShardSave` write already carries the mass half; `readWildsSave` reads the wilds' own file, `resumeWilds` stands it back up in the mass lane's resume order with the keeper waking at the hearth, and THE RESUME LAW holds every socket, tick and write until `ShardHost.ready()` resolves. |
| THE KEEPER SEAT | `Seat.keeper` (world.ts) | the parked p0: exempt from `partyScaleCount`, `grantXp`, absent from `serializeSnapshot`'s seats/actors/meta rows; in `updateDownedSeats` it is THE MERCY — a downed seat with no other standing seat rises after `keeper.reviveSec`, by clock, never by reach. THE WARDEN IS NO BODY: its hands take nothing (`pickupSeat`), it has no shoulder (`separateActors`), it is invulnerable (lava and water under THE SHADOW), THE WARDEN STANDS every tick in both lanes (flags re-worn, downed/dead cleared, its level mirroring the highest standing player's — the world's "character level" for event gates, vendor shelves and bounty work), a keeper world never concludes a wipe, and on a shard any seat may carry a quest item, take a giver's contract, claim a quest reward and swap gems against its OWN combat clock (the `localSeat` gates read the keeper). THE SEALED ROADS: the shard stamps the keeper's act clock every tick, so it is never idle and no station, mouth or portal ever fires off its standing — roads that would move the whole party stay shut until per-seat travel exists (card B). Absent on every non-shard world: the solo invariant. |
| THE NEAR LAW | `COOP_SCALING.shareRadius` (data/coop.ts), set by the shard to `SHARD_CFG.nearRadius` | a kill's XP pays only the seats within the radius of its place (`grantXp(amount, at)` from `kill`; zone and quest rewards stay world-wide), an enemy's party scale counts the seats near IT (`partyScaleCount(at)` → `scenePartyScaleCount(host, at)` in `engine/nativeScenePopulation.ts`, where the seamless lane keeps the scale), and the mercy counts an ally only within reach. 0 (the default every other lane keeps) is the old world-wide party, byte-identical. |
| THE HEARTH WAKE / THE SPAWN GRACE | `ShardHost.onJoin` / `hearthSeat` / `endGraces` | every joiner stands up on a free spot at THE HEARTH SEAT — the wilds' native settlement keeps its own bedside (`MassSettlement.spawn`, the same spot on a fresh or a resumed surface), a classic world's is where the keeper first stood — never beside the shadowed keeper, wherever THE FOCUS has walked it. The joiner is untargetable until its first WILLED input (a direction, a held or edged slot, a meta press) or `SHARD_CFG.spawnGraceSec`, whichever comes first; the grace is per seat, ends with the seat, and the keeper never wears one. |
| THE LAND DIGEST | `wildsSave.shellLandDigest` / `ShardTransport.land` / `wildsShellAttach(world, seed, land)` | the land is the seed's AND the preset's: a shell lays `startWorldMass`'s reservation over the build's preset, whose digest is the mass runtime's own `configHash`. The wilds save reader refuses (and the boot sets aside) a save whose digest differs — her ruling 2026-10-08: old saves are legacy, never migrated — and the welcome carries the digest the shard runs, so a client built on another preset refuses the join loudly instead of predicting against walls the server does not have. |
| THE NEAR LAW AT THE MINT | `World.settleNearScale` | `createMonster` scales a body at its (0, 0) placeholder before its caller seats it, so with a radius set the scale is queued and settled where the body actually stands after each tick's update, and settled for every living enemy at a join (`addSeat` seats the newcomer beside the shadowed keeper before the hearth wake moves it) and at a leave. The life-fraction law is `rescaleEnemies`', which the engine keeps with its rounding (the seamless lane's brittles probe pins and replays it); the shard's settle clamps so no rounded life tops a fractional maximum, and a wilds save resumes "the same wounds" to the number. Off a shard the radius is 0 and the queue never fills. |

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

| piece | file | law |
|---|---|---|
| THE IDENTITY | `meta/account.ts` (`accountId`, `ensureAccountId`, `isAccountId`) | every profile's account carries a stable random 128-bit hex id, minted once by its first load (`ensureAccountId` in `loadAccount`/`loadAccountAsync`: the synchronous boot load mints in memory, the disk-first load adopts that id or the cache's and caches it; the disk takes it with the account's next ordinary write, because a compatible boot never writes the disk, and `ShardVesselLink` saves the account before a shard keys any record by it; a save that predates it mints at its next load) from `crypto.getRandomValues`, never `Math.random` (the seeded stream never moves). `makeAccount` and `deserializeAccount` never mint and `serializeAccount` omits an empty id, so every sim and probe account stays byte-identical (THE SOLO INVARIANT: a parity rig comparing two worlds' accounts caught the first, eager draft). The `join` carries it; the host keeps it per seat and NEVER re-broadcasts it (the welcome/pjoin roster rows omit it). It keys this player's own records and nothing else. |
| THE VESSEL | `server/vessel.ts` (`VesselDesk`, `judgeVessel`) | the `join` may carry `vessel`: the client's run-slot hero as a CharacterSave with NO world half (the couch guest's shape; `meta/shardVessel.ts` `readTravelingVessel`, roster vessels stay home). THE JUDGMENT (structure, finite numbers, size, schema, class, character id, then `rebuildSavedMeta`) gates it; a vessel that fails, has no account id, already fell here, or already walks the world joins as the fresh card hero with one log line. The graft is the couch guest's (`rebuildSavedMeta` + `World.adoptSeatMeta`) plus the seat-scoped half of `applySavedCharacter` (the seated heal, flask banks, primed pours, guard clocks, fielded bonds and rosters; bonds whose skill the build lacks sleep and ride home as they came). The uploaded class wins over the lobby card. |
| THE MIRROR | `VesselDesk.mirror` | on the persistence beat (`SHARD_CFG.persistSec`, ephemeral worlds too), at THE FAREWELL (`session leaving`: the client's `WsTransport.leave()` holds the socket open for the last mirror, up to `WS_TRANSPORT_CFG.farewellMs`; honored once per `VESSEL_CFG.farewellEverySec`) and at a clean shutdown, the shard ships `session heroSave` to that seat alone: `serializeCouchGuest`'s shape, no world, the build and carry as the shard holds them, and the vessel's own run ledger, run config, contracts and sleeping bonds passed through verbatim (never the shard's). The client writes it to the hero's own slot (`saveVesselMirror`: the shared Continue slot for a run-mode vessel), honoring only the vessel it sent, and only while the shard session is current or no other run is live (a farewell's late mirror never overwrites a new run's save). |
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
| `session leaving` | seat → shard | THE FAREWELL: mirror me before my socket closes |

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
`keeper { classId, name, reviveSec 8, shadowOffset 0 }`, `nearRadius` 1600, `dressSec` 4, `spawnGraceSec` 20, `saveDir`,
`wildsSaveSuffix` `'_wilds'` (THE WILDS SAVE's own file, `wildsSave`), `faultLogSec` 5, `telemetryTicks` 600;
`WILDS_CLIENT_CFG.surveyEveryFrames` 30 (src/net/wildsClient.ts). `SHARD_WIRE_CFG`
(server/shardTransport.ts): `maxClientMessage` 256 KB, `sendBufferCap` 96 KB,
`pingSec` 15, `reapSec` 45, `maxSlots` 16. `WS_TRANSPORT_CFG.defaultUrl`
(src/net/ws.ts) is the lobby box's first offer (the box remembers the last
address that seated you, `localStorage` key `hw_shard_url`), `defaultPort` 8787
the port a bare host name is given, `connectTimeoutMs` 10 s how long a connect
waits for a welcome before it fails as silence; `normalizeShardUrl` turns the
`https://` address a codespace shows into `wss://`, `http://` into `ws://` and a
bare host into `ws://host:8787`; `farewellMs` 1500 is how long
a leaving vessel holds its socket for the last mirror. `WIRE_CFG.memoryAccessBeat`
(src/net/snapshot.ts) is the account-view beat; the view is built every tick and
also ships on any tick it differs from the one this world last shipped (THE CHANGE
BEAT), so a graduation reaches every client on the next snapshot and the beat only
re-sends an unchanged view.

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
5. Open `https://<name>-8787.app.github.dev/` in a private browser window:
   the game's start menu (or, with no served client, the status JSON). A
   GitHub sign-in page means the port is private; any other page means the
   WebSocket will fail too.
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
9. To update: `git pull && npm ci && npm run build:web`, then
   `pkill -f server/shard.ts` (a clean exit stops the supervisor) and
   `bash .devcontainer/start-shard.sh`; served clients update with it.

With the port public, anyone with the link reads the status page (the seed,
the zone, every seated player's name and level) — fine among friends.

THE VESSEL: `VESSEL_CFG` (server/vessel.ts): `maxBytes` 240 KB (under the
wire's 256 KB frame cap), `maxLevel` 999, `maxDepth` 24, `maxNodes` 60000,
`maxString` 4096, `maxName` 64, `maxCharId` 64, `maxBar` 32, `maxItemUid`
2^31-1, `covenantAt` `'mercy'` (or `'down'`: every down of a mortal vessel is
its death), `farewellEverySec` 2. The mirror rides `SHARD_CFG.persistSec`. `SHARD_CORPSE_CFG`
(server/corpses.ts): `perAccount` = `MAX_DEATH_RECORDS` (3, the account
ring's size), `fallenPerAccount` 64, `schema` 1, `reclaimRadius` 110 /
`reclaimDwell` 1.0 (fallbacks behind the `'corpse_reclaim'` transit row),
`clampRadius` 16, `dwellStep` 0.1, `flash` (64 px, 0.5 s, the reclaim gold).
`VESSEL_WIRE_CFG` (src/net/vesselWire.ts): `maxText` 96, `maxValue` 1e9,
`maxBodies` 32.

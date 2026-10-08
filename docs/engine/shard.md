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

A player joins from the start menu's **Co-op (Beta)** → class card → **Join a
Server** → `ws://<machine>:<port>` → Connect. A plain GET on the same port
(a browser tab on `http://<machine>:<port>/`) answers THE STATUS PAGE: the
world's kind and seed, the zone, the clock, uptime, the seated players, tick
time p50/p95, dropped ticks, faults and where it saves. Both launchers
(`Host Shard.bat`, the codespace's `start-shard.sh`) stand the Unbroken Wilds
with the open account by default; a restart with no `--seed` brings the
newest saved world of that kind back. The render shell, prediction,
the meta intents and the run-lifecycle channel are the co-op lane's,
unchanged. Type-checks ride `npm run check` (`tsconfig.shard.json` covers
`server/` with node types; `src/net/` stays browser-safe under the main
gate). The regression rig is `balance/probe_shard.ts` (`npm run probe -- shard`).

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
| THE KEEPER SEAT | `Seat.keeper` (world.ts) | the parked p0: exempt from `partyScaleCount`, `grantXp`, absent from `serializeSnapshot`'s seats/actors/meta rows; in `updateDownedSeats` it is THE MERCY — a downed seat with no other standing seat rises after `keeper.reviveSec`, by clock, never by reach. THE WARDEN IS NO BODY: its hands take nothing (`pickupSeat`), it has no shoulder (`separateActors`), it is invulnerable (lava and water under THE SHADOW), THE WARDEN STANDS every tick in both lanes (flags re-worn, downed/dead cleared, its level mirroring the highest standing player's — the world's "character level" for event gates, vendor shelves and bounty work), a keeper world never concludes a wipe, and on a shard any seat may carry a quest item, take a giver's contract, claim a quest or exploration reward and swap gems against its OWN combat clock (the `localSeat` gates read the keeper). THE SEALED ROADS: the shard stamps the keeper's act clock every tick, so it is never idle and no station, mouth or portal ever fires off its standing — roads that would move the whole party stay shut until per-seat travel exists (card B). Absent on every non-shard world: the solo invariant. |
| THE NEAR LAW | `COOP_SCALING.shareRadius` (data/coop.ts), set by the shard to `SHARD_CFG.nearRadius` | a kill's XP pays only the seats within the radius of its place (`grantXp(amount, at)` from `kill`; zone and quest rewards stay world-wide), an enemy's party scale counts the seats near IT (`partyScaleCount(at)`), and the mercy counts an ally only within reach. 0 (the default every other lane keeps) is the old world-wide party, byte-identical. |

## M0 semantics (honest, inherited from co-op)

- The whole party travels together (`loadZone` carries every seat); a seat
  cannot be in a zone the keeper is not in. Lifted by M1 (THE SIM UNITS).
- A joiner is a fresh level-1 hero of the chosen class with the base bar and
  no kit; it saves nothing when it leaves. Lifted by M2 (THE VESSEL).
- Every account-gated read rides the SHARD's account (THE KEEPER'S GATE):
  with a fresh account the hearth is a hamlet and no station answers; `--open`
  is the play-test answer until M2 (THE SEAT'S GATE).
- Events are the world's, seated around the keeper's zone. Lifted by M3.
- A player death with no other player standing is a DOWN, and the keeper's
  mercy stands it up where it fell after `SHARD_CFG.keeper.reviveSec`; the
  world never ends. The death covenant on a shard is card 6.
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

## Dials

`SHARD_CFG` (server/shardHost.ts): `tickHz` 60, `stateHz` 20,
`metaHeartbeatSec` 1.5, `persistSec` 20, `maxCatchUpTicks` 5,
`keeper { classId, name, reviveSec 8, shadowOffset 0 }`, `nearRadius` 1600, `dressSec` 4, `saveDir`,
`wildsSaveSuffix` `'_wilds'` (THE WILDS SAVE's own file, `wildsSave`), `faultLogSec` 5, `telemetryTicks` 600;
`WILDS_CLIENT_CFG.surveyEveryFrames` 30 (src/net/wildsClient.ts). `SHARD_WIRE_CFG`
(server/shardTransport.ts): `maxClientMessage` 256 KB, `sendBufferCap` 96 KB,
`pingSec` 15, `reapSec` 45, `maxSlots` 16. `WS_TRANSPORT_CFG.defaultUrl`
(src/net/ws.ts) is the lobby box's first offer. `WIRE_CFG.memoryAccessBeat`
(src/net/snapshot.ts) is the account-view beat.

## Hosting on Codespaces

`.devcontainer/devcontainer.json` makes a codespace on this branch a ready
host: Node 22, `npm install` on create, port 8787 forwarded under an https
label (so the forwarded address is `wss://`), and `start-shard.sh` standing
the shard up in the background at every (re)start — idempotent, flags from a
`SHARD_ARGS` Codespaces secret (default `--port 8787 --open`), log in
`shard.log`, the world saved to the codespace's `saves/`. After the first
start, set the port PUBLIC once (Ports panel, or
`gh codespace ports visibility 8787:public -c <name>`) and hand players the
address shown there. The codespace idles out after its timeout; starting it
again brings the same world back.

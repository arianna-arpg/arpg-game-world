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
| `--worldmass` | THE UNBROKEN WILDS: host the seamless foundation's continuous surface (M0.5 — the shell does not yet render it; see the charter §3.12) |
| `--open` | THE OPEN ACCOUNT: every class, station feature and memory unlocked on the shard account (play-test servers) |
| `--ephemeral` | never write the world; default writes `saves/shard_<seed>.json` every `SHARD_CFG.persistSec` and on Ctrl-C |
| `--save-dir <p>` | where shard saves land |

A player joins from the start menu's **Co-op (Beta)** → class card → **Join a
Server** → `ws://<machine>:<port>` → Connect. The render shell, prediction,
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
| THE KEEPER SEAT | `Seat.keeper` (world.ts) | the parked p0: exempt from `partyScaleCount`, `grantXp`, absent from `serializeSnapshot`'s seats/actors/meta rows; in `updateDownedSeats` it is THE MERCY — a downed seat with no other standing seat rises after `keeper.reviveSec`, by clock, never by reach. Absent on every non-shard world: the solo invariant. |

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
- The wire is the co-op snapshot as-is (full state, JSON, 20 Hz, no interest
  management); the `memoryAccess` row's 43 KB per tick is a known bloat with
  a chip filed on main.

## Dials

`SHARD_CFG` (server/shardHost.ts): `tickHz` 60, `stateHz` 20,
`metaHeartbeatSec` 1.5, `persistSec` 20, `maxCatchUpTicks` 5,
`keeper { classId, name, reviveSec 8 }`, `saveDir`. `SHARD_WIRE_CFG`
(server/shardTransport.ts): `maxClientMessage` 256 KB, `sendBufferCap` 1 MB,
`pingSec` 15, `reapSec` 45, `maxSlots` 16. `WS_TRANSPORT_CFG.defaultUrl`
(src/net/ws.ts) is the lobby box's first offer.

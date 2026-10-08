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
- The wire is the co-op snapshot as-is (full state, JSON, 20 Hz, no interest
  management); the `memoryAccess` row's 43 KB per tick is a known bloat with
  a chip filed on main.

## The vessel and the corpse

Card 6 as ruled (her word, 2026-10-07): the shard's world persists; the hero
is the client's. A client keeps its hero save and uploads it at login; the
shard mirrors it home; a MORTAL vessel's death leaves its corpse on the shard
and ends that player's run, "equivalent to having their character die in a
normal run", and the next hero of the same account can walk back to the body
and reclaim it. Immortal vessels keep THE MERCY.

| piece | file | law |
|---|---|---|
| THE IDENTITY | `meta/account.ts` (`accountId`, `mintAccountId`, `isAccountId`) | every account carries a stable random 128-bit hex id, minted once (`makeAccount`, or at load for a save that predates it, written home at once by `loadAccountAsync`) from `crypto.getRandomValues`, never `Math.random` (the seeded stream never moves). The `join` carries it; the host keeps it per seat and NEVER re-broadcasts it (the welcome/pjoin roster rows omit it). It keys this player's own records and nothing else. |
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
`keeper { classId, name, reviveSec 8 }`, `saveDir`. `SHARD_WIRE_CFG`
(server/shardTransport.ts): `maxClientMessage` 256 KB, `sendBufferCap` 1 MB,
`pingSec` 15, `reapSec` 45, `maxSlots` 16. `WS_TRANSPORT_CFG.defaultUrl`
(src/net/ws.ts) is the lobby box's first offer; `farewellMs` 1500 is how long
a leaving vessel holds its socket for the last mirror.

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

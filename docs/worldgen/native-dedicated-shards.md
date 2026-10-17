# Dedicated retained Shards

The dedicated host can run the retained native campaign with several players in
one shared world. Each player receives the terrain and state of the area their
actual character occupies. The campaign advances once while each resident area
runs its own actors, AI, objectives and physical effects.

Run `npm run shard -- --native --seed 1231 --open --client dist` after building the
client. Players use the served page or the existing **Join a Server** screen.
`--native` and `--worldmass` select different hosts and cannot be combined.
The normal host remains available without either flag. The retained host uses
the existing native terrain wire format; the continuous wilds renderer is a
separate path.

## Shared world and character ownership

`NativeShardHost` composes the installed retained runtime, server frame owner,
physical seat registry, native publication, party desk, vessel and corpse desks,
and retained muster adapter. It does not create a legacy World per area or run
the local browser's World driver. A parked keeper carries the original campaign
account and saved world; its maintenance restores the original server flags and
tracks the highest living player's level through the selected native seat owner.

Input and action queues belong to the actual current socket and character.
Every player receives terrain before the first state of a new area. Reconnecting
replaces the delivery epoch and resets input/action acknowledgements. Party
musters retain the original late-arrival, timeout and lapse rules. A delayed
native destination maker can run only through its privately issued continuation.

Physical travel, companion restoration, area rewards and objectives stay with
their retained owners. Near-party scaling uses the original server radius during
synchronous host work and restores the process setting afterward. The keeper's
area does not determine another player's loot, corpse or published terrain.

## Persistence and shutdown

The retained world writes `shard_<seed>_native.json` and its corpse records write
`shard_<seed>_native.records.json` in the selected save directory. With no seed,
the host resumes the newest retained checkpoint. `--ephemeral` disables these
files. `--open` opens the account before both fresh keeper creation and resumed
keeper installation.

Checkpoints contain the recorded native catalog, account and keeper state.
Unsupported or externally changed checkpoint bytes are refused. One process
owns each selected path; writes use an exclusive temporary file, flush and
checked replacement. A failed constructor releases its acquired owners and
subscriptions so another installation can retry.

Completed native effects remain completed when a callback fails. Consecutive
simulation or near-scale failures trip the original fault breaker before the
next checkpoint. Shutdown waits for any in-flight listener opening, closes the
wire while seat owners are available, then retires the retained runtime. The
breaker callback runs after the host frame leaves its busy state.

## Verification and remaining scope

The host courses exercise two real TCP clients, party formation, individual
travel, area publication, reconnection, input clocks and arrival grace. Saved
world courses cover remote companions, objectives, retained loot, return to the
saved area, mortal death, persistent corpses and reclamation. Separate courses
reproduce and repair faulting-frame saves, listener races, partial startup
subscriptions and keeper-level recalculation. The CLI course boots the actual
`--native` entry and reads its HTTP status. The served-browser course is a
separate acceptance gate, as are all four TypeScript configurations and the
combined historical source checks.

This integration does not establish unlimited player capacity or complete the
broader content acceptance audit against main. Private quest/party instance
namespaces, generated side-zone entrances, and bounded/open navigable terrain
remain subsequent work. The current coordinator retains a single area identity
per native zone id. It must gain explicit instance ownership before two players
can privately generate the same quest zone in different places. See
[generated quest side zones](generated-quest-side-zones.md).

The original host snapshot uses main `dc56030f3594533fec8712d55977d17f5bd03d1b`.
The combined main/host successor carries the three reviewed commits through
`a2fa42917262e9229140b6364b6d5e461b32f50e`, including the same orb pacing helper
inside each actual retained hit owner. `nativemainhostcompositionsource` binds
both exact parent inputs without changing their historical assertions. Measured
server performance and private instance ownership remain separate follow-ups.

The combined source gate is `nativeshardscompositionsource`; its finite parent
lanes preserve the complete original readers and historical archives while
checking the actual combined runtime separately. `nativeshardslegacysource`
covers two older, exact read predecessors for carried-control and runtime birth.
The exact-anchor and ground-followup readers reuse their existing caravan
providers. These four read corrections resolve failures reproduced on the
unchanged caravan input; no assertion, threshold or gameplay behavior changes.
The final probe census enrolls every new Shards course, including keeper
selection and the two combined source gates.

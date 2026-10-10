# Shard runtime foundation

This implements the three runtime seams requested in `docs/design/shard-world.md`
§6.6. The integration branch combines foundation `ef76cb1e` and shard
`096393f1`; development stays separate from both active worktrees.

## Player neighborhoods

`WorldMassRuntime.update(world, boot, foci?)` accepts explicit stable focus IDs,
positions and tiers. Ordinary callers automatically use living player seats;
the shard's keeper is excluded. Boot retains its opening fallback. The limit
is 16 foci, matching the shard's seat limit.

Overlapping population-radius discs form connected groups. Each group receives
the original `maxPopulation` budget; distant groups cannot consume each other's
capacity. Group membership and page deduplication are independent of input order.
Birth priority rotates across groups. A merger never deletes existing bodies:
an over-capacity group waits until its ordinary lifetime rules free capacity.

Page requests, retained place cells, discoveries, survey observations, native
owners, scenery and geographic activities use the union of neighborhoods.
Native preparation shortlists interleave nearest-first lanes. Residency caps
scale with the bounded focus count; shared owners remain unique. Live native
bodies, court nodes, occurrence reservations, brittle births, geographic bodies
and procession promises participate in population accounting. Unlocated
in-flight reservations are conservatively charged until published.

Dormancy and paging use exact spatial observer queries, include every focus,
and exclude the keeper. Existing wounds, casualties, ownership and dependency
leases remain authoritative. No players means no new neighborhood preparation.
Focus membership is host state, not persistent geography; reconnect reconstructs
it from the current seats.

## Background compilation

`compilePort.ts` supplies an environment-owned port factory. Browsers retain
their existing Web Workers. The shard installs `server/massWorkers.ts` before
creating its world. Native features, geographic access and procession routes
share one lazy Node `worker_threads` compiler thread, using the same checked
job and reply envelopes. Each queue still permits one in-flight job and retains
its count/byte bounds. Disposal releases its port; the last port terminates
the thread. Failures use the existing queue error path.

Current terrain input is approximately 2.3 MB, exceeding the old geographic
and procession envelopes. Both now allow up to 8 MiB of input; their result
bounds remain unchanged. Procession ready storage allows 32 MiB. Frozen terrain
is shared among host-side input snapshots. A bounded 64-entry cache reuses an
unchanged dynamic envelope, avoiding repeated land copies and identity hashes.
Canonical/digest memoization applies only to recursively frozen plain data
certified by `freezeData`; shallow freezes and accessors are never trusted.

Dedicated shards set `World.massRenderPages = false`. The server does not build
the visual terrain pages that clients already derive from the seed. Requested
neighborhoods still drive gameplay, and physics samples exact current terrain
on demand. Browser rendering keeps its existing preparation path.

This is background compilation, not asynchronous authority. Collision on cold
or teleported ground, native admission, source validation and publication still
run on the simulation thread. The worker cannot publish actors or change live
geometry. Exact bounded geographic-location and native-candidate caches reduce
repeated observer queries without caching mutable doors or combat state.

## Compact world checkpoints

`serializeWorldState({ massCheckpoint: true })` omits `worldmass.config` before
the snapshot's JSON copy. `land: 'seed-preset-v1'` identifies the compact shape;
the saved run, seed, config hash and all mutable consequences remain. The shard
primes the expected preset hash at boot and uses this option for world saves.
Its current world-save interval is 60 seconds; player mirrors remain 20 seconds.

Reading a compact checkpoint derives the opening-reserved preset from its run
seed, verifies the exact saved config hash, and enters the existing strict
restoration path. Changed presets are refused rather than replacing land beneath
saved bodies. Old complete saves remain readable. Default serialization still
includes the full definition for portable or custom worlds; compact saving
refuses custom definitions that cannot be reconstructed from the current preset.

The real-world checkpoint regression measured 5,769,282 bytes for the full
snapshot and 1,842,015 for the compact snapshot: 3,927,267 bytes of generated
land removed. Hydrated JSON is identical to the full saved world, and a cold
restore retains the recorded consequences. Mutable terrain and other live
state still have serialization costs.

## Verification

The dedicated probes are `worldmass_foci`, `worldmass_checkpoint` and
`shardworkers`. They cover complete distant budgets, overlap and separation,
automatic remote-seat enrollment/disconnect, shared pages, preserved casualties
and cold replay, compact-save refusal/compatibility, real Node compiler parity,
event-loop progress, immutable-input safety and thread disposal.

Validation on 2026-10-09:

- All four type checks pass (`npm run check`).
- All 120 worldmass probes have passing results. The full run passed 119;
  `nativewalkcache` then passed after its lookup assertion was corrected to
  allow zero work when the exact point was already cached, instead of demanding
  exactly one redundant source lookup. Its 1,860 collision-oracle comparisons,
  sparse edits, cold Continue and eviction checks remain intact. No probe was
  excluded or repinned. The previously reported procession gameplay case passes.
- All 13 shard probes pass, including the slow persistence/vessel course.
- Generation QA: 869 cases × three seeds, zero failures and four warnings.
- Sim smoke: five scenarios × five seeds pass.
- Browser production build and the hidden game-boot smoke pass.
- The final real Node worker check passes all three compilers, immutable-input
  defenses and disposal, with zero worker faults and no procession fallback work.

Performance uses the existing soak gates without changing thresholds; clustered
and separated players are measured separately. Profile runs are diagnostic and
are not release timing measurements. These are local Windows/Node 24.9.0 results
on an i9-10900K, not a measurement of the two-core codespace.

With no connected players, a 30-second observation completed 1,800 ticks with
zero dropped ticks and zero faults; p50 was 4.11 ms and p95 6.64 ms. The two boot
compiler jobs completed without errors. Other regression jobs were still active
during this idle observation.

The final six-player, 60-second clustered soak, seed `0x00ddba11`, ran after
the other validation jobs finished. It measured p50 7.69 ms, p95 22.28 ms,
1.36% dropped ticks, +15.19 MB live heap, and zero faults or errors. Reconnect
reclaimed the same seat and the party survived. Every gate except p95 passed;
the unchanged p95 limit is 20 ms. The maximum tick remained 303.91 ms, so cold
preparation/publication hitches are still a real limitation.

The final six-player, 60-second spread soak used the same seed and 3,500-pixel
anchors, with roving disabled. It measured p50 24.16 ms, p95 74.22 ms, 46.32%
dropped ticks, +28.48 MB live heap, and zero faults or errors. Reconnect reclaimed
the same seat and the party survived. Every standing player had nearby enemies:
the least observed living radius was four foes, with a mean of 11.98. Its timing
and dropped-tick gates fail; all other gates pass. Maximum tick: 341.94 ms.

These three runtime seams are implemented, but the separated-player shard is
**not performance-ready**. Do not mark the timing part of §6.6 closed or present
this as a smooth MMO release. A final main-thread profile attributes substantial
remaining time to live AI/pathfinding, geographic weather, scenery admission and
dependency scanning. Cold authoritative queries and publication also remain
synchronous. The next performance pass needs to budget those simulation costs
while preserving every player's actual bodies and consequences; the host must
not revert to keeper hopping or suppress other players' surroundings to pass.

Local evidence is retained under `.claude/`: `worldmass-regressions.log`,
`nativewalkcache-final.log`, `shard-regressions.log`, `shardworkers-final.log`,
`shard-foundation-final-check.log`, `foundation-genqa.log`,
`foundation-sim-smoke.log`, `foundation-boot-smoke.log`, `idle-shard.log`, and
`soak-{clustered,spread}-final.local.json`. These generated reports are not
committed.

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

## Focused performance pass and integration sequence

The follow-up pass starts from `c1bfe588`, keeping a fixed comparison while
native area ownership and exploration content change in the other sessions.
The first changes remove repeated work across simultaneous neighborhoods:

- `MassNativeCountry` retains the nine pure candidates of a placement cell.
  Each query still tests the exact point and radius against their original
  bounds. The neighborhood store is limited to `floor(cacheSize / 9)` cells;
  the existing candidate store remains independently bounded. Neither cache
  stores collision results, mutable doors, actors or scenery state.
- Weather readers share exact point results within one weather clock and
  context identity. The 2,048-entry store clears when the clock or scale
  history changes. Shelter is checked on every read, returned fronts remain
  independent copies, and local-frame translations are applied per caller.
- Hierarchy address validation preserves the canonical plain-record contract
  without serializing both records on every query. Geographic weather/storm
  cell keys use the same JSON bytes directly for their fixed primitive tuples.

No population budget, AI cadence, weather rule or soak threshold changes.
This pass does not make synchronous cold admission or publication bounded.

Use the same local course before and after each change, running the timing
measurements sequentially after correctness checks have finished:

```text
npm run soak:shard -- --bots 6 --seconds 60 --spread 0 --rove 0
npm run soak:shard -- --bots 6 --seconds 60 --spread 3500 --rove 0
```

Keep seed `0x00ddba11`, reconnect enabled, the default thresholds, every
standing player's nearby population, and the report's machine information.
Profile separately; do not compare diagnostic profiler overhead to these
timing runs. Local Windows results still need a follow-up on the actual
server hardware after integration.

The two updated spread runs measured p95 **55.11 / 58.23 ms**, versus
**99.28 ms** in the unchanged `c1bfe588` control rerun during this session
(the earlier baseline above was 74.22 ms). Dropped ticks were **30.09% /
32.32%**, versus **55.40%** in that control. These sequential local runs show
useful improvement but substantial run-to-run variation; they do not certify
server capacity. Both updated runs still fail the 20 ms / 5% pacing gates.
Their least nearby living populations were four and five respectively, with
zero host faults or harness errors. Maximum ticks were 372.98 / 316.76 ms;
cold hitches remain.

The second updated run additionally failed the reconnect gate. Its host log
records the selected bot's death and rejoin, then refusal of the previous p6
resume token as no longer dormant; it joined as p7. The first updated run and
the control reclaimed their seats. Preserve the second run as a failed
receipt; do not omit it or weaken the reconnect gate. Reports and host logs:
`.claude/performance-spread-{first,control,final}.local.{json,log}`.

The updated clustered run measured p50 9.09 ms, p95 **20.07 ms**, maximum
293.93 ms, **1.86%** dropped ticks and +17.22 MB live heap. Reconnect and party
checks passed, with zero deaths, faults or errors. Only the p95 gate failed;
20.07 ms is not rounded down to a pass. Its evidence is
`.claude/performance-clustered-final.local.{json,log}`.

Follow-up validation: all four type checks, generation QA (869 cases × three
seeds, zero failures/four existing warnings), browser production build and
26 focused probes pass: 13 geographic/runtime probes and all 13 shard probes.
The latter include the dedicated dormant-seat and death/persistence courses.
One additional probe, `nativescenesky`, stops at its pre-existing whole-World
source pin: 2,455 members versus the archived 2,373. The same count mismatch
was verified against Git object `c1bfe588`; World, the archive and that probe
are unchanged by this pass. No pin was updated or test omitted to claim a pass.
Evidence: `.claude/performance-baseline-sky-pin.local.json`,
`performance-regressions.local.json`, `performance-shard-regressions.local.log`,
`performance-final-check.local.log`, `performance-genqa.local.log` and
`performance-build.local.log`.

Integration should follow the in-flight sessions' tested checkpoint commits,
not a long-lived collection of divergent runtime branches:

1. Finish and record the intended seamless content/area-owner checkpoints and
   the shard-side checkpoints. Leave unfinished edits in their owning sessions.
2. Rehearse the merge in an isolated integration checkout, pinning both tips.
   Merge `codex/shard-runtime-foundation` into `shard-world`, preserving the
   shared history; this branch already includes shard `096393f1`.
3. Bring that shard result into the current `codex/seamless-world-foundation`.
   The older `seamless-world` branch is parked and is not this integration target.
4. Verify the combined code: all type checks, worldmass and shard probes,
   generation QA, browser boot and save/Continue, then clustered/spread soaks.
   Git's conflict check is only a preliminary check. Timing failures stay
   explicit even when correctness passes.
5. Continue feature and performance work as short-lived branches from the
   combined baseline, with one session owning the actual merge and shared
   runtime edits. Integrate tested checkpoints regularly rather than waiting
   for the whole MMORPG undertaking to finish.

The preliminary Git rehearsal of `c1bfe588` with seamless `b80f295d` found one
conflict, in `CLAUDE.md`; code, the probe roster and dormancy merged automatically.
This is not a test of unfinished changes or a completed integration. No target
branch was changed by that rehearsal.

## Combined shard and seamless checkpoint — 2026-10-10

The user authorized finishing local related checkpoints, merging foundation into
shard and then shard into seamless, validating and pushing both. The three
related Codex sessions were idle. Completed native source/assembly, wilderness
density/paths and Mu refinements were already published in seamless `de2fa0e2`.
The shard handoff was paused for a restart; its clean roads branch `889884fc`
contained the completed implementation and waypoint regression, awaiting its
final integration report. Unrelated root-main edits and the untracked native
survey remain outside this merge.

`shard-world` first fast-forwarded to foundation `bad32c1f`, then merged the
roads checkpoint as `e80265c0`. This passed all four type checks, all 13 shard
probes (including 103 sim-unit and 88 slow-shard assertions), town portals,
dimensions, pitfall and couch courses. The merge had no manual code resolution.
An isolated branch based on seamless `de2fa0e2` then merged that shard result.

The combined runtime resolutions preserve these contracts together:

- Destination reservations use every player neighborhood. Each separated group
  funds its own pending destinations; another group's unissued reservations
  cannot deadlock its admissions. A new schema-19 course checks complete
  four-body populations at two distant destinations and stable reversed order.
- Native objective capacity receives both its owner and physical location, so
  an objective excludes its own reservation while respecting its local budget.
- Dormancy and page readiness retain entire native anatomy around every real
  player, exclude the keeper and retain the spatial observer index. A remote
  player's presence beside a worm tail keeps the complete squad awake.
- Compact checkpoints retain schema 19, exact mutable history and the current
  land digest while omitting the seed-derived descriptor before serialization.

The installed-source extraction guard previously required every World member
to match the pre-shard extraction receipt. The automatic World merge deliberately
adds hosted seats, travel, counters and persistence. Its member audit is saved
in `.claude/integration-world-members.local.json`; it removes no World members.
`nativeInstalledShardWorldHash` records this reviewed integration separately
from the original receipt. The eleven original providers, nineteen tunables,
bootstrap roots, helpers, registrations and two independent cold boots still
pass their original comparisons and original boot digest. Unknown subsequent
World edits still fail the guard.

Validation evidence is kept in `.claude/integration-*.local.log` and the ignored
browser reports. All four type checks, 13 combined shard probes, generation QA
(2,607 cases; zero failures, four existing warnings), 25 simulation smoke
scenarios, native source preparation (14 courses), complete native birth
(52 courses), production build, 14 Mu loading checks and boot smoke passed.
The original sky extraction guard remains stale on the published seamless
baseline as well as the combined tree; its whole-World receipt was not repinned.

The combined production client also passed the full wilderness course: actual
movement along a complete generated path, eight distant stops, cold Continue
and return to a wounded survivor. Nearby counts were 33/70/14/15/6/0/7/6
(mean 18.875). Continue retained the 142 saved identities and admitted 16 new
nearby bodies; the returned dune stalker retained 34 life. No client errors.
The empty stop remains an encounter-coverage limitation. The first invocation
of this harness pointed at its default scratch directory and failed to boot;
the passing run explicitly sets `HOLLOW_WAKE_WILDERNESS_DIST=../dist`.

Unchanged published seamless `de2fa0e2` was independently checked during this
integration. It still fails terrainvariation's same terrain hash, courtcontinuity
at the cold return assertion (line 99), processioncontinuity at natural admission
(line 247), and processiongameplay at checkedProximity (line 97). The court
failure is additional to the three listed by the earlier wilderness handoff.
These remain failures; the merge does not relabel their roster entries or relax
their assertions. Baseline receipts are `.claude/integration-baseline-*.local.log`.

The complete combined worldmass run finished **121/124 passing**, with retries
disabled. The three failing probes were terrainvariation, courtcontinuity and
processioncontinuity, all also failing on the unchanged published baseline.
Processiongameplay passed in the combined tree. The full run includes the new
focus/reservation and schema-19 checkpoint assertions, remote anatomy, weather,
all worker contracts, native paging, geographic admission and beacon continuity.
This is a tested integration checkpoint, not an all-green suite or completed
MMORPG/content-parity release.

After correctness tests stopped, the unchanged six-bot, 60-second courses ran
sequentially on the same Windows/Node 24.9.0 machine and seed `0x00ddba11`,
with roving disabled, reconnect enabled and the original thresholds:

| Course | Tick p50 / p95 / p99 | Maximum tick | Dropped ticks | Nearby living min / mean | Heap growth |
|---|---|---|---|---|---|
| Clustered | 6.74 / 28.98 / 44.92 ms | 188.94 ms | 0.64% | 14 / 21.60 | 19.32 MB |
| Spread 3,500 units | 67.63 / 181.84 / 339.82 ms | 1,847.29 ms | 80.41% | 23 / 35.59 | 22.26 MB |

Both runs had zero host faults and zero harness errors. Clustered reconnect and
party continuity passed, with no deaths; its p95 still fails the 20 ms gate.
Spread fails p95, the 5% dropped-tick gate and reconnect. Four bots died and
rejoined; the original party lost a member. Its host log records p6's death,
a new p6 join and refusal of the old resume token as not dormant, followed by
a fresh p7. Keep that failed receipt; the dedicated dormant-seat tests passing
does not make this reconnect course pass. Reports and complete host logs are
`.claude/integration-soak-{clustered,spread}.local.{json,log}`.

The combined wilderness has substantially more nearby bodies than the earlier
performance branch, so these results establish a new workload baseline rather
than a controlled comparison of the cache change. Cold planning/publication and
the spread-player tick workload are the next performance priorities. Neither
this local machine nor these failing gates certify the actual server's capacity.

After the upward merge, `shard-world` and `codex/seamless-world-foundation` are
fast-forwarded to the same validated integration commit before publication.
This keeps server and client world definitions aligned. Foundation and roads
checkpoint branches are also pushed for their original history; no force push,
root-main merge or takeover of unfinished native activation work is involved.

# Shared foundation performance — 2026-10-11

This implementation starts explicitly at consolidated `7799af63`, the published
tip of both `shard-world` and `codex/seamless-world-foundation` at session start.
It lives in `codex/shard-performance`; dirty root main, the parked prototype,
the integration audit and the active loading-renderer work remain separate.
The architecture and unresolved capacity decisions remain in
`../design/shard-m6-plan.md` and charter cards 31–37.

## Changes and invariants

Native actor restoration retains the factory object's already matching property
layout instead of deleting every property before assignment. It still removes
absent fields and reorders fields when needed, preserves own `undefined` versus
absence, reproduces graph enumeration order, and keeps the actual actor identity
and factory-owned behavior. The checkpoint schema and reference remapping do not
change. A local V8 diagnostic on the real gnoll factory observed fast properties
before restore and dictionary properties afterward on the baseline; with the
change both are fast. Older or genuinely different layouts may still require
deletions. This is a demonstrated mechanism improvement, not by itself a proven
whole-shard timing gain.

Terrain samples and navigation region answers now receive their existing
32,768-entry allowance per focus, matching the already bounded page residency
model (at most 16 foci). Six foci can retain at most 196,608 entries in each
cache. Entries allocate on use; departure shrinks them to the new bound. This
trades bounded derived-cache memory for fewer repeated terrain generations.
Population, actor retention, path-search effort, simulation frequency and every
generation rule are unchanged. Terrain edits, native geometry revisions and
provider replacement retain their existing invalidation paths.

Signed cell parsing keeps at most 4,096 already validated string/BigInt pairs.
It never narrows coordinates to Number, caches invalid input, changes random
streams or persists derived data. Boundary, malformed-input and eviction tests
cover the full signed 64-bit domain.

The host now yields to Node between complete expensive ticks when a catch-up
slice consumes one tick's wall-time budget. It continues the same batch through
`setImmediate`: the fixed timestep, five-tick catch-up ceiling, dropped-tick
accounting and wall input credit are unchanged. Interval callbacks cannot
reenter an unfinished batch, and stopping cancels its continuation. No World,
sim unit, native controller or temporary generation policy spans a yield.
Cheap catch-up ticks still run together. The purpose is to let input, worker
replies and reconnects arrive between slow ticks instead of waiting behind
five of them. This does not reduce an individual tick's simulation cost.

## Reproducible measurement

The standard course is six real WebSocket bots, 60 seconds, seed `0x00ddba11`,
60 Hz, roving off, reconnect enabled, standard gates, either clustered or
3,500-unit spread. The fleet remains a separate process. Do not run correctness
jobs during timing comparisons. Background application sessions remain open;
machine CPU utilization is recorded, not assumed idle. This Windows i9-10900K
machine is not the deployment host and the results do not certify capacity.

Use `--diagnostics` for inclusive phase timing, worker queue/round-trip evidence,
terrain query counts, paging state, machine CPU load and a separately timed
compact world checkpoint. The ordinary soak is ephemeral, so its persistence
beat does not run: the explicit checkpoint is outside the timed window and does
not include disk write/fsync. `runtime.attach` is a cold-boot measurement, also
outside the steady window. Phase durations overlap; do not sum them.

`--profile <path>` captures only the load window through Node's inspector. Never
compare a profiled run's timings with unprofiled runs. `--window-at <Unix-ms>`
lets a baseline and candidate open their windows at the same future time after
warm-up. The report records actual start delay, so a late warm-up is visible.
`--conditions <text>` records the concurrency conditions with the result.

The control checkout uses the unchanged `7799af63` engine with identical
measurement code. Paired runs share changing background load, but also compete
with one another; repeated paired and standalone observations are evidence of
relative behavior, not a quiet-host capacity test. Wall-clock bot combat and
worker completion can diverge, so preserve population, deaths and reconnect
results alongside timings.

The input report now uses actual stepped ticks per wall second. Previously
`fed * 60` overstated service during overload. `hostSeenHzPerSeat` measures
drained input batches per seat per wall second; a batch can hold several client
frames. It is not accepted movement time. `nominalHzPerSeat` retains the old
nominal calculation explicitly and `steppedHz` reports simulation throughput.

## Investigation receipts

The unchanged-engine startup-inclusive CPU profile attributed approximately
23.2 seconds of 47.0 seconds inside host ticks to AI, 22.0 to World update
(including 10.9 in worldmass update). AI movement/pathfinding, terrain sampling,
line of sight and repeated coordinate parsing dominate. These are inclusive
sampled times with profiler overhead, not benchmark phase totals.

A restoration-only load-window profile observed 3,366,275 region reads,
32,301 stream samples and 34,153 terrain generations in 30.64 seconds. The
sample cache stayed full at 32,768 entries while terrain/native revisions were
constant. This identified cross-neighborhood cache eviction rather than
terrain mutation as a source of repeated work. The restoration-only first load
pair showed no timing gain: candidate p95 327.86 ms versus control 297.39 ms,
dropped ticks 88.39% versus 88.11%. These staggered exploratory runs also
overlapped the end of a type check; they are not the controlled final comparison.
Candidate reconnect passed and control reconnect failed. Both receipts remain.

The next synchronized spread pair, before the pump change, measured control
p50/p95/p99 111.39/263.84/422.89 ms against candidate 87.96/185.08/296.52 ms.
Dropped shares were 87.61%/82.94%; nearby minimum stayed 21, means were
35.09/32.80. The candidate generated 13,911 terrain samples over 605 ticks,
versus 55,676 over 450 control ticks. Live heap growth increased from 25.16 to
43.56 MiB, within the unchanged 64 MiB gate. Both windows recorded about 50.9%
machine CPU utilization and started within 0.74 seconds of the requested time.
This supports the cache mechanism but still fails capacity gates. The candidate
also failed reconnect; the final scheduler comparisons keep that gate enabled.
That exploratory pair sampled initial heap before the scheduled-window wait;
the final pairs below move the initial collection to the actual window edge.

## Fixed-work terrain replay

`node --import tsx balance/bench_worldmass_cache.ts <report.json>` boots the real
seeded host without starting its pump, then reads 45,414 terrain cells in six
spread neighborhoods three times in identical order. Both versions return the
same SHA-256 digest on every pass:
`1ad8e90f495c39900902731dbe602d5353483fb4d56d57694fa1ba2c9eb80f37`.

| Engine | First pass | Repeat 1 | Repeat 2 | Generated samples on each repeat |
|---|---:|---:|---:|---:|
| Foundation | 4,960 ms | 6,646 ms | 6,868 ms | 45,102 |
| Candidate | 3,870 ms | 14.74 ms | 15.21 ms | 0 |

These sequential runs isolate repeated terrain answers from combat timing and
worker completion. They prove identical output and elimination of this cache
thrash; the large repeated-query speedup is not a whole-game speedup. Candidate
stream residency ends at 46,696 samples versus the control's 32,768 cap. The
first pass differs in already warm cells, so its timing is secondary evidence.

## Final live comparisons

All runs retain six real bots, the shipped 60 Hz, 60-second windows, roving off,
seed `0x00ddba11`, normal combat and the standard gates. Control and candidate
use byte-identical instrumentation. These are two concurrent hosts with their
own bot fleets on an already busy workstation, with no other correctness jobs
from this course. Reproduce with `npm run soak:shard -- --bots 6 --seconds 60
--seed 0x00ddba11 --spread 3500 --rove 0 --diagnostics --window-at <future-ms>
--conditions <description> --report <report.json>` in each checkout; use the
same future timestamp for a pair and `--spread 0` for the clustered pair.

| Spread run | p50 / p95 / p99 (ms) | Max (ms) | Dropped | Input batches/seat/s | Nearby min / mean | Reconnect |
|---|---|---:|---:|---:|---|---|
| C control | 98.61 / 223.26 / 435.99 | 583.69 | 85.36% | 1.74 | 23 / 34.14 | Fail |
| C candidate | 95.65 / 192.01 / 312.33 | 436.34 | 84.39% | 7.42 | 20 / 32.53 | Pass |
| D control | 103.69 / 230.68 / 373.08 | 549.13 | 85.84% | 1.68 | 21 / 32.58 | Pass |
| D candidate | 80.82 / 170.18 / 271.13 | 438.65 | 81.67% | 8.72 | 17 / 27.33 | Pass |

Spread p95 improves 14.0% and 26.2% in these pairs; actual input service improves
4.3x and 5.2x. Both versions still fail the 20 ms p95 and 5% dropped-tick gates.
Candidate runs step 9.31 and 10.94 ticks/s, controls 8.67 and 8.38. Faster input
delivery does not restore real-time simulation. Zero host faults and harness
errors occur in all four. Both C fleets record four deaths/rejoins and retain
their parties. D control records four deaths/rejoins and retains its party;
D candidate records five deaths, four rejoins, a downed first bot at the end and
a broken party. Population rules and encounter generation are unchanged, but
the realized combat populations differ; these are observed course outcomes,
not equal-actor microbenchmarks. Reconnect passing twice is useful evidence,
not a claim that every overload reconnect issue is solved.

Machine CPU utilization is 49.4–49.9% in C and 51.3–51.4% in D. Candidate window
start delays are 388/376 ms; control delays are 3,491/2,943 ms. Requested starts
therefore align the courses approximately, not exactly.

| Spread run | Live heap start → end (MiB) | Growth (MiB) | Peak sampled RSS (MiB) | Terrain generations | Region reads |
|---|---|---:|---:|---:|---:|
| C control | 289.36 → 292.56 | 3.20 | 951.81 | 49,076 | 5,830,349 |
| C candidate | 301.05 → 315.02 | 13.97 | 918.81 | 12,050 | 7,460,257 |
| D control | 290.26 → 297.77 | 7.51 | 997.19 | 50,076 | 5,485,579 |
| D candidate | 300.32 → 322.41 | 22.09 | 939.49 | 12,125 | 6,398,401 |

The extra derived-cache residency raises live heap; the unchanged 64 MiB growth
gate passes. Short runs do not prove long-term retention safety. Exact native
pages and compact saves remain independently bounded and retain their tests.
These ephemeral steady courses did not trigger native disk paging; the browser
and persistence probes, rather than a zero paging counter, verify that path.

The clustered course was repeated because the first pair favored the control:

| Clustered run | p50 / p95 / p99 (ms) | Max (ms) | Dropped | Input batches/seat/s | Nearby min / mean | Heap growth (MiB) |
|---|---|---:|---:|---:|---|---:|
| First control | 7.61 / 21.52 / 58.32 | 204.08 | 0.61% | 49.33 | 14 / 16.82 | 5.35 |
| First candidate | 7.91 / 34.71 / 56.62 | 102.82 | 1.75% | 40.96 | 15 / 18.57 | 2.41 |
| Repeat control | 8.96 / 45.34 / 69.50 | 218.18 | 2.68% | 38.27 | 14 / 20.02 | 5.02 |
| Repeat candidate | 8.88 / 34.93 / 66.07 | 157.82 | 0.97% | 44.30 | 16 / 18.83 | 4.63 |

Every clustered run passes reconnect, retains its party, records no deaths,
faults or harness errors, and fails only the 20 ms p95 gate. Machine utilization
changes from 42.07% in the first pair to 51.1–51.2% in the repeat; starts lag
their requested time by 285–328 ms. The directional p95/input result reverses
between pairs while combat populations differ. There is no reliable clustered
improvement or regression attribution from these observations. The candidate
is not presented as universally faster. Live heap ends at 231.0–231.7 MiB;
sampled peak RSS is 914–928 MiB candidate versus 880–882 MiB control. Compact
clustered checkpoint capture takes 119–150 ms before JSON encoding.

## Remaining bottlenecks

The final standalone 30-second CPU diagnosis starts after ordinary join warm-up,
without the paired courses' extra scheduled-start wait. It is an earlier and
profiled workload, not another comparable benchmark. Its 30.31-second profile
contains 29.44 seconds inside host ticks: 14.69 seconds under `updateAI` and
13.25 under `World.update`, including 5.35 in worldmass update. Inclusive
movement/pathfinding accounts for 6.16/5.40 seconds, target acquisition 4.28,
region lookup 4.76 and terrain sampling 3.56. The largest sampled self costs
include native obstacle candidate lookup (1.38 seconds), deterministic random
draws (1.25), reserved-population scanning (0.99) and region lookup (0.86).
These overlap. Profile/meter overhead is visible and is not engine work.

The early-load profile still fails p95 and dropped-tick gates (322.69 ms and
88.92%); reconnect also fails because its cut lands at 30.51 seconds and the
short window ends before return. That failed diagnostic receipt is retained.
The full 60-second unprofiled courses above are the reconnect comparisons.

In spread C's unprofiled candidate window, `World.update` totals 21.33 seconds,
including 3.69 in worldmass update. Full snapshot construction/encode/send
totals 2.08 seconds, of which transport encode/send is 0.49; input application
is 0.17. The runtime's p99 remains 197.49 ms, so removing repeated terrain work
does not remove occasional main-thread admission/validation spikes.

Worker samples report cumulative process lifetime, including boot. Spread C
has 15 candidate completions and 12 control completions, no worker failures,
and no queued/inflight work during sampled steady load. Round-trip maxima are
5.00/5.74 seconds; these include queueing and host delivery delay, not just
compiler CPU. Geographic validation's observed largest slices remain
242/366 ms. Native readiness costs only 48.92 ms total in the candidate window,
with no pending-resume samples; it is not the steady bottleneck in this course.
Cold host boot is 12.11/12.91 seconds, including 6.37/7.24 seconds in runtime
attachment. Boot and steady-state need separate work.

Outside the windows, compact spread checkpoints are 3.13–3.41 MB. Capture and
serialization take 234–287 ms, plus 22–29 ms JSON encoding; this deliberately
does not measure disk/fsync. Persistence spikes therefore still need a real
disk-backed course before making a latency guarantee.

Next work should profile and reduce repeated target/obstacle queries and
reserved-population scans with exact invalidation and gameplay parity, then
separately address large native/geographic validation slices. The unresolved
M6 governor, activation and simulation-rate decisions require their documented
design review. This change preserves population and simulation-rate policies.
Capacity remains unproven and the spread course is far below the shipped 60 Hz.

## Correctness verification

All four type targets and the production build pass (the existing bundle-size
warning remains). All 22 shard probes pass, including slow persistence and the
new pacing probe, with retries disabled. The five-scenario simulation smoke
course passes all 25 episodes. Generation QA passes 2,607 cases with zero
failures: four existing overlap warnings and one 527 ms metropolis timing
warning while correctness jobs ran concurrently.

Thirteen focused probes pass: dormancy, character resume, multi-focus residency,
compact checkpoints, native host, brittle restoration, occurrences, processions,
procession gameplay, navigation cache, dirty terrain, worldmass addresses and
installed native sources. The navigation test retains its 1,860 independent
ray/collision comparisons and adds cache growth/shrink and terrain-edit checks.
Restore tests cover object identity, exact graph order, absent/undefined fields,
reordered fields and factory behavior. The installed-source guard retains its
original receipt; no source guard or test threshold was repinned.

Isolated client boot and the actual wilderness course pass with zero client
errors. The player follows a complete generated path, then visits eight distant
stops. Nearby counts are 43/63/28/20/8/0/15/16 (mean 24.125); the empty stop is
preserved in the receipt. Cold Continue retains all 275 original identities,
admits 17 additional bodies and restores the saved fang priest at 239.4 life.
The existing page-readiness check remains; this run needs no pending-page wait.

The full 124-probe worldmass suite was not repeated in this performance pass.
The foundation's three known failures remain unresolved: terrainvariation hash
`f24109327cf6e53f` versus `4225203d67bebfb4`, courtcontinuity line 99 and
processioncontinuity line 247. Native sky's stale whole-World count receipt
(2,522 versus 2,351) also remains unresolved. Passing focused tests does not
replace those known release failures.

Raw reports, profiles and logs stay local; generated artifacts are not
committed. `final-*.local.log` holds verification output and
`balance/reports/wilderness-ui.json` holds the client receipt.
Candidate reports are `.claude/final-{spread-c,spread-d,clustered,clustered-repeat}.local.json`.
Control reports and their exploratory predecessors are preserved under
`.claude/ownership.performance-control-evidence/` before archiving the temporary
control checkout. Initial full-process profiles are under
`.claude/ownership.performance-profiles/`; the final load-window profile is
`.claude/final-window.local.cpuprofile`. The final candidate source is unchanged
through both spread pairs, both clustered pairs and the final profile.

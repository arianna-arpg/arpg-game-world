# Foundation and Shards alignment — 2026-10-13

The foundation now supplies F1 and F3 requested by the shard lane in `docs/design/shard-world.md` §7g and `docs/design/shard-m6-plan.md` §3.3. The shard lane still owns governor policy, its host integration and its branch conflict resolutions.

## F1: host population allowance

`WorldMassRuntime.setPopulationBudget({ total, floor } | null)` changes future population admissions. Each connected focus group receives `max(floor, min(config.maxPopulation, floor(total / groupCount)))`. A floor can make the sum exceed the requested total; the caller must report that condition rather than silently reducing its floor. Existing bodies, wounds and reservations remain intact. Passing `null` restores the original policy.

Both inputs must be nonnegative safe integers and the floor cannot exceed the configured per-group maximum. Invalid input throws without replacing the current policy. The runtime takes its own copy. The policy is host state outside configuration, terrain identity and all saved state; Continue starts with the default until its host reapplies its policy.

`populationStats()` returns a fresh `{ total, groups: [{ members, live, limit }] }` observation. `members` contains focus ids. The total is the runtime's actual population; each group's live count uses the existing population admission slots. Reading it does not generate terrain or create residents. With no groups it reports an empty group array. Reservation accounting remains in the original admission path.

The focused course covers separated/overlapping/empty groups, real births, invalid inputs, floors, upper bounds, unchanged body identity, detached output, unchanged save/land state and cold default restoration. Host governor controls and an optional residency-radius override are separate work.

## F3: a character's seamless bounty board

`dealMassBounties` adds `questCharKey()` to its seed only when a real character key exists. Candidate challenge bounds and manageable choices both read `questHandLevel()`. This preserves the existing solo/co-op seed and board while hosted characters receive their own deterministic rolls at their own level. Rejoining under a new seat id keeps the same character's seed. Existing locked, held and standing-slate behavior stays with the character ledger.

The actual-host course compares the solo reward/slate digest with the unchanged parent, then checks distinct equal-level characters, rejoin, low/high characters against the opposite keeper level, actual discovered high-level destinations, shared co-op behavior and ledger isolation.

## Performance branch handoff

The separate reconciliation lane has now merged `codex/shard-performance` (`f967869c`) into `shard-world` as `d025d99fa167692405403e4106c04d4379542b1c`. This supersedes the earlier unmerged status. Its recorded handoff is `docs/design/shard-world.md` §7g and `docs/engine/shard-runtime-foundation.md` on that branch.

That lane restored the arrival/history/Titan projected goldens, adopted compact ZoneW/zonePaint with protocol 6, reconciled browser opening and optional Node terrain preparation, and capped derived per-focus caches at twice their single-focus capacity. It separately supplies F1/F3; the two implementations require deliberate reconciliation when the foundation lands, rather than assuming byte identity. Its host governor remains separate work. The alignment review recommends keeping the foundation's single-read/private budget storage and one-pass statistics, as well as the narrow World input signatures needed by retained-area callers. Shards additionally salts hosted posting IDs with the character key while the foundation currently salts the draw. Preserve existing held/standing postings during that identity reconciliation; this is a merge contract choice, not a demonstrated broken current slate.

The lane records 23/23 shard probes, 139 green worldmass probes, types, build, generation, simulation smoke, boot and renderer courses. Five restored checks remain explicitly red: foragercommitment, nerverecovery, worldmass_processioncontinuity, nativeinstalledsources and nativescenesky. These are unresolved original assertions, not part of the green count. The first boot-menu failure and unchanged successful reruns are documented.

Its post-merge measurements use two serial six-bot, 60-second measured windows, with reconnect, both optional experiments disabled and the population budget unset:

| Recorded integration course | Tick p95 | Dropped ticks | Heap growth |
| --- | --- | --- | --- |
| Clustered | 34.22 ms | 10.77% | 18.11 MB |
| Spread 3500 | 250.70 ms | 88.39% | 54.21 MB |

Both runs breach the unchanged tick-p95 and dropped-tick gates, with zero faults or harness errors and same-seat reconnect passing. These are the other lane's recorded integration results, not a new foundation rerun or a controlled comparison attributing an improvement/regression. The older concurrent-control results remain in that lane's history; none establish deployed capacity or 60 Hz.

## Foundation merge coordination

This foundation session has not performed a merge or resolved conflicts. A fresh dry run of foundation `a00566963438a19e7d437e0f75f02623be8e3faf` into shard-world `d025d99fa167692405403e4106c04d4379542b1c` found **32** conflicting files. The original 24-file estimate and the later 27-file inventory were from older tips. The shard lane has independently completed its performance-branch merge, as recorded above. Later commits require another dry run.

Before resolving that merge, notify the shard lane and agree ownership; shard-owned files remain for that lane to resolve. This written handoff does not claim that an external Claude session has received a message.

## Remaining scope

The foundation now includes F1/F3, repeat Crusade/Demon entrance renewal, and event-owned Crusade garrisons/commander attribution. Existing realm occupants, wounds and ordinary death effects remain intact. Crusade terrain/structure renewal is a separate known parity gap. Dedicated retained-area scheduling remains excluded pending the correction described below.

The retained scheduler candidate was measured against foundation `2f9d4cbb` with equal actual populations, two real TCP clients (eight in the last case), 40 warm-up and 80 measured frames per host, and alternating host order. This is a same-process diagnostic, not a concurrent deployment soak:

| Course | p95 baseline → scheduler candidate | Actors in each host |
| --- | --- | --- |
| Two players in town | 62.38 → 74.32 ms | 50 |
| Two players in separate areas | 103.68 → 116.76 ms | 49 + 43 |
| Both return from a retained remote area | 112.93 → 72.19 ms | 50 + 42 |
| Eight players in town | 95.99 → 109.22 ms | 56 |

All hosts completed 120 frames with zero faults. The candidate froze the empty remote area for all 120 frames, while the baseline kept running it. All measured frames exceeded 16.67 ms. Occupied areas regressed, so this scheduler is excluded from the focused handoff pending a performance correction. The candidate also includes F1/F3 and the entrance renewal; this comparison does not isolate their individual timing effects.

The accepted remote-main baseline is `a2fa42917262e9229140b6364b6d5e461b32f50e`. The initial inspection found 24 local-only commits at `118b510f8b5bfb781163c5bc13ea4908f698e75b`; independent patch-id comparison shows all 24 are equivalent to changes already in the accepted remote baseline. This range adds no new gameplay delta. The local tip instead lacks later accepted remote follow-ups and should not be imported wholesale. Full content parity, scheduler performance correction, server capacity, private quest zones and generated entrance/terrain layouts remain open.

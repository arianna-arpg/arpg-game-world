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

The inspected local `codex/shard-performance` checkpoint is `f967869c`; both later experiments remain disabled. Its recorded final verification includes four type checks, 28 affected probes, generation, boot/build and an actual browser Save/Continue course. Three critics found no functional blocker within that checkpoint's supported contracts. This is a reviewable functional checkpoint, not performance acceptance.

The shard lane subsequently recorded its independent Opus review in commit `cb98a57138e510eedadb72345a36a4392eb1db09`, present at inspected shard tip `af891eb72e7c86d443e05650d26c887d7adf5a13`. F6 is now **DONE**. Its charter and performance-lane document report default-path parity acceptance, 23/23 shard rigs, matching simulation smoke episodes and the following newer concurrent controls (candidate versus base):

| Recorded critic course | p95 candidate / control | Dropped candidate / control |
| --- | --- | --- |
| Four players together, pair 1 | 12.1 / 15.3 ms | 0.6% / 3.5% |
| Concurrent pair 2 | 15.3 / 15.0 ms | 1.1% / 3.3% |
| Players spread 3500 px | 106 / 159 ms | Both courses breach the performance gate |

These are the other lane's recorded results, not a new foundation rerun. It also reports boot at 8 versus 11 seconds and spread heap growth of 51 versus 34 MB in 30 seconds; a cache multiplier cap or byte budget remains owed. Functional review supports integration after the conflicts are reconciled; spread capacity is still unaccepted.

The earlier **concurrent-control** spread pairs in that branch's `docs/engine/shard-performance.md` used two hosts, each with six real WebSocket bots, 60-second runs, 60 Hz, seed `0x00ddba11`, spread 3500 and roving disabled on a busy Windows i9-10900K workstation:

| Pair | p50 control → candidate, ms | p95, ms | p99, ms | Dropped control → candidate |
| --- | --- | --- | --- | --- |
| C | 98.61 → 95.65 | 223.26 → 192.01 | 435.99 → 312.33 | 85.36% → 84.39% |
| D | 103.69 → 80.82 | 230.68 → 170.18 | 373.08 → 271.13 | 85.84% → 81.67% |

Both pairs failed the 20 ms p95 and 5% dropped gates. These earlier pairs are not the final checkpoint's ordinary-path comparison: that later comparison was six **serial alternating** runs with both switches off, with mixed tail results and all six runs failing p95/dropped gates. Neither course establishes deployment capacity or 60 Hz.

A fresh dry run of local `codex/shard-performance` into `shard-world` at `af891eb72e7c86d443e05650d26c887d7adf5a13` found three conflicts: `balance/proberoster.ts`, `src/worldmass/generator.ts` and `src/worldmass/runtime.ts`. The newer F6 review is accepted, while those integration conflicts still prevent an automatic merge. The browser opening worker and Node terrain-preparation path must both survive the resolution, followed by the relevant parity checks. No remote performance branch ref was returned by the remote inspection.

## Foundation merge coordination

No merge or conflict resolution was performed. The dry run of foundation `2f9d4cbbcc0562540ef435ba0baf599c2373cb2d` into shard-world `66ca40c86f67f6b0c43d04321dc7b834c8cb6d3e` found **27**, rather than the earlier 24, conflicting files, spanning visual probes, source checks, visual data/rendering, the roster, World, main and the snapshot. Later commits require a fresh dry run.

Before resolving that merge, notify the shard lane and agree ownership; shard-owned files remain for that lane to resolve. This written handoff does not claim that an external Claude session has received a message.

## Remaining scope

The focused handoff contains F1/F3 and their regression coverage. Dedicated retained-area scheduling and repeat Crusade/Demon entrance renewal remain separate reviewed candidates. Crusade garrison/structure renewal is a known parity gap.

The retained scheduler candidate was measured against foundation `2f9d4cbb` with equal actual populations, two real TCP clients (eight in the last case), 40 warm-up and 80 measured frames per host, and alternating host order. This is a same-process diagnostic, not a concurrent deployment soak:

| Course | p95 baseline → scheduler candidate | Actors in each host |
| --- | --- | --- |
| Two players in town | 62.38 → 74.32 ms | 50 |
| Two players in separate areas | 103.68 → 116.76 ms | 49 + 43 |
| Both return from a retained remote area | 112.93 → 72.19 ms | 50 + 42 |
| Eight players in town | 95.99 → 109.22 ms | 56 |

All hosts completed 120 frames with zero faults. The candidate froze the empty remote area for all 120 frames, while the baseline kept running it. All measured frames exceeded 16.67 ms. Occupied areas regressed, so this scheduler is excluded from the focused handoff pending a performance correction. The candidate also includes F1/F3 and the entrance renewal; this comparison does not isolate their individual timing effects.

The accepted remote-main baseline is `a2fa42917262e9229140b6364b6d5e461b32f50e`. The initial inspection found 24 local-only commits at `118b510f8b5bfb781163c5bc13ea4908f698e75b`; independent patch-id comparison shows all 24 are equivalent to changes already in the accepted remote baseline. This range adds no new gameplay delta. The local tip instead lacks later accepted remote follow-ups and should not be imported wholesale. Full content parity, scheduler performance correction, server capacity, private quest zones and generated entrance/terrain layouts remain open.

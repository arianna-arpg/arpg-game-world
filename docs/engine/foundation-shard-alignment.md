# Foundation and Shards alignment — 2026-10-13

The foundation now supplies F1 and F3 requested by the shard lane in `docs/design/shard-world.md` §7g and `docs/design/shard-m6-plan.md` §3.3. The shard lane still owns governor policy, its host integration and its branch conflict resolutions.

## Foundation checkpoint — 2026-10-14

The audited main reconciliation is committed as `d94f36c73c7d3179b96088e6bf42025dfd923ab4`, with the foundation and pinned main `a2fa42917262e9229140b6364b6d5e461b32f50e` as its parents. The 46 formerly main-only commits now have genuine merged ancestry; behind that pinned main is zero. Runtime/content auditing and the retained roster cancellation repair accompanied the merge. This ancestry result does not claim complete playable-content acceptance.

Retained Fracture completed-hop lifetime is independently accepted, committed as `9e50d2f2ecbe44900cc09969a34c6f3c06988918`, and pushed to `codex/seamless-parity-checkpoint-20261014`. Actual return/capstone, callback, occupancy, successor and cold Continue courses pass. The bounded Amalgamation stage follow-up is documented in `docs/worldgen/native-amalgamation-stage-lifetime.md`; its composition remains subject to independent source review before promotion.

The current original `nativeinstalledsources` assertion is red. Diagnostic 228 identifies two retained-owner bridges: `nativeCrusadeFixtureMemory` → `nativeCrusadeTerrain`, and `nativeVendettaIdentity` → `nativeAreaSceneVendettaLifetime`; both ultimately reach `World`. A static cut is only an architectural diagnosis, not an implemented or accepted repair. The older `0c1d154c` replay table below remains its historical observation, including its then-passing installed-source result; it is not the current result. No assertion, baseline or tolerance has been relaxed.

Private quest/party instances, generated entrances and bounded terrain, server capacity and scheduler acceptance remain open. Firefox/cooperative loading changes need adaptation to the actual retained entry and original guard contracts. The shared `origin/codex/seamless-world-foundation` tip `cbafcc5b` has 13 separate remote-only commits still requiring deliberate reconciliation; merging main does not settle that divergence. Shard-owned integration and conflict resolutions remain with the shard lane.

This document is the written cross-lane relay. It does not claim direct Claude IPC or delivery to another running session. Notify and coordinate with the shard lane before resolving its files.
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

That lane restored the arrival/history/Titan projected goldens, adopted compact ZoneW/zonePaint with protocol 6, reconciled browser opening and optional Node terrain preparation, and capped derived per-focus caches at twice their single-focus capacity. It separately supplies F1/F3; the two implementations require deliberate reconciliation when the foundation lands, rather than assuming byte identity. The later pinned shard update below records its governor integration. The alignment review recommends keeping the foundation's single-read/private budget storage and one-pass statistics, as well as the narrow World input signatures needed by retained-area callers. Shards additionally salts hosted posting IDs with the character key while the foundation currently salts the draw. Preserve existing held/standing postings during that identity reconciliation; this is a merge contract choice, not a demonstrated broken current slate.

The lane records 23/23 shard probes, 139 green worldmass probes, types, build, generation, simulation smoke, boot and renderer courses. Five restored checks remain explicitly red: foragercommitment, nerverecovery, worldmass_processioncontinuity, nativeinstalledsources and nativescenesky. These are unresolved original assertions, not part of the green count. The first boot-menu failure and unchanged successful reruns are documented.

Its post-merge measurements use two serial six-bot, 60-second measured windows, with reconnect, both optional experiments disabled and the population budget unset:

| Recorded integration course | Tick p95 | Dropped ticks | Heap growth |
| --- | --- | --- | --- |
| Clustered | 34.22 ms | 10.77% | 18.11 MB |
| Spread 3500 | 250.70 ms | 88.39% | 54.21 MB |

Both runs breach the unchanged tick-p95 and dropped-tick gates, with zero faults or harness errors and same-seat reconnect passing. These are the other lane's recorded integration results, not a new foundation rerun or a controlled comparison attributing an improvement/regression. The older concurrent-control results remain in that lane's history; none establish deployed capacity or 60 Hz.

## Latest shard asks and foundation replay

Read-only inspection of shard-world at `beb1d978855035cb86e3b1bf4b0120a55449303c` records that W1 now feeds the host governor from the actual tick and uses its population-budget API. F9 asks for a cache byte/count budget and a 600-second soak; F13 asks for per-actor terrain/solid memoization. W2/W3 worker hosting still needs an agreed foundation runtime boundary. Those performance requests remain separate from content acceptance.

The foundation replay pins `0c1d154c3b0e2b40748497a897979e9f18a79224` (the accepted Hunt composition), with every source file checked before and after all six courses. It observes:

| Original check | Foundation result |
| --- | --- |
| foragercommitment | Fails the seed 451 melee-cast increase assertion; seed 42 passes. |
| nerverecovery | Fails the old-rule generated-country negative control; the earlier three-rate panic/recovery and courage cases pass. |
| worldmass_processioncontinuity | First 12 courses pass; natural seed 713 reaches 5000 steps without an admitted cart. |
| nativeinstalledsources / nativescenesky | Both pass unchanged. The shard lane's failures require review of its integration delta. |
| smoke baseline comparison | Three metrics exceed the original bands: warrior wave time 20.97 to 15.26; duelist output and dummy DPS 235.61 to 274.07. |

The three behavioral probe rows are explicitly red debt; their original assertions remain unchanged. These failures do not yet distinguish a gameplay regression from a stale comparative oracle. Simulation smoke execution passing is separate from its baseline comparison. No golden, baseline or tolerance was updated. This relay reports observed foundation results and recorded shard requests; it does not claim direct delivery to Claude or a current shard rerun.

## Foundation merge coordination

This foundation session has not performed a merge or resolved conflicts. A fresh dry run of foundation `a00566963438a19e7d437e0f75f02623be8e3faf` into shard-world `d025d99fa167692405403e4106c04d4379542b1c` found **32** conflicting files. The original 24-file estimate and the later 27-file inventory were from older tips. The shard lane has independently completed its performance-branch merge, as recorded above. Later commits require another dry run.

Before resolving that merge, notify the shard lane and agree ownership; shard-owned files remain for that lane to resolve. This written handoff does not claim that an external Claude session has received a message.

## Remaining scope

The foundation now includes F1/F3, repeat Crusade/Demon entrance renewal, and event-owned Crusade garrisons/commander attribution. Existing realm occupants, wounds and ordinary death effects remain intact. Hunt quarries retain their wounds and flee phase when returning to visited ground. Crusade works renew through the actual unoccupied arrival, and current-zone Continue preserves the complete saved furniture census and opened doors. Conclave now settles a rite on its last physical occupant departure, retires only its own cultists/pentagram, and permits genuine successor rituals without repeating incubation. Vendetta ambushes can renew on genuinely unoccupied returns: the original field chooses the writ and cooldown, while exact surviving same-writ cohorts keep their wounds and prevent duplicate allocation. These content changes retain original source assertions and independently reviewed failure controls. Private quest instances, broader content auditing and Shards performance remain open. Dedicated retained-area scheduling remains excluded pending the correction described below.

The retained scheduler candidate was measured against foundation `2f9d4cbb` with equal actual populations, two real TCP clients (eight in the last case), 40 warm-up and 80 measured frames per host, and alternating host order. This is a same-process diagnostic, not a concurrent deployment soak:

| Course | p95 baseline → scheduler candidate | Actors in each host |
| --- | --- | --- |
| Two players in town | 62.38 → 74.32 ms | 50 |
| Two players in separate areas | 103.68 → 116.76 ms | 49 + 43 |
| Both return from a retained remote area | 112.93 → 72.19 ms | 50 + 42 |
| Eight players in town | 95.99 → 109.22 ms | 56 |

All hosts completed 120 frames with zero faults. The candidate froze the empty remote area for all 120 frames, while the baseline kept running it. All measured frames exceeded 16.67 ms. Occupied areas regressed, so this scheduler is excluded from the focused handoff pending a performance correction. The candidate also includes F1/F3 and the entrance renewal; this comparison does not isolate their individual timing effects.

The accepted remote-main baseline is `a2fa42917262e9229140b6364b6d5e461b32f50e`. The initial inspection found 24 local-only commits at `118b510f8b5bfb781163c5bc13ea4908f698e75b`; independent patch-id comparison shows all 24 are equivalent to changes already in the accepted remote baseline. This range adds no new gameplay delta. The local tip instead lacks later accepted remote follow-ups and should not be imported wholesale. Full content parity, scheduler performance correction, server capacity, private quest zones and generated entrance/terrain layouts remain open.

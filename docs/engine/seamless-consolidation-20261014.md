# Seamless consolidation — 2026-10-14

> Historical merge and recovery record. The branch roles and worktree paths below are the inspected 2026-10-14 state. Current delivery uses [the main/seamless integration policy](../ai/branch-integration.md); start current work at [CLAUDE.md](../../CLAUDE.md). Source receipts below remain historical evidence, not additional release gates.

`codex/seamless-world-foundation` is the canonical seamless integration branch.
This consolidation joins local foundation `5a7eac003607edd65a4d30ec96a14543752a1177`
and the 13-commit remote line at `cbafcc5b72b40b1eef1b64cf4ed7f34a7f5b940b`
with a real two-parent merge. The pinned main baseline
`a2fa42917262e9229140b6364b6d5e461b32f50e` is already an ancestor through
`d94f36c73c7d3179b96088e6bf42025dfd923ab4`. No seamless work was merged into
main or Shards, and no new development branch was created.

## Branch map and recoverability

| Branch | Role after consolidation |
| --- | --- |
| `codex/seamless-world-foundation` | Canonical seamless work and this reviewed reconciliation. |
| `main` / `origin/main` | Main line; unchanged by this task. The local `118b510f` range has 24 patch-equivalent commits already represented in the accepted remote baseline. |
| `shard-world`, `perf-lane` | Active Shards work at the inspected `beb1d978855035cb86e3b1bf4b0120a55449303c`; preserved. Shards owns its integration and performance work. |
| `codex/seamless-parity-checkpoint-20261014` | Retired remote backup at `5a7eac003607edd65a4d30ec96a14543752a1177`; history is in the canonical merge and recovery bundle. No local branch existed. |
| `codex/seamless-main-reconciliation-20261014` | Retired local/remote backup at `d94f36c73c7d3179b96088e6bf42025dfd923ab4`; checkout retained at the same detached commit, including ignored evidence and preview fallback assets. |
| `codex/seamless-fracture-wip-20261014` | Retired local/remote draft at `5c4441d63bd6ee7a1a2c10834edcb574bcd02bb5`; adapted by accepted `9e50d2f2ecbe44900cc09969a34c6f3c06988918`. Original draft is in the verified bundle; archived worktree recovery state is preserved. |

The complete-history recovery bundle is
`.claude/seamless-consolidation-20261014.local.work/backup-recovery.bundle`
in the canonical checkout. Its SHA-256 is
`a840a7baf54f468b4d4fae907a8854740aff178c2ea9c7472e0bd4b6b6d1ddee`.
`git bundle verify` succeeds and all three exact backup tips are listed inside.
Nine of the Fracture draft's eleven authored paths are byte-identical to the
accepted adaptation; the remaining birth/combat changes compose Vendetta
ownership without removing the Fracture implementation. The original draft
commit itself remains recoverable even though it is not an ancestor of the
accepted adaptation. Recovery does not depend on reflog expiry or a remote ref.

The initial four foreign/raw working files were hashed and preserved. They are
not part of the authored changes. User save files, the preview storage scope,
existing browser tabs and unrelated worktrees are outside the cleanup.

## Deliberate merge decisions

The companion [per-path ledger](seamless-consolidation-20261014.json) records all
144 incoming paths with base, local and remote blobs and an explicit disposition.
There were 25 conflict paths and 63 merge-tree changes, including 38 changes
without textual conflicts; 72 paths were already identical at both tips.
Automatic merging did not establish acceptance. All departures from Git's
reconstructed merge tree are covered by the staged ownership gate.

The remote visual additions are already represented by the retained-runtime
adaptations on the local foundation. Those adaptations, including Solar Brand
and Madden, the canonical filtered multiplayer fields and negative assertions,
are retained. Main integration includes the body/hand spell preparation,
cast-family fallbacks, return-only summon links, Mu's Reliquary exclusion,
minion focus, Charge wake and paced recovery orbs. Existing source proofs,
baseline data, projected goldens, probe seeds, timing thresholds and roster
`args` are preserved. The 31-file phase224 and three-file phase229 frozen
evidence sets remain intact; their historical input hashes are not overwritten
to make the new candidate match old evidence.

The merge imports the remote two-frame/hidden-document loading-presentation
helper and its two call sites. It also imports the real isolated worker's
`self = globalThis` / `globalThis.postMessage` fixture correction and disables
the TSX cache in that cold worker. Those four files retain the reviewed remote
blobs. The additive presentation probe checks visible two-frame completion,
hidden completion, visibility transitions and listener cleanup without a
100 ms timer claiming paint.

The old `World.startWorldMassAsync` preparation path is not the actual retained
Begin/Continue path. Its broad mass-runtime preparation changes are explicitly
deferred, not silently discarded or described as a retained-loading repair.
Their complete commits remain in the second parent. In particular, `397796b6`
is inseparable from any future import of that pipeline: admission warming must
stay out of live exploration. Existing F1/F3 behavior, source issuance, private
factory receipts and borrowed synchronous scopes remain unchanged.

## Bounded retained-loading improvement

Profiling actual Firefox entry and cold Continue found repeated geography
capture/validation and reader setup inside synchronous retained construction
and installation. The adaptation shares only fully validated immutable source
data and immutable execution views. Every live raw registry is still traversed
on each capture, including nested own descriptors, property order, prototypes,
finite values and structural rejection checks. A structural snapshot brand is
not a semantic-validation brand. Caller-owned or externally frozen objects
never acquire the validated-output shortcut.

Exact serialized bytes remain the identity. A bounded four-entry/2 MiB UTF-16
key cache reuses prior semantic validation only after complete structural
capture; oversized valid inputs remain valid without strong retention. The
byte bound concerns serialized keys, not a measured total-heap budget. Full
prototype descriptor checks guard admission and reuse; dirty prototypes take
the original semantic-validation-before-serialization order. Every reader
still owns its climate warning/home state, field-choice memos, continent
reader, closures and caller-visible RNG pool arrays. No source receipt,
actor creation or retained installation is moved across an async boundary.

The independent 12-case probe covers live nested registry mutation, accessor
and prototype negatives, exact malformed bytes, self-clearing Proxy pollution,
cache eviction, oversized valid data, mixed reader query order, external RNG
identity and serialization side effects. Deliberately sharing field-choice
state or skipping the post-copy prototype guard fails its intended negative
course. The earlier serialization-order bug and corrected result are both
preserved in the ignored review evidence.

The two additive checks run explicitly with `npx tsx
balance/check_geographysourcememo.ts` and `npx tsx
balance/check_loadingpresentation.ts`. They are standalone harnesses: the
existing roster is itself covered by a historical exact-source contract. An
initial attempt to add roster rows correctly failed that original guard; the
roster was restored exactly and the new checks moved outside its `probe_*.ts`
census. A finite new source view then composes the seven intentional existing
file changes (two documentation and five implementation files) into the
historical proof chain. Only two outer-reader imports change; their original
non-import statements and assertions are identical. Nine exact before/after
rows reverse only the reviewed hunks to pinned5a, preserving historical raw
line endings. Unknown edits, duplicate/partial reads and wrong source identities
still refuse; unrelated files and filesystem exports remain native. The new
`npx tsx balance/check_seamlessconsolidationsource.ts` verifies this composition,
actual implementation hashes, the old archives, every prior probe and the
unchanged roster. All three explicit checks remain required alongside the
original rostered probes. No old archive, accepted hash or assertion is changed.

## Verification and remaining gaps

| Check | Observed result |
| --- | --- |
| All four TypeScript configurations | Pass; affected sim/check configuration rerun after final fixture composition. |
| Original geography / native geography / dimension catalog | Pass, including exact byte identity, live mutation, reader order and cache pressure. |
| Retained Begin (11 probes), Continue (6), ordered Continue and area source sessions | Pass, including genuine save/owner/receipt paths. |
| Main visual and canonical wire courses; real isolated procession worker | Pass with original assertions and thresholds. |
| Three standalone checks | Pass: 12 geography boundary cases; loading presentation cases; 9-row source composition with 54 whole-source mutations, 27 hunk mutations, 36 EOL cases, 117 raw reads, 101 unrelated native filesystem exports and original 48 reader assertions. |
| Original Amalgamation, Fracture, roster-cancellation and Vendetta source proofs | Pass after the finite composition; historical archives and assertions unchanged. Earlier new-candidate failures remain recorded. |
| Generation and simulation smoke execution | Pass. |
| Production/readable builds; game and launcher smoke | Pass. Smoke profiles/save directory were isolated; temporary local override removed. |
| Real browser retained entry/reload/Continue and roster race | Pass, including post-publication cancellation. |
| Original installed-source assertion | Fails `standalone source graph cannot hide World bootstrap`; known two owner bridges below. |
| Original forager / nerve / Procession continuity | Fail at seed 451 melee comparison, generated-country old-rule negative control and seed 713 no admitted cart after 5000 steps respectively. |
| Unchanged smoke baseline comparison | Fails 3 original bands: Warrior wave time 20.97→15.26; Duelist output and dummy DPS 235.61→274.07. No baseline or tolerance changed. |
| Original loading-isolation browser course | Earlier synthetic isolation passes; actual entry stops at its legacy `massRuntime === true` premise. Its later real-phase 250 ms checks are not reached or claimed passed. |

The final actual Firefox source build (unscoped, worldmass enabled, readable
Vite output, served instrumentation only) records:

| Seed | Course | Visible interval | Frames / FPS | Max / p99 gap | Strict result |
| --- | --- | --- | --- | --- | --- |
| 230345636 | entry | 690 ms | 12 / 17.39 | 515 / 515 ms | Fail |
| 230345636 | continue | 942 ms | 27 / 28.66 | 559 / 559 ms | Fail |
| 713 | entry | 705 ms | 12 / 17.02 | 512 / 512 ms | Fail |
| 713 | continue | 1016 ms | 33 / 32.48 | 567 / 567 ms | Fail |

All four Firefox courses pass born physical authority, retained readiness,
identity/geography and genuine saved-envelope preservation, with no fixture
errors, fatal errors or ordinary World-driver calls. The injected 650 ms stall
produces an observed 661 ms gap and is correctly rejected. Original first-entry
control gaps were about 1.7–1.8 seconds; this establishes a measured improvement,
not responsiveness acceptance. Measurement browsers are closed.

The final source/config manifest contains 3,190 exact inputs and has SHA-256
`fe77bf941a30cb17a0c75cbe51bd95059bf7aaa3940f3535672702fa07a8ee28`.
Runtime inputs remain unchanged across the test-only source composition. The
final four-course report SHA-256 is
`c76e2a6173b52c21d80c1157ef7481bb406265359eb7fb657c8d714b28819f54`;
the negative-control report is
`d7d775ba6ee2b7ad70d8062b01dc8f33877aa90cc2ff25d9cb25f995927c1f68`.
Independent reviews are separate Codex critics, not a cross-model review.


The retained Firefox harness is now `balance/loading-native-firefox.cjs`.
It needs an unscoped worldmass Vite build made with `--minify false`, selected
by `HOLLOW_WAKE_QA_DIST`; `HOLLOW_WAKE_QA_REPORT` selects a fresh output directory.
It freezes and reports raw/served bundle hashes, instruments only served copies,
creates a genuine Immortal through the menu, saves through real issuance, restarts
the browser process and consumes the unchanged saved envelope through roster
Continue. It requires born physical authority, actual presence/census/binding,
retained readiness, exact identity/geography and no ordinary World drivers.
The interval covers opening through cover-close, including synchronous
construction, installation, publication and first render. There is no fake
minimum delay to create a long-enough sample.

Firefox responsiveness remains **unaccepted**: the measured bounded improvement
does not satisfy all original limits (at least 20 FPS, maximum gap below 500 ms,
p99 below 100 ms, steering in every complete two-second interval). Passing
average FPS alone is insufficient. Future work needs a cooperative-startup
design around real retained owners; adding awaits through borrowed receipts
or invoking the unused mass pipeline would not establish that contract.

Original `nativeinstalledsources` debt includes the two retained owner bridges
`nativeCrusadeFixtureMemory` → `nativeCrusadeTerrain` and
`nativeVendettaIdentity` → `nativeAreaSceneVendettaLifetime`, ultimately reaching
`World`. The strict forager, nerve, Procession continuity and smoke-baseline
failures are recorded without relaxing their oracles. Private quest/party
instances, generated entrance/terrain completeness, full playable-content
acceptance, Shards integration, scheduler correction and server capacity remain
open. No deployment capacity or 60 Hz claim follows from this consolidation.

## Local evidence and preview

Evidence is preserved under
`.claude/seamless-consolidation-20261014.local.work/`: original merge inventory,
dispositions, raw backups, complete-history bundle, source manifest, exact
command logs, independent memo/cleanup reviews and Firefox controls/candidates.
Earlier phase224/229/234/237 evidence and old preview builds remain untouched.
The published preview is served at `http://127.0.0.1:5178/` with unchanged scope
`preview:seamless-parity-20261014`. Its `/__preview.json` identifies the exact
published commit and source/build metadata. Old chunk roots remain available
so already-open tabs can finish lazy imports; this task does not reload a
user tab or reset saved characters.

Merge `5909ddf60a25bef4fdd202fbeb1f9f5e27f1f99c` was published by an ordinary fast-forward push to
`origin/codex/seamless-world-foundation` on 2026-10-14 after refreshing origin.
Its exact parents are the two foundation tips above. The canonical remote was
verified before retiring the three exact backup refs, and their absence was
verified afterward. Local backup refs were deleted with ordinary `branch -d`;
the three remote deletions were atomic. Main, shard-world and perf-lane refs
were unchanged.

The reconciliation checkout remains at detached `d94f36c7`. All 3,540 tracked
raw files and 7,140 recorded ignored evidence files were verified unchanged
through that same-commit detach. The original Fracture worktree archive remains
available. No user save or foreign working file was included in cleanup.

Exact local receipts are `MERGE-COMMIT.json`, `PUBLICATIONS.jsonl` and
`RETIREMENT.json` in the evidence directory above. The final narrow critic's
`final-review/final/METADATA.json` has SHA-256
`dd781e4b0d9583494c2857ca09a23079af1de124dd85d5cb06548c6615b2efdb`;
it confirms all 144 dispositions, 10 adaptations and 46 verification-log
hashes. This publication/retirement receipt is a documentation-only follow-up
to the tested merge. The source manifest and runtime inputs remain unchanged.

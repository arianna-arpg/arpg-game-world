# Foundation convergence repair — 2026-10-14

This pass continues the user's request to work in tandem with Claude, starting
from foundation `650214202a1c03be72d1662ebb550444c52f541b`. The main checkout's
uncommitted work and `.claude/native-play-survey.ts` are untouched. Fix forward
preserves the loading work already landed in `295ccdd1`; no revert, shard merge,
wire change, branch retirement or push is part of this repair.

The [retained-area contract](retained-area-host-contract.md) and
[cutover checklist](../design/seamless-world-foundation.md#convergence-cutover-checklist-and-owners-2026-10-14)
provide the next shared implementation boundary. The shard owns its W2/W3 and
host adaptations; the foundation owns native runtime changes. The contract
explicitly distinguishes the existing one-writer retained host from a hypothetical
full World per area, and the current save codec from an unbuilt exact transfer codec.

## Five regressions

| Original probe | Cause and repair |
| --- | --- |
| `nativeclientcontinue` | The loading follow-up removed the final `Restoring retained area ownership` callback. Restore it after actual installation, with a fresh cancellation/authority check, so cancellation at that boundary rejects and retires the candidate. |
| `nativeclientcontinueboundaries` | The same missing callback prevented the selected loading failure from firing. The original error now escapes through the existing discard/retirement path. |
| `nativeodysseygroundadmission` | `Reading the recorded world` ran before recorded-world admission. Validate the save before any loading callback or staged writer, then yield between admitted native operations. |
| `nativecampaigncompositionsource` | The earlier loading source view omitted `loadingScreen.ts`. Add an exact finite predecessor mapping; keep the original consolidation archive and assertions. |
| `nativejourneycompositionsource` | The reported first digest actually belongs to `src/ui/errorOverlay.ts`, not `runtime.ts`. Inspection of every raw-parent row also found omitted `dormancy.ts` and `nativePaging.ts` mappings. Include all three and the changed runtime diagnostic source in the finite mapping. |

`nativeConvergenceRepairArchive` records complete before/after hashes, unique
reversible hunks and the exact predecessor line endings. Its source view is used
only by the historical test readers; production imports are unchanged. Both
changed readers retain every non-import statement and assertion. Existing
archives and the probe roster are byte-identical. The loading fixture's recorded
raw digest uses LF through line 40 and CRLF afterward; the repair preserves that
exact existing digest rather than replacing it with the Git-normalized hash.

The independent `check_nativeconvergencerepairsource` validates the actual repaired
files, whole committed predecessor text, raw hashes, mutation/duplicate refusal,
UTF-8 and raw path/fd forms, consumed descriptors, unchanged reader statements,
all original archives and the roster. Original source proofs still run separately.
This adapter proves historical source composition; actual runtime probes prove
cancellation, cleanup and admission behavior.

## Planned merge dispositions

Read-only dry merge, no index or branch changes:

- Foundation: `650214202a1c03be72d1662ebb550444c52f541b`.
- Shard: `89721fac4a0f41d078f2938d45df20956a678658`.
- Divergence: 106 foundation-only and 38 shard-only commits.
- Dry merge tree: `143b36cbe27384f30875d179062b64cc5b98b867`.
- **19 conflict paths**, replacing the handoff's earlier count of 18. Recompute
  after the repair lands and whenever either parent moves.

These are reviewable dispositions for the future joint merge, not completed
resolutions. The [machine-readable ledger](foundation-shard-merge-20261014.json)
records exact base/parent blobs and the automatically changed path census.

| Conflict path | Owner | Disposition |
| --- | --- | --- |
| `CLAUDE.md` | Joint | Compose both lane guides under the convergence contract; retain runtime/source/ownership requirements and mark superseded architecture accurately. |
| `balance/nativeCaravanArrivalReceiptFixture.ts` | Foundation | Keep the foundation's fifth `companionReturnTo` slot and exact active/alias refusal. The shard's four-slot comment applies only to its earlier Actor. |
| `balance/probe_loadingpreparation.ts` | Foundation; shard review | Preserve its deletion from the foundation's active roster until the complete prepared-opening implementation and its live-exploration exclusion are deliberately admitted. Keep incoming historical evidence; do not enroll a probe for a deferred runtime. |
| `balance/probe_nativehistoricalactorreceipt.ts` | Foundation | Keep identical original negatives plus foundation's `writeCombatProof` receipt output. |
| `balance/probe_nativehistoricalreceipts.ts` | Foundation | Keep the exact foundation source reader; add shard's inline alias/actor mutation controls as separate current-source coverage without reducing the predecessor assertions. |
| `balance/probe_nativeinstalledsources.ts` | Foundation | Keep the retained continuity projection and standalone-bootstrap prohibition; repair its existing red before integrating. Do not restore the raw old-World reader. |
| `balance/probe_nativescenehistory.ts` | Foundation | Keep complete campaign/history/main-cast predecessor chain and both Actor-slot audits. Preserve the original golden. |
| `balance/probe_nativescenetitans.ts` | Foundation | Keep attendance and runtime-birth lifetime projections; retain raw three-lane equality and all Titan negatives. |
| `balance/probe_skillflights.ts` | Foundation with shard wire owner | Keep foundation's canonical compact rows and segment nonalias assertion; carry over shard's bounded/interpolated, release-armed, non-seat caster and legacy negatives. Its protocol-6 historical assertion needs its exact parent course; current checks target protocol 7 without downgrading the wire. |
| `balance/probe_worldmass_bountycharacters.ts` | Foundation | Keep authoritative F3 solo digest and acting-character coverage; retain any additional shard cases independently, with fixed seeds and unchanged outcomes. |
| `balance/probe_worldmass_processioncontinuity.ts` | Foundation | Preserve seed-713 must-admit route and existing named red; add natural refusal controls alongside it, never substitute discovery for the pinned positive course. |
| `balance/proberoster.ts` | Joint, per owned row | Union genuinely implemented incoming probes, keep original args/tiers/negatives and foundation's existing statuses. No mass exclusion of the older reds. Any historical roster source proof gets an exact-parent adapter, not repinned evidence. |
| `src/engine/ai.ts` | Performance with foundation | Keep `minionPreyInReach` before the incoming distance rejection. Admit the optimization only with segmented-body, concealment, long-range and solo-equivalence checks. |
| `src/engine/world.ts` | Joint | Keep extracted native quest interaction owners. Port W12's per-seat vocation asks and offline quest-ground behavior through those owners and native resident dialogue resolution; do not restore duplicate inline gameplay bodies. |
| `src/net/snapshot.ts` | Shard with foundation | One compact interpolated field representation; merge `vi`/`ar`, exact defined/absent legacy fallback and nonalias rules. Preserve existing wire 7; any new incompatible wire shape requires announced protocol 8. |
| `src/worldmass/bounties.ts` | Foundation | Keep F3 seed identity and native selected-read order. Hoisting `questHandLevel` requires equivalence under selected getters/callbacks, not just equal ordinary values. |
| `src/worldmass/generator.ts` | Foundation; performance supplies evidence | Compose cache work only against genuine source issuance. Prepared-opening constructor/cache adoption is an inseparable set with runtime and preparation modules; retain its current deferral unless the full original positive/negative courses pass. |
| `src/worldmass/random.ts` | Foundation with performance | Keep canonical byte order, serializer replacement/receiver behavior, live descriptor checks and bounded long-string reuse; independently validate any incoming `canonicalVisit` or hash optimization against both parents. |
| `src/worldmass/runtime.ts` | Foundation | Keep F1 budget/reservation behavior and current diagnostics. Compose cost counters/cache invalidation only with null-budget and reservation equivalence. Prepared-opening changes follow the generator disposition; no warming during live exploration. |

Automatic text merging is not acceptance. Review the incoming changes in
`server/vessel.ts`, `src/main.ts`, `src/engine/shardUnits.ts`,
`src/net/journalWire.ts`, terrain/preparation modules and scene probes, plus
all other paths in the ledger. Preserve the native host alongside the shard
mechanisms, then run both hosts' real courses and the whole gate. Announce the
joint merge in the mailbox before any push; do not retire refs before ancestry
and recovery evidence stand.

## Older-red dispositions

**Disposition: fix every row below; keep it gating. No new named exclusion is
proposed.** This makes the choice explicit without changing the historical
roster or asking the user to accept degraded coverage. The performance lane's
full-history report establishes the pre-existing red set; this pass's full gate
will add exact current outcomes. A row marked fix is queued work, not a claim
that the underlying fault has already been repaired.

| Probe | Owner | Fix acceptance |
| --- | --- | --- |
| `firinglane` | Foundation | Diagnose invalid regional landform recipe at `landforms.ts:84`; restore legal native generation and the firing course. |
| `nativeamalgamationstagesource` | Foundation | Restore exact stage/source correspondence with original negative controls. |
| `nativefracturecompositionsource` | Foundation | Repair combined Fracture predecessor/source composition, preserving all original assertions. |
| `nativehuntmigrationsource` | Foundation | Restore the exact migration source chain and once-only departure/return effects. |
| `nativeinhabitants` | Foundation | Diagnose retained inhabitant native parity and pass its original census/behavior course. |
| `nativeinstalledsources` | Foundation | Remove unintended World-bootstrap reachability from the standalone native source graph; do not suppress its prohibition. |
| `nativelayoutgeneration` | Foundation | Restore native layout generation invariants and original fixture correspondence; run genqa for a generation change. |
| `nativemainrostercancellationsource` | Foundation | Repair exact selected-roster cancellation source composition without weakening the original cancellation tests. |
| `nativenemesispolicy` | Foundation | Restore original retained Nemesis policy behavior and native departure/arrival attribution. |
| `nativerealmreentry` | Foundation | Fix the resolved structure with no whole admissible seat; preserve collision and whole-seat admission. |
| `nativerepeateventsource` | Foundation | Restore exact repeat-event source chain and preserved event identity/partial-effect rules. |
| `nativeresidentsession` | Foundation | Diagnose actual resident-session equivalence; include W12 dialogue resolver compatibility in the later merge. |
| `nativeruntimebirthtitanlifetime` | Foundation | Restore actual Titan runtime-birth/lifetime behavior under the original assertions. |
| `nativesceneruntimebirth` | Foundation | Diagnose native scene birth correspondence; preserve actual owner, callback and partial-birth tests. |
| `nativescenetheater` | Foundation | Restore scene theater parity under the original native course. |
| `nativeshardfoundationsource` | Foundation with shard | Restore exact shared foundation/source seams, retaining F1/F3 and prior source archives. |
| `nativestatusrelay` | Foundation | Restore native status relay attribution and lifetime behavior under the original course. |
| `worldmass_courtcontinuity` | Foundation | Enroll the actual native court rather than bypassing the current ownership assertion. |
| `worldmass_terrainvariation` | Foundation | Explain actual `f24109327cf6e53f` versus pinned `4225203d67bebfb4` against exact parent generation; repair the cause, do not simply repin. |

The other three rows of the earlier 22-failure CI list are separately tracked:
`nativearrivalcompositionsource` and `nativecaravancompositionsource` pass locally
with full history according to the performance lane (covered by the existing
fetch-depth repair); `worldmass_nativeareacompiler` also passed its local rerun.
They remain in the full gate. `nativesavewriteorder` was reported fail-then-pass
under load; record that evidence and diagnose repeatable faults without loosening
its ordering assertion.

## Firefox and next work

[The nine Firefox leads](firefox-crash-leads-20261014.md) were read before any new
crash work. Inspection confirms `MassPainter` has plain cache delete/clear paths
and no explicit canvas-pixel release. That is a concrete lifetime suspect, not a
reproduced Firefox crash diagnosis. Keep a separate painter change with disposal
of completed and cancelled partial bakes, scratch canvases and run-owned layers;
verify unchanged completed artwork, bounded low-zoom behavior, long roaming and
measured Firefox memory before calling the crash fixed. The current repair does
not change the painter or claim Firefox/60 Hz acceptance.

## Verification record

Results are appended after the running checks complete. Evidence is retained in
`.claude/convergence-repair.local.work/` in the foundation checkout. The complete
probe gate, not only the five selected courses, is required before a push.

Completed focused verification for this repair:

- `npm run check`: all four type lanes passed. The final balance/source type
  check is repeated after sealing the portable repair archive.
- All five original regression probes passed without assertion edits.
- `check_nativecontinueloading` passed: actual Continue, account and storage-lease
  replacement at every discovered loading pause, expired receipts, final
  publication refusal, fresh Begin and Mu adoption/cancellation.
- `check_nativeconvergencerepairsource`, `check_nativeloadingresponsivenesssource`
  and `check_seamlessconsolidationsource` passed. The additive proof covers eight
  source rows, 90 mutation controls, 192 path/fd reads, 48 unchanged reader
  assertions and 155 unchanged original archives. Current-source comparisons
  normalize Git line endings; historical output retains its exact raw bytes.
- Production build and a separate unscoped native browser build passed.
- The actual launcher smoke functions passed for game and launcher through an
  isolated entry wrapper that redirects only the save path. Disposable profiles
  were used; the wrapper reports Electron's version rather than package version.
  These are boot checks, not packaged release acceptance.
- The real `native-main-roster-race-ui.cjs` browser course passed, using the final
  native build and disposable HTTP saves: delayed roster cancellation, a newer
  cover, subsequent real Continue with preserved vessel/seed, stale cancel
  closures, and post-publication retirement. No fatal error or legacy World
  driver was reported. Evidence: `roster-race-verified/REPORT.json` and its log.

The full default `npm run probe` selected 882 probes and is still running at
this local repair checkpoint. It has reproduced the older `firinglane` failure.
No full-green result, merge readiness, Firefox crash fix, or sustained frame-rate
acceptance is claimed. The completion status will be written to
`.claude/convergence-repair.local.work/probe-full.exit`; the full output is
`probe-full.log`. These remaining results are required before any push.

Local repair commit: `430c1738` (`Restore retained Continue cancellation and
historical source boundaries`). The staged ownership gate passed with only the
seven authored repair files. The original five probes, historical archives,
roster and unrelated native survey are not changed by that commit. No push.

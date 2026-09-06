# Modifier-engine audit — 2026-09-06

First bounded pass toward more reliable, extensible system interactions.
Started from `5f200fa` in `codex/system-audit`, in a separate worktree while
other sessions continued editing the main checkout.

## Findings and changes

### Effect-list cache omitted its caller's registry

`StatSheet.armedFamily(prefix, ids)` cached solely by prefix. Querying
`['first']`, then `['later', 'first']`, still returned `['first']` even when
`proc_later` resolved positive. Narrower or reordered lists also inherited
the first caller's result. The world's proc index already replaces its list
when `PROC_LIST` grows, so the sheet must recognize that replacement.

The cache now checks registry identity and length. Stable callers retain the
same memoized array; replacement lists use their own membership and order.
Length changes also catch in-place growth/shrinkage. Callers must treat the
readonly input as immutable and replace it for same-length edits. This keeps
the hot cache check constant-time. Eight regression cases cover replacement,
order, narrowing, growth/shrinkage, memo reuse, and skill-local additions.

This does not introduce a general hot-reload protocol for arbitrary in-place
edits to stat definitions or trade rows.

### Uncached stat reads scanned unrelated modifiers

Skill-local modifiers make a query ineligible for the value cache. Previously
every such query traversed all actor-source modifiers. The engine now lazily
groups source modifiers by stat, in their original source and array order.
Only source replacement/removal rebuilds the index; condition, gauge and base
changes still invalidate resolved values while retaining the index.

Tags, conditions, gauges, links, trades and skill-local extras still pass
through the same calculation. Source replacement preserves its position;
removing and re-adding a source moves it last, preserving override precedence.
As with the existing value cache, source edits must be published with
`setSource`. The index costs one array entry per modifier plus per-stat buckets.

The regression compares indexed sources against the existing linear
skill-local path over 1,536 cases. A work-count guard proves that 100 warm
queries with changing conditions/gauges inspect zero unrelated modifiers,
versus 100,000 before the change in a 1,000-modifier fixture.

Seven alternating trials of 50,000 warm, tagged, skill-local queries gave:

| Unrelated modifiers | Before median | After median | Query speedup |
| --- | ---: | ---: | ---: |
| 100 | 60.3 ms | 43.7 ms | 1.38× |
| 1,000 | 240.6 ms | 43.1 ms | 5.58× |

These are synthetic stat-query measurements, not whole-game frame-rate gains.

## Verification

- Before engine edits: `npm run check` and all 173 fast green probes passed.
- New regressions before the fix: five registry cases failed; the work-count
  guard failed with 100,000 unrelated reads. The calculation comparisons passed.
- After the fix: all 39 apply-arm assertions and all 16 conversion assertions
  passed, including the new cases.
- The complete fast gate passed again: 173/173 probes. The four slow green
  probes and four excluded probes were not run in this pass.
- Post-change `npm run check` passed. The simulation smoke suite completed
  five scenarios across five seeds (25 episodes), reporting a provisional
  high time-to-kill band for `ttk_parity_magician_l5` (15.55). This pass did
  not establish whether that advisory predates the change.
- `npm run perf -- --filter=mire --seconds=8 --allow-dirty` built the isolated
  patch and passed its budgets. Mire: median 20.8 ms, p99 27.9 ms, maximum
  29.3 ms, zero frames over 40 ms. Start/end town medians both 8.3 ms.
  Report: `balance/reports/perf_20260906200003` (local, ignored). This was a
  targeted post-change smoke sample, not a full biome sweep or before/after
  gameplay comparison.

## Continuing the audit

Prefer one reproducible failure or measured bottleneck per focused commit.
Prove behavior through the real shared engine, including the absence of a
feature, and keep the same fixtures/seeds for before/after comparisons.

1. **Restore confidence in excluded probes.** The roster currently excludes
   `probe_defenses` for stale roster expectations and `probe_supportmatrix`,
   `probe_wakeflame`, and `probe_wisplight` for intermittent failures. Those
   explanations are recorded debt, not diagnoses confirmed by this pass.
   Reproduce them with controlled clocks/randomness before changing assertions.
2. **Check interaction boundaries.** Prioritize keeper attribution through
   minions and triggered effects, tag/condition/gauge propagation, and removal
   of an enabling modifier. Assert who owns the result and when it ceases.
3. **Check world continuity.** Exercise save/load, zone exit/re-entry, co-op
   reconstruction, and temporary-effect expiry with the same authored scenario.
   Keep one authoritative state/resolver for simulation and presentation.
4. **Measure representative load.** Use the desktop performance harness's
   seeded zones and town control to separate simulation cost, rendering cost,
   entry bursts and cache invalidation. Optimize measured consumers while
   retaining data-defined capabilities; do not infer frame gains from this
   query benchmark.
5. **Review content reachability warnings.** The smoke boot reported skill
   and support pool orphans/limbo, alongside a walkable span-void region and
   a creature with multiple signature defense pools. Check intended access
   paths and authoring policy before labeling those warnings gameplay bugs.

For concurrent work, keep an isolated branch, declare ownership, run the
ownership gate on the staged patch, and merge/cherry-pick only after comparing
with the then-current main branch. A broad rewrite is unnecessary to begin
improving the shared systems.

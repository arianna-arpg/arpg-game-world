# Context and runtime cleanup — 2026-10-19

This is a bounded audit and incremental cleanup of `arianna-arpg/arpg-game-world`,
based on seamless `ac9dedab`. [CLAUDE.md](../../CLAUDE.md) remains the current
working entrypoint. The [integration policy](branch-integration.md) and
[gameplay register](gameplay-alignment-20261019.md) own branch policy and user
decisions. This audit does not claim complete content parity.

## Implemented

- Play World and Host World share `scripts/world-checkout.cjs`. It accepts the
  canonical branch itself or its established nested checkout, requires a real
  Git checkout, and refuses missing, detached or wrong-branch candidates. Both
  validate `server/shardHost.ts`, which is the continuous host actually started.
  The former Host check for `nativeShardHost.ts` was misleading. Profiles,
  separate save folders, build behavior and host shutdown/persistence remain
  unchanged. `smoke:host` checks the current checkout with no persistence or
  browser launch, so topic-branch verification cannot redirect to another build.
  Launcher tests cover selection and refusal using temporary repos.
- The committed `.claude/launch.json` keeps development and built preview.
  Removed 93 accumulated alternate/QA/worktree entries, including machine-specific
  historical sibling paths. No process, checkout or save was removed. Temporary
  parallel development servers can select an explicit free port with `npm run
  dev -- --port <port> --strictPort`; do not add one permanent entry per session.
- Default and named probe runs check the selected files for absence or duplicate
  registration. The complete census and historical source receipts remain on
  explicit historical sweeps. No assertions, archived fixtures, roster statuses,
  default course membership, retries or historical successor mappings changed.
  This completes the intended separation of current gameplay acceptance from
  archive upkeep; the previous default still failed on unrelated archive drift.
- `review:context` recommends the full type check, includes staged-only edits,
  and suggests the existing launcher and continuous playthrough checks for the
  changed entry scripts.
- Recovery, consolidation and old instruction documents now identify their
  historical scope and link to the current guide. The early recovery's direct
  class-picker entry is explicitly superseded by tutorial → Mu → vessel entry.
- The local project memory index now leads with current branch/entry/verification
  policy. Its exact previous bytes are preserved as
  `MEMORY-before-cleanup-20261019.md` in this project's memory directory; all
  topic notes and the older archive index remain unchanged. This is local memory,
  not a repository artifact or a change to other projects/user preferences.

## Audit findings and deferred work

| Area | Evidence and disposition |
| --- | --- |
| World/native gameplay duplication | `World` already delegates geometry and other behavior to `nativeScene*` functions; e.g. `nativeSceneGeometry.ts` serves World and the retained area adapter. Do not replace those delegates with another implementation. Audit a specific rule before extracting more. |
| Client/host retained lifecycle | `nativeClientRuntime.ts` and `nativeShardRuntime.ts` both acquire campaign sessions, actor authority, memory and transition owners. Their player/keeper, loading and restore contracts differ. A shared lifetime helper needs a separate review covering partial acquisition, cancellation, restore and retirement before migration. |
| Apparently unused runtime modules | An import scan of 1,460 source/server TypeScript files found no ordinary inbound imports for `nativeAreaCompiler.ts`, `nativeAreaRoutes.ts`, `worldContexts.ts`, `caveStratum.ts` and `rebase.ts`. These are migration/proof candidates, not proven disposable code. Retain them until their probe/design consumers and unfinished work are adjudicated. |
| Worker false positives | `server/massCompiler.ts` is launched by URL through `massWorkers.ts`. Browser worker modules also use worker entry URLs. Lack of an import is not sufficient deletion evidence. |
| Probe archive | Tracked `balance/` has 1,795 files at the audit base; the 178 filenames matching `archive` or `fixturesource` occupy 81,408,369 bytes in this checkout. This is a filename subset, not a complete fixture census. Preserve the archive for now; retire individual source assertions with their corresponding migrations instead of adding new predecessor snapshots. |
| Root instructions | Root main's large `CLAUDE.md` includes unfinished generation context and old probe counts/checklists. It was not overwritten. Reconcile that guide on main after its owner lands the generation changes, preserving system contracts under `docs/`; do not copy the seamless-only command map wholesale onto main. |
| Historical worktrees | Preserve topic work, detached checkouts, recovery patches and saves. Old paths no longer appear in the committed launch catalog, but worktree removal needs a separate status/recovery inventory. |

## Integration boundaries

Prepared on `codex/context-runtime-cleanup` in
`.claude/ownership.context-runtime-cleanup`, then integrated by real merge into
the canonical playable branch alongside the approved gameplay alignment.
The original checkout's unfinished work remains preserved. Dialogue redesign
continues separately; current gameplay choices live in
[the decision record](gameplay-decisions-20261019.md).

The verified real-merge `.github/workflows/sync-main.yml` is unchanged. Review
and integration keep this cleanup on seamless; do not migrate the retained runtime or introduce
another player entrypoint as part of landing it. Main needs its own appropriately
scoped context cleanup after the dirty work is safe to integrate.

## Verification

Passed on the isolated cleanup checkout:

- `npm run check`: all four type-check projects.
- `npm run test:launcher`: 35 checks, including direct/nested/linked checkout
  selection and missing, copied, wrong-branch, detached and incomplete refusals.
- `npm run probe -- --jobs 2`: all eight current courses, zero retries.
- Census fault checks: a missing historical file or extra unregistered file
  leaves the default list usable and fails the historical census; a missing
  selected file fails both. Named selection still works. Each temporary fixture
  was restored or removed before the current courses ran.
- `npm run probe:history -- --list`: complete census and historical source
  receipts pass. The historical gameplay suite was not executed.
- `npm run build`: passed with the existing large-bundle warning.
- `npm run smoke:host`: the cleanup topic checkout starts the continuous host,
  serves its built client and reports zero faults, without saving.
- `npm run smoke:world`: real tutorial → Mu → vessel → continuous travel across
  three pages → generated-opponent combat, completed-account New Run into Mu,
  and saved-life Continue. No zone loads during travel; hero identity retained.
- `npm run smoke:launcher` with a separate desktop profile: passed. The desktop
  checks initially could not spawn Electron's GPU/renderer in the restricted
  process sandbox; both passed when run with the required process permissions.
- Script syntax, launch JSON and whitespace checks passed. No runtime source,
  save schema or main-sync workflow changed.

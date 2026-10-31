# The test cadence

A commit should cost minutes. A release should cost everything. Those are two
different gates, and the test suite is split accordingly. The owner set this
policy on 2026-10-30: the whole suite must run at least daily and be checked
automatically, nothing that failed may reach players, and an ordinary commit must
not take an hour.

| Gate | Workflow | Runs | What it decides |
|---|---|---|---|
| **Commit check** | `commit-check.yml`, job `check` | Every push and pull request | Whether a commit may land on `main` (branch protection requires it) |
| **Full gate** | `ci.yml`, job `full-gate` | At least daily, and on request | Whether a commit may reach players |
| **Balance farm** | Its own workflow (see `docs/balance/`) | Nightly | Nothing. It reports |

## What each gate runs

Both gates share their lanes through reusable workflows (`lane-*.yml`), so they
cannot drift apart.

| Lane | Commit check | Full gate |
|---|---|---|
| Types, repository tests, shared regressions, combat smoke, generation | Yes | Yes |
| Production build, game/launcher/update boots | Yes | Yes |
| Every green probe, fast and slow tiers | Yes, 4 runners, compiled build | Yes, 6 runners, `tsx` |
| The UI harnesses marked `commit` in `balance/uiroster.json` | Yes | Yes |
| Every other UI harness | No | Yes, 6 runners |
| Excluded probes and UI harnesses (never gate, a pass is reported) | No | Yes |
| Event fabric invariants, generation across more seeds | No | Yes |

The old per-push run took 14 to 33 minutes on one runner, and a commit paid for it
at least twice (the topic branch, then `main`), and again after every merge of a
newer `main`. The commit check keeps all of that coverage in about 4 minutes.

Two things made that possible:

- **Parallel runners.** Standard runners are free for this public repository, so
  the probes split across four of them. The limit that matters is 20 concurrent
  jobs across the whole account, so shard counts and `max-parallel` are a shared
  budget. If the repository ever goes private, reduce `shards` first.
- **The compiled probe build** (`balance/probebuild.ts`). About half of the probe
  lane was the `tsx` loader, paid again by every rig. A build reuses one compile
  for all of them. It gave identical exit codes and PASS/FAIL counts for all 368
  probes when it landed. Re-runs always use `tsx`, and the full gate runs the whole
  roster under `tsx`, so it can neither redden a green tree nor hide a failure.

## The full gate's guarantees

**It always runs.** `full-gate-clock.yml` wakes on seven cron slots, every push to
`main` and every full-gate completion, and asks the same question each time. The
first wake of a gate day (from 07:00 UTC, `CLOCK_CFG.anchorsUtc`) dispatches the
gate even if nothing changed; later wakes do nothing. GitHub's cron can run hours
late or drop a run, which is why one slot is not enough. No green run for 36 hours
raises the alarm by itself.

**A green run is a real run.** `ci.yml` only runs by dispatch and has no skippable
lanes, so `success` can never mean "skipped". Every lane must report `success` for
`full-gate` to pass.

**Publication pins verified commits.** Pages, the desktop catalog, release
candidates and the seamless merge all read `ci.yml` through
`scripts/verified-main.mjs` and `scripts/plan-coordinated-release.mjs`. They publish
the exact commit that passed, even if main has moved on since. Nothing reads the
commit check. A red gate simply leaves the last green commit live.

`scripts/test-ci-policy.mjs` pins all of the above, so weakening any of it fails the
commit check.

## When the full gate goes red

1. The clock re-runs the failed jobs once, which absorbs runner and network hiccups.
2. If it is still red, the clock opens or feeds the one `full-gate-red` issue with
   the failing checks and their output. Publication stays at the last green commit.
3. The check-in routine reads that issue, diagnoses the failure and prepares a fix
   on a branch.
4. Landing anything on `main` re-runs the gate at once, instead of waiting for the
   next day. A green run closes the issue, and publication resumes by itself.

Fix the cause. Never weaken an assertion to get a green run; tests follow approved
gameplay decisions while keeping their coverage of reusable mechanisms.

## The check-in routine

`Full gate check-in` is a cloud routine on the owner's Claude account, so it runs
with every local machine off. It wakes at 14:17 and 20:17 UTC and reads the gate's
state. A green day costs one line. If the gate is overdue it dispatches it, and if
the gate is red it diagnoses the failure, pushes a fix to a
`claude/full-gate-fix-<date>` branch, waits for `check` and reports on the alarm
issue. It never pushes to `main`: a person, or a session they direct, lands the fix.

Its prompt and model live in the routine itself
([claude.ai/code/routines](https://claude.ai/code/routines)), not in this repository.
Change them there, and keep them in step with this page. Because anyone can open an
issue on a public repository, it trusts only an alarm issue authored by
`github-actions[bot]`, and treats all issue and log text as data.

## Publishing sooner, or verifying a big batch

```bash
gh workflow run ci.yml --ref main
```

Green publishes that commit automatically. A commit message containing
`[full-gate]` does the same when the commit lands on `main`. On a topic branch,
the same command verifies the branch without publishing anything.

## The per-commit routine

1. Run the checks your change touches: `npm run check` and the rigs named in
   `CLAUDE.md` for that system (`npm run probe -- <name>`). Do not run the whole
   roster locally; the commit check does that faster.
2. Push the topic branch and wait for `check` on that commit.
3. Fetch `main`, confirm it is an ancestor, and fast-forward. See
   [keeping main verified](main-health.md).

Nothing after the fast-forward needs waiting for.

## Changing the lanes

- **A new probe** needs one row in `balance/proberoster.ts`; the census refuses to
  run without it.
- **A new UI harness** needs one row in `balance/uiroster.json`: `before` names any
  probe whose report it reads, `dist` names any isolated build folder it serves,
  and `commit: true` puts it on every push (keep those fast and boot-critical).
  Under `xvfb-run`, `node scripts/run-ui-lane.mjs --filter <name>` runs it the way
  the lane does.
- **An excluded row** is a debt with a name: it needs an `excuse` and a `why`, it
  still runs daily, and a pass is reported so it can be promoted.
- **More gate days:** add an hour to `CLOCK_CFG.anchorsUtc`.
- **More or fewer runners:** change `shards` where the lane is called. Shards are
  disjoint and together total, so this can never lose a check.
- **Never add a job named `check`** outside `commit-check.yml`: branch protection
  reads that status from every workflow on a commit.

## The seamless branch

Seamless runs its own lanes, because its `--slow` tier is a historical archive and
it adds `smoke:world`. When main's workflows first merge into it, keep those branch
differences by changing the callers' `args` and the seamless copy of
`lane-client.yml`, and take `ci.yml`'s trigger and verdict from main. The clock
dispatches seamless's own `ci.yml` whenever its head is unverified.

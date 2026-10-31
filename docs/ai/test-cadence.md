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
| **Balance farm** | Its own workflow (`docs/balance/`) | Nightly | Nothing. It reports |

## What each gate runs

Both gates share their lanes through reusable workflows (`lane-*.yml`), so they
cannot drift apart.

| Lane | Commit check | Full gate |
|---|---|---|
| Types, repository tests, shared regressions, combat smoke, generation | Yes | Yes |
| Production build, game/launcher/update boots, reliability/lighting/layer UI | Yes | Yes |
| Probes, `fast` tier | Yes, 4 runners, compiled | Yes, 6 runners, under `tsx` |
| Probes, `slow` tier | No | Yes |
| Excluded probes (never gate, a pass is reported) | No | Yes |
| Every UI harness in `balance/uiroster.json` | No | Yes, 6 runners |
| Event fabric invariants, generation across more seeds | No | Yes |

The split is not a guess about what matters. Across all 69 CI failures between
2026-10-01 and 2026-10-30, the slow-tier rigs were never the only thing to fail,
so moving them to the daily gate would not have let any of those failures land.

Two things made the commit check fast without dropping coverage:

- **Parallel runners.** The repository is public, so standard runners are free.
  Four runners do the probes in about a quarter of the wall clock. The limit that
  matters is 20 concurrent jobs across the whole account, which is why the farm and
  the full gate must stay within their own `max-parallel` or shard counts.
- **The compiled probe build** (`balance/probebuild.ts`). About half of the probe
  lane was the `tsx` loader, paid again by every rig. A single build reuses one
  compile for all of them. It produced identical exit codes and PASS/FAIL counts
  for all 368 probes when it landed. Re-runs and the daily gate still use `tsx`, so
  it cannot redden a green tree or quietly hide a failure.

## The full gate's guarantees

**It always runs.** `full-gate-clock.yml` wakes on six cron slots, every push to
`main` and every full-gate completion, and asks the same question each time. The
first wake of a gate day (from 07:00 UTC, `CLOCK_CFG.anchorsUtc`) dispatches the
gate even if nothing changed; later wakes do nothing. GitHub's cron can run many
hours late or drop a run, which is why one slot is not enough. If no green run
happens for 36 hours, that raises the alarm by itself.

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
3. The daily check-in routine reads that issue, diagnoses the failure and proposes
   a fix on a branch (see below).
4. Landing anything on `main` re-runs the gate at once, instead of waiting for the
   next day. A green run closes the issue, and publication resumes by itself.

Fix the cause. Never weaken an assertion to get a green run; tests follow approved
gameplay decisions while keeping their coverage of reusable mechanisms.

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
  run without it. Choose `slow` only for a rig that really is too heavy per push.
- **A new UI harness** needs one row in `balance/uiroster.json`, with `before` if it
  reads a catalog a probe writes. Under `xvfb-run`,
  `node scripts/run-ui-lane.mjs --filter <name>` runs it the way the lane does.
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
differences by changing the caller's `args` and the seamless copy of
`lane-client.yml`, and take `ci.yml`'s trigger and verdict from main. The clock
dispatches seamless's own `ci.yml` whenever its head is unverified.

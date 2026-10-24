# Keeping main verified

Verified changes may go directly to `main`; pull requests are optional, not the
default. The owner approved this policy on 2026-10-23. GitHub branch protection
still requires the `check` job, an up-to-date base and resolved conversations,
and applies to administrators too. Force pushes and branch deletion remain
disabled.

Run the relevant local checks, push the isolated commit to a topic branch for
CI, and wait for the required check on that exact commit. Fetch `main` again,
confirm it is an ancestor of the checked commit, then fast-forward `main` with a
normal push. If main advances incompatibly, incorporate it and verify the new
commit before publishing. Keep unrelated unfinished work out of the commit and
leave other working checkouts intact. Use the `arianna-arpg` GitHub account.

CI runs on every push and every pull request, including same-repository pull
requests. It checks all three TypeScript projects, repository/launcher tests,
the complete green probe roster including the nightly lane, combat simulation,
generation, the production build, and actual game/launcher/update smoke tests.
Keep the required job name stable. Do not skip it for documentation changes or
replace a failed check with a successful no-op.

Pages and main-to-seamless integration wait for successful push CI. They
resolve and pin the verified main commit; manual dispatch also checks that
commit's CI. A superseded completion cannot publish newer unchecked code.
Seamless integration still verifies its real merge before pushing it.

Scheduled launcher builds follow `scripts/browser-previews.json`, the active
delivery registry. Old experimental branches remain available for an explicit
manual build but are not automatically rebuilt each night. Their historical
failures are not evidence that the current main game failed.

If CI fails, fix the cause on a topic branch and publish to main only after the
required check passes on the final commit. Tests must follow approved gameplay
decisions while retaining
coverage of reusable mechanisms; never suppress an assertion just to get a
green run. The 2026-10 repair reconciles terrain debuff cues and Bonepicker
morale with the approved shared behavior, and retains a separate authored
outnumbering fixture.

GitHub outages, runner failures and future defects remain possible. These
controls prevent unverified changes from being accepted and keep publication
behind successful verification; they cannot guarantee that a service or test
will never fail.

# Keeping main verified

Verified changes may go directly to `main`; pull requests are optional, not the
default. The owner approved this policy on 2026-10-23. GitHub branch protection
still requires the `check` job, an up-to-date base and resolved conversations,
and applies to administrators too. Force pushes and branch deletion remain
disabled.

Run the relevant local checks, push the isolated commit to a topic branch, and
wait for the required check on that exact commit. Fetch `main` again, confirm it
is an ancestor of the checked commit, then fast-forward `main` with a normal
push. Nothing further needs waiting for. If main advances incompatibly,
incorporate it and verify the new commit before publishing. Keep unrelated
unfinished work out of the commit and leave other working checkouts intact. Use
the `arianna-arpg` GitHub account.

[The test cadence](test-cadence.md) defines what runs when. The commit check runs
on every push and every pull request and owns the required `check` job. Keep the
required job name stable. Do not skip it for documentation changes or replace a
failed check with a successful no-op.

The full gate (`ci.yml`) runs at least daily and owns publication. Pages, the
desktop catalog, nightly release candidates and main-to-seamless integration all
pin a commit with its own green full gate, even if main has moved on since, so an
unchecked commit cannot publish. Seamless integration still verifies its real
merge before pushing it.

Scheduled launcher builds follow `scripts/browser-previews.json`, the active
delivery registry. Old experimental branches remain available for an explicit
manual build but are not automatically rebuilt each night. Their historical
failures are not evidence that the current main game failed.

If a check fails, fix the cause on a topic branch and publish to main only after
the required check passes on the final commit. Tests must follow approved gameplay
decisions while retaining
coverage of reusable mechanisms; never suppress an assertion just to get a
green run. The 2026-10 repair reconciles terrain debuff cues and Bonepicker
morale with the approved shared behavior, and retains a separate authored
outnumbering fixture.

GitHub outages, runner failures and future defects remain possible. These
controls prevent unverified changes from being accepted and keep publication
behind successful verification; they cannot guarantee that a service or test
will never fail.

The coordinated publisher is described in [coordinated releases](../engine/coordinated-releases.md).
Browser and desktop game versions now share one Pages catalog and deployment.
Only active registry branches are released; independent desktop branch uploads
are retired. Main requires a green full gate on the exact commit; previews require
one on their source history. Installer application
releases bundle the already-published Main game and cannot independently advance
the game version.

# Main is the content baseline

`main` owns shared combat, skills, balance, progression and authored content until the seamless cutover is ready. `codex/seamless-world-foundation` integrates that content with continuous geography. New shard/MMORPG work is deferred under [the current offline focus](../../CURRENT.md); existing hosting remains retained code, not the controlling milestone. These are the two active delivery branches; other topic branches are sources to inspect, not alternative player entrypoints.

Incorporate main with real merges, preserving ancestry. Do not create another stream of cherry-picked copies. Before starting seamless work, fetch main and verify it is an ancestor of the integration branch. After committing shared gameplay to main, merge that main commit into the canonical seamless checkout and run checks appropriate to the integration. Uncommitted work in another checkout is not part of either branch's delivered content and must remain intact.

The `Incorporate main into seamless` workflow runs after a green [full gate](test-cadence.md) on main and can also be dispatched manually. It pins the verified main commit, merges it into the latest published seamless branch, runs the existing current gameplay checks and actual client playthrough, and pushes a normal merge only after they pass. Manual dispatch also requires successful CI on the current main commit. It never force-pushes, automatically chooses a side in a conflict, or runs the historical probe archive. A conflict, failed check, concurrent branch advance or branch-protection refusal fails visibly and publishes nothing. Resolve that condition and rerun the workflow.

Verified main changes use direct fast-forward pushes by default; pull requests are optional. The exact commit must pass required CI and include current main before publication, including for administrators. See [main health](main-health.md) for the checks, publication steps and the owner's 2026-10-23 approval. Stay on the `arianna-arpg` GitHub account.

The user explicitly authorized this ongoing remote-write automation on 2026-10-19; the workflow is published on main. Repository Actions permissions and branch rules must permit its normal push. Local unpushed commits cannot trigger a GitHub workflow.

## Changes that still need a choice

Main ancestry establishes that its changes were incorporated; it does not imply that every behavior is identical after later seamless edits. Keep the gameplay difference register on seamless current. Each intentional shared-gameplay deviation needs a named row explaining the main behavior, the seamless behavior and the user's keep/revert decision. Spatial adapters and multiplayer ownership changes belong in separate rows from balance or presentation changes.

The [current gameplay decisions](gameplay-decisions-20261019.md) are the review entrypoint. They record approved shared changes, seamless-only choices, reversions and unresolved items, including the corrected retained-zone direction. The earlier comparison and file inventory are historical evidence, not an approved backlog or a current difference report.

The cast-bar dimensions are decided: match main's 44 × 5 pixels. The one-time account tutorial and direct Mu handoff also match main. Do not treat other existing differences as approved merely because they are already committed. Changes intended for both games should start on main and flow through the integration merge; seamless-only geography remains on seamless.

## Working folders and recovery

The original root folder is the main checkout. `.claude/ownership.playable-foundation` is the canonical seamless checkout. `Play World.cmd` explicitly selects that integration checkout. Preserve root edits and saves when updating branches; stage only owned files or hunks.

On 2026-10-19 local main's copied history was reconciled with published main without changing published main's tree. The root's unfinished generation and bounty work was reapplied and remains uncommitted. A named recovery stash and `.claude/ownership.main-alignment-before.patch` retain the original edits. They are recovery material, not another gameplay branch.

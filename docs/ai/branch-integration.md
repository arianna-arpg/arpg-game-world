# Main is the content baseline

`main` owns shared combat, skills, balance, progression and authored content until the seamless cutover is ready. `codex/seamless-world-foundation` integrates that content with continuous geography and hosting. These are the two active delivery branches; other topic branches are sources to inspect, not alternative player entrypoints.

Incorporate main with real merges, preserving ancestry. Do not create another stream of cherry-picked copies. Before starting seamless work, fetch main and verify it is an ancestor of the integration branch. After committing shared gameplay to main, merge that main commit into the canonical seamless checkout and run checks appropriate to the integration. Uncommitted work in another checkout is not part of either branch's delivered content and must remain intact.

The `Incorporate main into seamless` workflow runs on every push to main and can also be dispatched manually. It merges the latest published main into the latest published seamless branch, runs the existing current gameplay checks and actual client playthrough, and pushes a normal merge only after they pass. It never force-pushes, automatically chooses a side in a conflict, or runs the historical probe archive. A conflict, failed check, concurrent branch advance or branch-protection refusal fails visibly and publishes nothing. Resolve that condition and rerun the workflow.

The user explicitly authorized this ongoing remote-write automation on 2026-10-19; the workflow is published on main. Repository Actions permissions and branch rules must permit its normal push. Local unpushed commits cannot trigger a GitHub workflow.

## Changes that still need a choice

Main ancestry establishes that its changes were incorporated; it does not imply that every behavior is identical after later seamless edits. Keep the gameplay difference register on seamless current. Each intentional shared-gameplay deviation needs a named row explaining the main behavior, the seamless behavior and the user's keep/revert decision. Spatial adapters and multiplayer ownership changes belong in separate rows from balance or presentation changes.

The published [main/seamless gameplay decision register](https://github.com/arianna-arpg/arpg-game-world/blob/codex/seamless-world-foundation/docs/ai/gameplay-alignment-20261019.md) is the review entrypoint from this main checkout. It includes linked source locations and the complete changed-file/function inventory. Its Review rows remain undecided; alignment has not silently accepted them into main.

The cast-bar dimensions are decided: match main's 44 × 5 pixels. The one-time account tutorial and direct Mu handoff also match main. Do not treat other existing differences as approved merely because they are already committed. Changes intended for both games should start on main and flow through the integration merge; seamless-only geography remains on seamless.

## Working folders and recovery

The original root folder is the main checkout. `.claude/ownership.playable-foundation` is the canonical seamless checkout. `Play World.cmd` explicitly selects that integration checkout. Preserve root edits and saves when updating branches; stage only owned files or hunks.

On 2026-10-19 local main's copied history was reconciled with published main without changing published main's tree. The root's unfinished generation and bounty work was reapplied and remains uncommitted. A named recovery stash and `.claude/ownership.main-alignment-before.patch` retain the original edits. They are recovery material, not another gameplay branch.

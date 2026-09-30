# Browser branch previews

The normal browser game stays at `/arpg-game-world/play/`. The seamless-world
experiment is built from `codex/seamless-world-foundation` and served at
`/arpg-game-world/dev/seamless-world/`. These are separate builds in the same
GitHub Pages artifact; no experimental gameplay is merged into main.

`scripts/browser-previews.json` declares each preview's branch, URL id, storage
namespace and default world mode. `scripts/build-browser-previews.mjs` fetches
the branch, pins its commit, installs its dependencies, checks all three type
targets and builds it beside the main game. All builds must succeed before
the complete site is uploaded. `site/build.json` and each preview's `build.json`
record exactly which commits were published. Generated files are ignored.

The Pages workflow runs on main updates, manual dispatch, and successful `ci`
runs on the configured experiment branch. Its checkout is explicitly main,
including when manually dispatched from another branch. The GitHub Pages
environment's main-only deployment rule stays in place. A preview update may
take several minutes because CI and both browser builds finish first.

For another preview, add its configuration and add its branch to the
`workflow_run.branches` list in `.github/workflows/pages.yml`. The branch must
implement `src/buildProfile.ts` and honor `HOLLOW_WAKE_STORAGE_SCOPE` across
all persistence, including roster and import/export keys. Scoped builds disable
the shared disk-save endpoints. Do not publish an unscoped experiment on this
origin: localStorage is shared across URL paths. `HOLLOW_WAKE_WORLDMASS=1`
selects seamless exploration on branches that implement that mode.

Run `node --test scripts/test-browser-previews.mjs` for destination and namespace
checks. On the experiment branch, `balance/browser-preview-ui.cjs` checks the
actual browser build (optional live URL argument) using a disposable profile:
start a new world, save, click Continue after reload, and verify production
storage remains byte-identical. It never uses a player's browser profile.

The build helper is intended for disposable CI runners; its temporary source
checkouts and dependencies live in the runner's temporary directory.

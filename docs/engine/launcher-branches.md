# Dynamic launcher branches

The launcher starts on `repo.branch` (`main` by default). Its **Game branch**
picker reads every page of the repository's live GitHub branch list. Refresh
runs at startup, on **Refresh**, on **Check for updates**, and before launching
an experimental branch. Deleting a branch removes it on the next refresh.
Merging a branch without deleting it leaves it selectable.

A failed or partial catalog request discards the catalog and selects local
Main. It never resurrects deleted branches from an old cached list. Main can
play without a network; source installs use the actual local Main checkout
(including an existing Main worktree), and packaged installs use their bundled
game. The launcher does not switch, reset, or merge the user's checkout to
select an experiment. If no Main checkout exists in a source install, it says
so rather than calling another branch Main.

## Builds and storage

An experiment runs its latest successfully published static game bundle in
the existing desktop game window. Players need neither Git nor Node. The
build line shows the downloaded commit. A new branch is listed immediately,
but needs a successful build before its first launch. While a newer branch
commit is building, the previous published build remains playable.

`launcher/branches.cjs` owns the catalog, bundle selection, verification, and
cache. Each repository/ref pair hashes to a separate directory under Electron
userData's `branch-builds/`. Each branch has:

- Immutable game directories keyed by full commit SHA and an atomic
  `current.json` pointer.
- Its own `saves/` directory, shared across updates of that branch.
- Its own persistent Electron session, including browser save mirrors.

Main retains its existing saves and browser storage. **Erase this branch's
saved data** clears only the selected branch, after the existing native
confirmation. Selecting/deleting a branch never deletes progress. Returning
to a recreated branch of the same name reuses that branch's existing profile.

Downloads require GitHub's SHA-256 digest, a complete asset, and a bounded
bundle size. The gzip JSON container carries the exact branch/commit identity
and base64 static files. Extraction rejects traversal, Windows device names,
duplicate case aliases, links, and excessive expansion. Files stage in a
fresh directory; the active pointer changes only after extraction succeeds.
Failed updates retain the previous cached build. If a catalog or download
request fails, Play returns to local Main with a visible explanation. If a
branch has not published any build yet, the launcher asks the player to choose
Main or wait for that branch's build.

No experimental launcher code is loaded. Experiments use the installed
launcher/server and must honor the existing static-game and save endpoint
contract. Changes that require a new native launcher still need an ordinary
application release. Main's Nightly/Stable updater remains independent.

## Publishing

`.github/workflows/launcher-branches.yml` runs from the workflow revision on
Main after a successful same-repository push CI run. A daily sweep catches
existing branches, and a manual dispatch can request one named branch or all
current experimental branches. Builds already published at the branch's
current commit are skipped.

Each build uses a detached checkout of the selected commit, installs its own
dependencies, runs `npm run check` and `npm run probe`, builds the game, and
boots the resulting bundle in hidden Electron. That smoke proves the start
menu, disk saves, and browser-storage isolation. A failing branch cannot stop
other successful branches from publishing.

The existing `scripts/browser-previews.json` supplies optional build flags:
Seamless enables its worldmass setting. Every experimental build gets a
desktop storage scope when its source supports `src/buildProfile.ts`;
launcher-level disk/session isolation also protects older branches without
that contract. Adding an ordinary branch needs no registry entry.

Only a separate trusted publishing job receives `contents:write`. It checks
that the branch still exists at the same commit before uploading. One
non-version prerelease, `launcher-builds`, holds assets named
`game-<branch hash>-<commit>.json.gz`. It is never Latest and cannot match the
normal launcher's strict version-tag filter. New uploads are verified before
older assets are pruned; two successful builds per branch are retained.
Deleted-branch assets may remain stored but are never a source of picker rows.

GitHub must have this workflow on its default branch before its automatic and
manual triggers become available. Dispatch it for an existing experiment to
seed its first download. Installed players receive the branch picker through
the next normal application release.

## Verification

- `npm run check`: game, launcher, and simulation types.
- `npm run test:launcher`: update laws plus branch pagination, deletion,
  offline selection, path confinement, atomic install, digest failure, and
  packager round trips.
- `npm run smoke:launcher`: real picker/bridge, missing build, branch deletion,
  and offline fallback; no real settings or saves are changed.
- `npm run smoke:update`, `npm run smoke`: existing updater and game boot.
- `scripts/smoke-launcher-branch.cjs`: downloaded bundle boot and save
  isolation; environment `BRANCH_SMOKE_BUNDLE`, `BUILD_BRANCH`, `BUILD_COMMIT`.


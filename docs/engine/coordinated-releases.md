# Coordinated browser and desktop game releases

`releases.json` on GitHub Pages is the single publication catalog for Main and
all branches in `scripts/browser-previews.json`. A branch name is not a version:
each catalog entry identifies the exact source commit, tooling commit, build ID,
source CI run, immutable browser directory and SHA-256-verified desktop bundle.

## Publication

The Pages workflow resolves verified Main, then `plan-coordinated-release.mjs`
pins every game. Main requires a green [full gate](../ai/test-cadence.md) on the
exact tooling commit. A preview uses the latest green `ci.yml` run on its current
history; pull-request results, the commit check, unfinished runs and unrelated
histories cannot publish. A pending preview HEAD therefore does not sneak into a
release.

`build-coordinated-release.mjs` builds each game once. `release-artifacts.mjs`
stamps its identity and packages those exact files for desktop. Every browser
file must match the corresponding desktop file byte for byte. Both clients are
booted by `smoke-coordinated-release.cjs` before the site artifact is uploaded.
The complete catalog, browser files and desktop downloads are promoted by one
GitHub Pages deployment. There is no independent branch uploader. Any build,
identity, digest or smoke failure leaves the previous live deployment intact.

The previous published artifacts are retained for cached loaders. Browser
entry points (`/play/` and `/dev/<id>/`) resolve the catalog without a cache and
load its immutable game while preserving the entry URL, query and fragment.
A cached catalog can only name a complete older pair, never a half-release.

## Desktop and saves

Normal Play, including Main, resolves the same catalog, verifies the bundle
size, SHA-256 and embedded identity, and changes its local pointer only after a
complete install. Failure preserves the previous downloaded game. Offline Play
uses that copy or the catalog-stamped game included in an installer; it does not
fall back to an unverified local checkout. Existing saves are never moved.

Browser previews keep `preview:<id>` storage keys. The desktop preload supplies
the existing `desktop:<branch hash>` keys before the same game modules execute.
Main keeps its existing filesystem/localStorage behavior and save directory.
The preload exposes only the storage namespace and offline status, not a Node
or filesystem API.

Developer mode explicitly runs local source/builds and is labeled accordingly.
Changing modes closes the previous serving process so its game cannot leak into
the other mode. An installed launcher from before this change needs one update
to adopt the catalog; it cannot acquire new behavior without updating its code.

## Version display and application updates

The start and pause menus show the branch and actual loaded revision plus release
ID (`source.release`). The stamp
is embedded in that build, not fetched from the latest catalog after startup,
so an already-open tab continues to report its real older version. Offline
copies and modified local development builds are labeled. The launcher shows
its application version separately from the game revision.

Nightly/stable channels update the launcher application, not the game catalog.
Nightly source is pinned to the newest main commit with a green full gate. Published installers
copy the already published Main game from the catalog instead of rebuilding an
independent game. Their packaged boot/update checks still run before the draft
installer release is published. Offline installs and already-open sessions do
not magically update; publication equality concerns the offered release, and
the visible identity makes any older running copy explicit.

Verify with `node --test scripts/test-coordinated-release.mjs
scripts/test-release-policy.mjs scripts/test-launcher-branches.mjs`,
`npm run check`, the game/launcher/update smoke tests, and the paired-client
smoke over a staged site. Its screenshots are in
`balance/reports/coordinated-release/`.

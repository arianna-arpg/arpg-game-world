# Browser branch previews

Main stays at `/arpg-game-world/play/`. The seamless preview stays at
`/arpg-game-world/dev/seamless-world/`. Each is paired with the desktop game for
that same branch in the shared `releases.json` catalog. See
[coordinated releases](coordinated-releases.md) for the publication contract.

`scripts/browser-previews.json` declares preview branches, URL IDs, browser save
namespaces and default world mode. Release planning selects verified source
commits; it never builds an unchecked preview HEAD merely because Main passed.
Each game is built once, then the same files are packaged for desktop. Only a
complete, smoke-tested Pages artifact can replace the live catalog.

`site/build.json` retains the production/preview summary for existing tooling.
`site/releases.json` is authoritative; every immutable game contains its own
`build.json` and embeds its actual identity in the start/pause menu label.

A new preview needs a unique registry entry, isolated storage support in
`src/buildProfile.ts`, and a branch entry in the Pages workflow trigger. The
runtime storage namespace is supplied before game modules execute: browsers
retain `preview:<id>`, and desktop retains its existing `desktop:<branch hash>`.
The world-mode flag is shared by both builds. No gameplay is copied into Main.

Run the preview-configuration tests and coordinated-release tests. The paired
browser/desktop smoke uses disposable profiles, checks the displayed identities
and storage namespaces, and verifies desktop saving and offline recovery.

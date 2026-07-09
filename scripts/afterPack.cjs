// ---------------------------------------------------------------------------
// AFTERPACK (electron-builder hook) — Linux only: wrap the executable in a
// tiny exec shim that strips Steam's overlay preload before Chromium boots.
//
// Steam injects LD_PRELOAD=gameoverlayrenderer.so into every title it
// launches (that is the Steam overlay), including non-Steam games on a
// Steam Deck. Chromium's multi-process boot chokes on that hook — the
// zygote/GPU children die loading it and the app "runs" forever without
// ever presenting a window: the exact infinite-loading-screen a Deck shows
// when the AppImage is launched from Game Mode. The same file runs fine
// from Konsole because nothing injected the overlay.
//
// The shim runs BEFORE any Electron code (Chromium forks its zygote earlier
// than the app's own JS, so in-app env scrubbing is too late), drops ONLY
// the overlay entries from LD_PRELOAD, leaves every other preload alone,
// and `exec`s the real binary — same PID, so Steam's process tracking and
// gamescope's window hand-off stay intact. Cost: Steam's overlay won't
// render over the game; it was never going to cooperate with a Chromium
// window anyway.
// ---------------------------------------------------------------------------
'use strict';

const fs = require('node:fs');
const path = require('node:path');

/** @param {{ electronPlatformName: string, appOutDir: string, packager: { executableName?: string } }} context */
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'linux') return;
  const exe = context.packager.executableName || 'hollow-wake';
  const shimPath = path.join(context.appOutDir, exe);
  const realPath = path.join(context.appOutDir, exe + '.bin');
  fs.renameSync(shimPath, realPath);
  fs.writeFileSync(shimPath, `#!/bin/sh
# Strip Steam's overlay preload (gameoverlayrenderer.so): it hooks itself
# into every Chromium child process and the window never presents. Any
# other LD_PRELOAD entries pass through untouched. exec keeps the PID so
# Steam's process tracking stays intact.
if [ -n "$LD_PRELOAD" ]; then
  LD_PRELOAD=$(printf '%s' "$LD_PRELOAD" | tr ': ' '\\n\\n' \\
    | grep -v gameoverlayrenderer | grep -v '^$' | paste -sd: -)
  if [ -n "$LD_PRELOAD" ]; then export LD_PRELOAD; else unset LD_PRELOAD; fi
fi
exec "$(dirname "$0")/${exe}.bin" "$@"
`, { mode: 0o755 });
  console.log(`  • afterPack shim: ${exe} → strips Steam overlay preload, execs ${exe}.bin`);
};

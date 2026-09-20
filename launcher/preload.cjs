// ---------------------------------------------------------------------------
// LAUNCHER PRELOAD — the only bridge between the launcher page and the main
// process. The page gets a typed-feeling `window.launcher` API and nothing
// else (contextIsolation + sandbox stay on; no Node in the renderer).
// ---------------------------------------------------------------------------
// @ts-check
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
  /** Current repo/build/config state (version, branch, head, dirty, …). */
  status: () => ipcRenderer.invoke('launcher:status'),
  /** Checkout: git fetch + how far behind the GitHub branch we are (+ changelog).
   *  Packaged: the release-channel probe — how many published builds are newer. */
  check: () => ipcRenderer.invoke('launcher:check'),
  /** Checkout: git pull --ff-only → npm install → build. Packaged: THE DIRECT
   *  UPDATE — download, verify against the published digest, install, relaunch. */
  update: () => ipcRenderer.invoke('launcher:update'),
  /** Ensure the build is current, start the loopback server, open the game window. */
  play: () => ipcRenderer.invoke('launcher:play'),
  /** Force a rebuild of dist/ even if the stamp says it's fresh. */
  rebuild: () => ipcRenderer.invoke('launcher:rebuild'),
  /** FULL RESET: erase saves/ + all browser-side storage. The destructive
   *  confirm is a native dialog owned by the main process, not this page. */
  reset: () => ipcRenderer.invoke('launcher:reset'),
  /** DEVELOPER MODE: merge a patch of the dev toggles ({ developer,
   *  liveSource, forges, passiveEditor, console } — booleans only) into the
   *  machine-local config; resolves { ok, dev, mode } — the stored toggles
   *  and the effective fold the game will launch with. */
  setDev: (/** @type {Record<string, boolean>} */ patch) => ipcRenderer.invoke('launcher:setDev', patch),
  /** THE RELEASE CHANNEL: follow 'nightly' (every verified night's build) or
   *  'stable' (hand-cut stables only); persisted to the machine-local config.
   *  Resolves { ok, channel, channels } — re-run check() afterwards. */
  setChannel: (/** @type {string} */ id) => ipcRenderer.invoke('launcher:setChannel', id),
  quit: () => ipcRenderer.invoke('launcher:quit'),
  /** Streamed progress lines from git/npm/build child processes. */
  onLog: (/** @type {(line: string) => void} */ cb) => {
    ipcRenderer.on('launcher:log', (_e, line) => cb(String(line)));
  },
  /** Direct-update download progress ({ pct, gotMb, totalMb, tag }). */
  onProgress: (/** @type {(p: any) => void} */ cb) => {
    ipcRenderer.on('launcher:progress', (_e, p) => cb(p));
  },
  /** Main-process state pushes (e.g. the game window closed → launcher reshown). */
  onState: (/** @type {(state: any) => void} */ cb) => {
    ipcRenderer.on('launcher:state', (_e, state) => cb(state));
  },
});

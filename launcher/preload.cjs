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
  /** git fetch + how far behind the GitHub branch we are (+ changelog). */
  check: () => ipcRenderer.invoke('launcher:check'),
  /** git pull --ff-only → npm install → build. */
  update: () => ipcRenderer.invoke('launcher:update'),
  /** Ensure the build is current, start the loopback server, open the game window. */
  play: () => ipcRenderer.invoke('launcher:play'),
  /** Force a rebuild of dist/ even if the stamp says it's fresh. */
  rebuild: () => ipcRenderer.invoke('launcher:rebuild'),
  /** FULL RESET: erase saves/ + all browser-side storage. The destructive
   *  confirm is a native dialog owned by the main process, not this page. */
  reset: () => ipcRenderer.invoke('launcher:reset'),
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

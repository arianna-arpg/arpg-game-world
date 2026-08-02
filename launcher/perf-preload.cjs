// ---------------------------------------------------------------------------
// THE BEAT BRIDGE — perf harness only (loaded by createGameWindow solely when
// perfMode asks for it; normal play and the smoke modes run the game window
// with NO preload, exactly as before).
//
// The game page is a plain web app with no node/IPC access by design. The
// perf deadman (launcher/perfdeadman.cjs) needs ONE narrow channel out of
// it: a liveness beat from the sampler's own frame loop, carrying completed
// rows so a killed run still yields a partial report. This bridge exposes
// exactly that — `window.__perfBeat(payload)` → ipc `perf:beat` — and
// nothing else. In dev-browser play (npm run dev) the global simply never
// exists and the sampler's optional call no-ops (src/dev/perf.ts).
// ---------------------------------------------------------------------------
// @ts-check
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__perfBeat',
  /** @param {unknown} payload */
  (payload) => { ipcRenderer.send('perf:beat', payload); });

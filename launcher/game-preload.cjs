// @ts-check
'use strict';
// Platform identity, offline status, and an explicit quit capability only.
// No filesystem or launcher-management API crosses into the game.
const { contextBridge, ipcRenderer } = require('electron');
const argument = (/** @type {string} */ name) => process.argv.find(v => v.startsWith(name + '='))?.slice(name.length + 1) ?? '';
contextBridge.exposeInMainWorld('__HOLLOW_WAKE_STORAGE_SCOPE__', argument('--hollow-storage-scope'));
contextBridge.exposeInMainWorld('__HOLLOW_WAKE_OFFLINE__', argument('--hollow-offline') === 'true');

contextBridge.exposeInMainWorld('hollowWakeDesktop', {
  quit: () => ipcRenderer.send('game:quit'),
});

// Only the performance harness opts into its liveness channel.
if (process.argv.includes('--hollow-wake-perf-beat')) {
  contextBridge.exposeInMainWorld('__perfBeat',
    /** @param {unknown} payload */
    payload => { ipcRenderer.send('perf:beat', payload); });
}

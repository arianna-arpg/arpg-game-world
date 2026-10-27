// @ts-check
'use strict';
// No filesystem/game API crosses this bridge. Only platform save identity and
// offline status differ; the browser and desktop execute the same game bundle.
const { contextBridge } = require('electron');
const argument = (/** @type {string} */ name) => process.argv.find(v => v.startsWith(name + '='))?.slice(name.length + 1) ?? '';
contextBridge.exposeInMainWorld('__HOLLOW_WAKE_STORAGE_SCOPE__', argument('--hollow-storage-scope'));
contextBridge.exposeInMainWorld('__HOLLOW_WAKE_OFFLINE__', argument('--hollow-offline') === 'true');

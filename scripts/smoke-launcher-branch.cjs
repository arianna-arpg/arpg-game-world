// Hidden Electron proof for a downloadable game: boot with the real launcher
// server, reach the start menu, exercise disk saves, and isolate browser storage.
'use strict';
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startGameServer } = require('../launcher/server.cjs');
const branches = require('../launcher/branches.cjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hollow-branch-smoke-'));
app.setPath('userData', path.join(tmp, 'profile'));
let server, win;
const deadline = setTimeout(() => { console.error('SMOKE branch: timeout'); app.exit(1); }, 120000);
app.whenReady().then(async () => {
  try {
    const bundle = process.env.BRANCH_SMOKE_BUNDLE;
    const branch = process.env.BUILD_BRANCH;
    const commit = process.env.BUILD_COMMIT;
    if (!bundle || !branch || !commit) throw new Error('Branch smoke needs a bundle and its identity.');
    const installed = branches.installBundle({ home: path.join(tmp, 'cache'), branch, commit, compressed: fs.readFileSync(bundle) });
    const started = await startGameServer({ root: installed.root, savesDir: path.join(tmp, 'saves') });
    server = started.server;
    win = new BrowserWindow({ show: false, webPreferences: { partition: 'persist:branch-smoke', sandbox: true, contextIsolation: true, nodeIntegration: false } });
    win.webContents.on('render-process-gone', (_, detail) => { throw new Error('Renderer stopped: ' + detail.reason); });
    await win.loadURL(started.url);
    const until = Date.now() + 90000;
    let ready = false;
    while (Date.now() < until) {
      ready = await win.webContents.executeJavaScript("!!window.__game && !!document.querySelector('#start-menu:not(.hidden)')");
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (!ready) throw new Error('Game did not reach its start menu.');
    const saved = await win.webContents.executeJavaScript(`(async () => {
      const write = await fetch('/__save/branchsmoke', {method:'POST',body:JSON.stringify({branch:'smoke'})});
      const read = await fetch('/__save/branchsmoke');
      localStorage.setItem('branch-smoke', 'isolated');
      return write.ok && (await read.json()).branch === 'smoke';
    })()`);
    if (!saved) throw new Error('Disk save round trip failed.');
    const other = new BrowserWindow({ show: false, webPreferences: { partition: 'persist:main-smoke' } });
    await other.loadURL(started.url);
    const leaked = await other.webContents.executeJavaScript("localStorage.getItem('branch-smoke')");
    other.destroy();
    if (leaked !== null) throw new Error('Branch storage leaked into Main.');
    await session.fromPartition('persist:branch-smoke').clearStorageData();
    console.log('SMOKE branch: OK ' + branch + ' @ ' + commit.slice(0, 8));
    clearTimeout(deadline); win.destroy(); server.closeAllConnections(); server.close(); app.exit(0);
  } catch (e) { console.error('SMOKE branch: FAILED', e); clearTimeout(deadline); win?.destroy(); server?.close(); app.exit(1); }
});


// Build first, then npx electron balance/forest-profile.cjs [--label=baseline].
// Runs the normal seeded walk and records renderer pass costs/cache rebuilds.
const { app, BrowserWindow, powerSaveBlocker } = require('electron');
const fs = require('node:fs'), path = require('node:path');
const { startGameServer } = require('../launcher/server.cjs');
const root = path.resolve(__dirname, '..');
const label = (process.argv.find(a => a.startsWith('--label=')) || '--label=profile').slice(8).replace(/[^a-zA-Z0-9_-]/g, '_');
const out = path.join(root, 'balance/reports/forest-profile', label);
fs.mkdirSync(out, { recursive: true });
app.setPath('userData', path.join(out, 'profile'));
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.whenReady().then(async () => {
  powerSaveBlocker.start('prevent-display-sleep');
  const server = await startGameServer({ root: path.join(root, 'dist'), savesDir: path.join(out, 'saves') });
  const win = new BrowserWindow({ show: false, useContentSize: true, width: 2560, height: 1377,
    webPreferences: { backgroundThrottling: false } });
  try {
    await win.loadURL(server.url); win.showInactive();
    const cfg = JSON.parse(fs.readFileSync(path.join(root, 'balance/perf.config.json'), 'utf8'));
    await win.webContents.executeJavaScript(`(${function () {
      const g = __game, r = g.renderer;
      const rows = {}, last = new WeakMap();
      const row = () => rows[g.world().zone.tileset ?? g.world().zone.id] ??= { calls: {}, changes: 0, bakes: 0 };
      const wrap = (host, name, count) => {
        const fn = host[name];
        host[name] = function (...args) {
          const record = row(), t = performance.now();
          if (name === 'drawDoodads' && !record.kinds) record.kinds = Object.fromEntries([...r.culled].map(([k,v]) => [k,v.length]));
          const value = fn.apply(this, args);
          const samples = record.calls[name] ??= []; samples.push(performance.now() - t);
          if (count) count(record, value, this);
          return value;
        };
      };
      for (const name of ['drawDoodads', 'drawCanopies', 'drawActors', 'cullDoodads']) {
        if (typeof r[name] === 'function') wrap(r, name);
      }
      wrap(r.canopySlices, 'bake', record => record.bakes++);
      wrap(Object.getPrototypeOf(g.world()), 'veilIndex', (record, value, world) => {
        if (last.get(world) !== value) { record.changes++; last.set(world, value); }
      });
      window.__forestRows = rows;
    }.toString()})()`);
    const opts = { seconds: 8, settleSeconds: cfg.settleSeconds, filter: 'forest,jungle,mycelia',
      weather: cfg.weather, mintSeed: cfg.mintSeed, mintPins: cfg.mintPins };
    win.webContents.debugger.attach('1.3');
    await win.webContents.debugger.sendCommand('Profiler.enable');
    await win.webContents.debugger.sendCommand('Profiler.start');
    const report = await win.webContents.executeJavaScript(`__game.perfSweep(${JSON.stringify(opts)})`);
    const profile = await win.webContents.debugger.sendCommand('Profiler.stop');
    fs.writeFileSync(path.join(out, 'cpu.cpuprofile'), JSON.stringify(profile.profile));
    const costs = await win.webContents.executeJavaScript(`(${function () {
      for (const row of Object.values(window.__forestRows)) {
        for (const [name, samples] of Object.entries(row.calls)) {
          samples.sort((a, b) => a - b);
          row.calls[name] = { n: samples.length, total: samples.reduce((a, b) => a + b, 0),
            p50: samples[Math.floor(samples.length * .5)], p99: samples[Math.floor(samples.length * .99)], max: samples.at(-1) };
        }
      }
      return window.__forestRows;
    }.toString()})()`);
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ report, costs }, null, 2));
    console.log(JSON.stringify(costs, null, 2));
    console.log('Profile saved: ' + out);
    win.destroy(); server.server.close(); app.exit(0);
  } catch (e) { console.error(e); win.destroy(); server.server.close(); app.exit(1); }
});

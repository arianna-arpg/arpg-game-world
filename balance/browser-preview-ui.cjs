// Build dist normally and dist-preview with the preview profile first.
// Optional URL argument exercises the published build with an isolated profile.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const reports = path.join(__dirname, 'reports'); fs.mkdirSync(reports, { recursive: true });
const logFile = path.join(reports, 'browser-preview-ui.log');
const log = v => fs.appendFileSync(logFile, JSON.stringify(v) + '\n');
fs.writeFileSync(logFile, 'START\n');
app.setPath('userData', path.join(reports, 'preview-profile-' + process.pid));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 55000);
  let diskRequests = 0;
  const root = path.resolve(__dirname, '../dist-preview');
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/__save/')) { diskRequests++; res.writeHead(404); return res.end(); }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = process.argv[2] || `http://127.0.0.1:${server.address().port}/`;
  const win = new BrowserWindow({ show: false, width: 1280, height: 850,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(url);
    // Seed unscoped production state, then reload through the actual boot path.
    await win.webContents.executeJavaScript(`(() => {
      for (const key of ['arpg_account_v1','arpg_character_v1','arpg_character_v1_s10','arpg_settings_v1','arpg_workshop_v1','arpg_atlas_v1'])
        localStorage.setItem(key, 'production-sentinel');
    })()`);
    await win.loadURL(url);
    const initial = await win.webContents.executeJavaScript(`(async () => {
      await new Promise(r=>setTimeout(r,300));
      __game.devStartRun('warrior'); __game.ui.hideAll(); __game.step(3);
      const w=__game.world(); w.player.invulnerable=true; __game.save();
      return {fatal:__game.crash().fatal,worldmass:!!w.massRuntime,seed:w.massRuntime?.generator.run.seed,
        keys:Object.keys(localStorage),ordinary:Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('arpg_')))};
    })()`);
    log(initial); assert.equal(initial.fatal,null); assert.ok(initial.worldmass,'bare preview URL must start worldmass');
    assert.ok(initial.keys.includes('preview:seamless-world:arpg_account_v1'));
    assert.ok(initial.keys.includes('preview:seamless-world:arpg_character_v1'));
    assert.ok(Object.values(initial.ordinary).every(v=>v==='production-sentinel'),'production saves must remain byte-identical');
    await win.loadURL(url);
    const restored = await win.webContents.executeJavaScript(`(async () => {
      for(let i=0;i<60&&!document.querySelector('#sm-continue:not([disabled])');i++) await new Promise(r=>setTimeout(r,100));
      document.querySelector('#sm-continue:not([disabled])')?.click();
      for(let i=0;i<60&&!__game.world().massRuntime;i++) await new Promise(r=>setTimeout(r,100));
      return {fatal:__game.crash().fatal,seed:__game.world().massRuntime?.generator.run.seed,
        ordinary:Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('arpg_')))};
    })()`);
    log(restored); assert.equal(restored.fatal,null); assert.equal(restored.seed,initial.seed);
    assert.deepEqual(restored.ordinary,initial.ordinary); assert.equal(diskRequests,0,'preview must never use shared disk endpoints');
    log('PASS: default worldmass, isolated production saves, browser-only save and Continue');
  } catch (error) { log(error.stack ?? String(error)); process.exitCode=1; }
  finally { clearTimeout(timeout); win.destroy(); server.close(); app.exit(process.exitCode || 0); }
}).catch(error=>{log(error.stack??String(error));app.exit(1);});

// npx electron balance/foliage-visual.cjs — pixel comparison with real Chromium Canvas2D.
const { app, BrowserWindow } = require('electron');
const { buildSync } = require('esbuild');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'balance/reports/foliage-visual');
fs.mkdirSync(out, { recursive: true });
app.setPath('userData', path.join(out, 'profile'));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  try {
    const bundle = buildSync({ entryPoints: [path.join(__dirname, 'foliage-visual.ts')], bundle: true,
      write: false, platform: 'browser', format: 'iife', globalName: '__foliageQA' }).outputFiles[0].text;
    await win.loadURL('about:blank');
    const result = await win.webContents.executeJavaScript('(() => { try { ' + bundle + '\nreturn __foliageQA.checkTrunks(); } catch(e) { return { error: e.stack }; } })()');
    if (result.error) throw Error(result.error);
    fs.writeFileSync(path.join(out, 'comparison.png'), Buffer.from(result.image.split(',')[1], 'base64'));
    delete result.image;
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
    console.log('PASS trunk pixel comparison: ' + JSON.stringify(result));
    win.destroy(); app.exit(0);
  } catch (e) { console.error(e); win.destroy(); app.exit(1); }
});

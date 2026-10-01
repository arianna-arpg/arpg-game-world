// Hidden, disposable Chromium profile; never attaches to a player's session.
// npx electron balance/visibility-ui.cjs [--frames-only] [--baseline=<git-ref>]
// VIS_GPU=1 additionally exercises the available hardware canvas backend.
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
const baseline = process.argv.find(a => a.startsWith('--baseline='))?.slice('--baseline='.length);
const framesOnly = process.argv.includes('--frames-only');
const suffix = baseline ? '-baseline' : '';
app.setPath('userData', path.join(dir, 'visibility-profile-' + process.pid));
if (process.env.VIS_GPU !== '1') app.disableHardwareAcceleration();
const timeout = setTimeout(() => { console.error('Visibility harness timed out'); app.exit(1); }, 240000);

app.whenReady().then(async () => {
  const plugins = baseline ? [{
    name: 'visibility-negative-control',
    setup(build) {
      // Substitute only the two production modules from the supplied commit.
      // No checkout, source mutation, or baseline-only change to the tests.
      build.onLoad({ filter: /[\\/]src[\\/]render[\\/](renderer|vis[\\/]sightVeil)\.ts$/ }, args => ({
        contents: execFileSync('git', ['show', baseline + ':' + path.relative(root, args.path).replaceAll('\\', '/')],
          { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }),
        loader: 'ts', resolveDir: path.dirname(args.path),
      }));
    },
  }] : [];
  await require('esbuild').build({ entryPoints: [path.join(__dirname, 'visibilityFixture.ts')],
    bundle: true, format: 'iife', outfile: path.join(dir, 'visibility-fixture.js'), plugins });
  fs.writeFileSync(path.join(dir, 'visibility-fixture.html'),
    '<!doctype html><html><body style="margin:0"><script src="visibility-fixture.js"></script></body></html>');
  const win = new BrowserWindow({ show: false, width: 1568, height: 1196,
    webPreferences: { offscreen: true, contextIsolation: true, nodeIntegration: false } });
  const errors = [];
  win.webContents.on('console-message', event => {
    if (event.level === 'error') errors.push(event.message);
  });
  await win.loadFile(path.join(dir, 'visibility-fixture.html'));
  const frames = await win.webContents.executeJavaScript('window.visibilityFixture.frames()');
  const raster = framesOnly ? null : await win.webContents.executeJavaScript('window.visibilityFixture.sweep()');
  if (raster?.worst?.image) {
    fs.writeFileSync(path.join(dir, 'visibility-worst' + suffix + '.png'),
      Buffer.from(raster.worst.image.split(',')[1], 'base64'));
    delete raster.worst.image;
  }
  const result = { baseline: baseline ?? null, frames, raster, errors };
  fs.writeFileSync(path.join(dir, 'visibility-raster' + suffix + '.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ frames: { samples: frames.samples, failures: frames.failures,
    roofFrames: frames.roofs.length, roofFailures: frames.roofFailures }, raster: raster && { tested: raster.tested,
    testedPoses: raster.testedPoses, failures: raster.failures.length, worst: raster.worst }, errors }, null, 2));
  clearTimeout(timeout);
  app.exit(frames.failures.length || frames.roofFailures.length || raster?.failures.length || errors.length ? 1 : 0);
}).catch(error => { console.error(error); clearTimeout(timeout); app.exit(1); });

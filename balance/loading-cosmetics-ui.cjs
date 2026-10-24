// Catalogue-wide pixel parity in the actual opaque-origin loading process.
// Scoped production build first; all profiles, scripts and captures stay in reports/.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const dir = path.join(__dirname, 'reports', 'mu-skin-parity'); fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, 'profile-' + process.pid)); app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const { build } = await import('vite');
  const root = path.resolve(__dirname, '..', process.env.HOLLOW_WAKE_QA_DIST || 'dist');
  const bundle = async (entry, name, plugins = []) => {
    const result = await build({ configFile: false, logLevel: 'error', plugins,
      build: { write: false, minify: true, lib: { entry: path.join(__dirname, entry), name, formats: ['iife'] } } });
    return (Array.isArray(result) ? result : [result]).flatMap(r => r.output).find(r => r.type === 'chunk').code;
  };
  const reference = await bundle('loadingCosmeticsReference.ts', 'MuSkinReference');
  // Recreate the original dependency omission without editing the working tree.
  let removedDependency = false;
  const broken = await bundle('../src/loading/frame.ts', 'MuCrossing', [{ name: 'missing-body-glyphs', enforce: 'pre',
    transform(code, id) { if (id.replace(/\\/g, '/').endsWith('/src/render/vis/body.ts')) {
      const changed = code.replace(/^import ['"]\.\.\/\.\.\/data\/glyphParts['"];?\r?\n/m, '');
      removedDependency = changed !== code; return changed;
    } }
  }]);
  assert.ok(removedDependency, 'negative control must remove the shared glyph dependency');
  let negative = false;
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname, file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    res.setHeader('Cache-Control', 'no-store');
    if (negative && /mu-crossing.*\.js$/.test(name)) return res.end(broken);
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const win = new BrowserWindow({ show: false, width: 1280, height: 850, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const report = { checks: [], errors: [], images: [] }, gallery = [];
  win.webContents.on('console-message', e => { if (e.level === 'error') report.errors.push(e.message); });
  const execute = async (target, fn, ...args) => {
    const result = await target.executeJavaScript('(async()=>{try{return {ok:true,value:await (' + fn + ')(' + args.map(a => JSON.stringify(a)).join(',') + ')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
    if (!result.ok) throw Error(result.error); return result.value;
  };
  const host = (fn, ...args) => execute(win.webContents, fn, ...args);
  const child = () => win.webContents.mainFrame.frames.find(f => f.url === 'about:srcdoc');
  const toy = (fn, ...args) => execute(child(), fn, ...args);
  const timer = setTimeout(() => { console.error('Loading cosmetics timed out'); app.exit(1); }, 240000);
  const open = async () => {
    await win.loadURL('http://127.0.0.1:' + server.address().port);
    await host(async () => {
      for (let i = 0; !window.__game && i < 100; i++) await new Promise(r => setTimeout(r, 100));
      await __game.hydrated(); __game.account().ledger.prologue_lived = 1;
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [] });
    });
    await win.webContents.executeJavaScript(reference);
    await toy(async () => {
      for (let i = 0; !window.__muCrossing && i < 100; i++) await new Promise(r => setTimeout(r, 30));
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [] });
    });
  };
  const sample = async (id, direction, time, reduced) => {
    await host(async (id, direction) => {
      __game.account().cosmetics.loadout = MuSkinReference.outfit(id);
      window.__skinLease = __game.loading.begin({ kind: 'entry', direction, label: 'Wardrobe parity', loadout: __game.account().cosmetics.loadout });
      await __skinLease.paint();
    }, id, direction);
    assert.notEqual(child().processId, win.webContents.mainFrame.processId);
    const actual = await toy((time, reduced) => {
      const s = __muCrossing.loading;
      cancelAnimationFrame(s.raf); s.last = 0;
      Object.assign(s.run, { time, distance: 123, lane: 0, gates: [], pickups: [], currents: [], bursts: [] });
      s.media = { matches: reduced };
      s.frame(0); cancelAnimationFrame(s.raf);
      const rect = s.canvas.getBoundingClientRect();
      return { width: rect.width, height: rect.height, dpr: Math.min(2, devicePixelRatio || 1), png: s.canvas.toDataURL(), loadout: s.loadout };
    }, time, reduced);
    assert.equal(actual.loadout.slots.wispSkin || '', id, 'host outfit reaches isolated renderer');
    const expected = await host(s => MuSkinReference.crossing(s), { ...actual, png: undefined, id, direction, time, reduced });
    return { actual, expected };
  };
  try {
    await open();
    const catalogue = await host(() => MuSkinReference.catalogue);
    assert.ok(catalogue.length > 1);
    // Exercise Mu and the actual Wardrobe, then retain the game actor unchanged.
    await host(async () => {
      __game.ui.hideAll(); __game.ui.onBeginRun();
      for (let i = 0; (__game.loading.active || !__game.world()?.seats.length || __game.world().player.cosmeticKind !== 'wisp') && i < 200; i++)
        await new Promise(r => setTimeout(r, 30));
      if (!__game.world()?.seats.length || __game.world().player.cosmeticKind !== 'wisp')
        throw Error('Mu did not open: ' + JSON.stringify({ loading: __game.loading.snapshot, crash: __game.crash(), text: document.body.innerText.slice(-1500) }));
      __game.hold(true); __game.ui.showWardrobe();
      document.querySelector('[data-wd-slot="wispSkin"]').click();
    });
    const cards = await host(() => [...document.querySelectorAll('[data-wd-model]')].map(c => c.dataset.wdModel));
    assert.deepEqual(cards.sort(), catalogue.filter(r => r.id).map(r => r.id).sort());
    await host(() => { document.querySelector('[data-wd-back]').click(); __game.hold(true); });
    for (const row of catalogue) {
      const gameplay = await host(id => {
        const w = __game.world(), a = w.player, renderer = __game.renderer;
        const radius = a.radius, look = a.look, expected = MuSkinReference.body(id, radius);
        __game.account().cosmetics.loadout = MuSkinReference.outfit(id);
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
        const ctx = canvas.getContext('2d'), draw = ctx.drawImage, bakes = [];
        ctx.drawImage = function(image, ...args) { if (image instanceof HTMLCanvasElement) bakes.push(image.toDataURL()); return draw.call(this, image, ...args); };
        const previous = renderer.ctx;
        try { renderer.ctx = ctx; ctx.translate(128 - a.pos.x, 128 - a.pos.y); renderer.drawActor(a, w); }
        finally { renderer.ctx = previous; }
        if (!bakes.includes(expected)) throw Error(id + ': Mu did not draw the complete reference body');
        if (radius !== a.radius || look !== a.look) throw Error('Cosmetics mutated the Mu actor');
        MuSkinReference.body(id, 22); // loading-sized body must also contain ink
        return { radius, look };
      }, row.id);
      for (const direction of ['down', 'right', 'left']) for (const [time, reduced] of [[2, false], [5.25, false], [5.25, true]]) {
        const { actual, expected } = await sample(row.id, direction, time, reduced);
        assert.ok(actual.png === expected.png, `${row.id || 'original'} ${direction} t=${time} reduced=${reduced}: complete loading pixels differ`);
        report.checks.push({ id: row.id || 'original', direction, time, reduced, gameplay });
        if (direction === 'right' && time === 2) gallery.push({ name: row.name, actual: actual.png, ...expected });
      }
    }
    // Before/after skins may reuse caches: clearing the slot must restore native art.
    const restored = await sample('', 'right', 2, false);
    assert.ok(restored.actual.png === restored.expected.png, 'clearing the skin restores native loading pixels');
    const png = await host(async rows => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 70 + rows.length * 168;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#101922'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#d9e9e3'; ctx.font = '17px sans-serif';
      ctx.fillText('Mu rendering reference', 26, 32); ctx.fillText('Isolated loading screen', 344, 32);
      for (const [i, row] of rows.entries()) {
        for (const [column, url] of [row.png, row.actual].entries()) {
          const img = new Image(); img.src = url; await img.decode();
          const side = 120 * row.scale;
          ctx.drawImage(img, row.x - side / 2, row.y - side / 2, side, side, column * 320 + 92, 48 + i * 168, 136, 136);
        }
        ctx.fillStyle = '#d9e9e3'; ctx.font = '14px sans-serif'; ctx.fillText(row.name, 24, 202 + i * 168);
      }
      return canvas.toDataURL().split(',')[1];
    }, gallery);
    const image = path.join(dir, 'wisp-parity.png'); fs.writeFileSync(image, Buffer.from(png, 'base64')); report.images.push(image);
    assert.deepEqual(report.errors, []);
    // This same course must detect the shipped defect, not merely compare two
    // renderers which both forgot their glyph registration.
    negative = true; await open();
    const missing = [];
    for (const row of catalogue.filter(r => r.id)) {
      const { actual, expected } = await sample(row.id, 'right', 2, false);
      if (actual.png !== expected.png) missing.push(row.id);
    }
    assert.ok(missing.length > 0, 'negative control failed to detect missing glyph registration');
    report.negativeControl = { rejectedSkins: missing };
    console.log('LOADING COSMETICS OK:', report.checks.length, 'pixel comparisons;', catalogue.length, 'appearances; missing-glyph negative control rejected', missing.length, 'skins');
  } catch (error) { report.failure = error.stack || String(error); console.error(report.failure); process.exitCode = 1; }
  finally {
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
    clearTimeout(timer); win.destroy(); server.close(); app.exit(process.exitCode || 0);
  }
}).catch(error => { console.error(error); app.exit(1); });

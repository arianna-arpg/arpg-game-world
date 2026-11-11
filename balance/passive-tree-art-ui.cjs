// Build first; argv[2] can select an isolated build directory. For a --base=./
// build, add --relative-base to also verify a website subfolder deployment.
// Native hidden Chromium verifies packaged art and the real tree's input path.
const { app, BrowserWindow } = require('electron');
const { makeTempDir } = require('../scripts/temp-dir.cjs');
const { startGameServer } = require('../launcher/server.cjs');
const { buildSync } = require('esbuild');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const scratch = makeTempDir('hollow-passive-art-');
const dir = path.join(__dirname, 'reports', 'passive-tree-art');
fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(scratch, 'profile'));
app.disableHardwareAcceleration();
const report = { checks: [], errors: [] };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const write = () => fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));

app.whenReady().then(async () => {
  const timer = setTimeout(() => { report.errors.push('timeout'); write(); app.exit(1); }, 120000);
  const root = path.resolve(process.argv[2] || path.join(__dirname, 'reports', 'passive-tree-art-dist'));
  const server = await startGameServer({ root, savesDir: path.join(scratch, 'saves') });
  const win = new BrowserWindow({ show: false, width: 1440, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = (fn, ...args) => win.webContents.executeJavaScript('(' + fn + ')(' + args.map(a => JSON.stringify(a)).join(',') + ')');
  const capture = async name => {
    await wait(100);
    const rect = await run(() => {
      const r = document.querySelector('#passive-tree').getBoundingClientRect();
      return { x: Math.max(0, Math.floor(r.x)), y: Math.max(0, Math.floor(r.y)),
        width: Math.min(innerWidth - Math.ceil(r.x), Math.floor(r.width)),
        height: Math.min(innerHeight - Math.ceil(r.y), Math.floor(r.height)) };
    });
    fs.writeFileSync(path.join(dir, name + '.png'), (await win.webContents.capturePage(rect)).toPNG());
  };
  const boot = async (query, address = server.url) => {
    await win.loadURL(address + (query || '')); await run(() => __game.hydrated());
    await run(() => {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('warrior'); __game.ui.hideAll();
      const w = __game.world(); w.player.invulnerable = true; w.meta.passivePoints = 10;
      __game.hold(true); __game.ui.toggleTree(); __game.ui.folioSync();
    });
  };
  const artReady = () => run(async () => {
    const el = document.querySelector('.passive-tree-art-image');
    if (!el) throw Error('Missing class image');
    const image = new Image(); image.src = el.getAttribute('href'); await image.decode();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const bounds = el.getBoundingClientRect(), viewport = el.closest('svg').getBoundingClientRect();
    return { src: image.src, width: image.naturalWidth, height: image.naturalHeight,
      fullyVisible: bounds.left >= viewport.left && bounds.right <= viewport.right
        && bounds.top >= viewport.top && bounds.bottom <= viewport.bottom,
      classId: el.closest('[data-class-art]').dataset.classArt };
  });
  try {
    await boot();
    const initial = await artReady(); assert.equal(initial.classId, 'warrior');
    const overlaps = await run(() => {
      const image = document.querySelector('.passive-tree-art-image');
      const rx = +image.getAttribute('width') / 2, ry = +image.getAttribute('height') / 2;
      const cx = +image.getAttribute('x') + rx, cy = +image.getAttribute('y') + ry;
      // The feathered painting is transparent outside this ellipse. Conservatively
      // enlarge each node by its radius and a reading margin before checking it.
      return [...document.querySelectorAll('#tree-svg .tree-node')].filter(node => {
        const distance = Math.hypot((+node.getAttribute('cx') - cx) / rx, (+node.getAttribute('cy') - cy) / ry);
        return distance - (+node.getAttribute('r') + 8) / Math.min(rx, ry) < 1;
      }).map(node => node.dataset.node);
    });
    assert.deepEqual(overlaps, [], 'central portrait must leave surrounding passive nodes clear');
    report.checks.push('portrait ellipse clears every surrounding passive node with a reading margin');
    const requested = await run(() => performance.getEntriesByType('resource').filter(r => /\.webp/.test(r.name)).map(r => r.name));
    assert.equal(requested.length, 1, 'only the selected class painting loads');
    await capture('warrior');
    report.checks.push('selected class only loads; original painting decodes in packaged build');

    // Source roster supplies the test's expectations; render through production UI.
    const roster = buildSync({ stdin: { contents: "export { CLASSES } from './src/data/classes';", resolveDir: path.resolve(__dirname, '..'), loader: 'ts' },
      bundle: true, write: false, format: 'iife', globalName: 'ClassArtQA' }).outputFiles[0].text;
    await win.webContents.executeJavaScript(roster);
    const ids = await run(() => ClassArtQA.CLASSES.map(c => c.id));
    const urls = new Set();
    for (const id of ids) {
      await run(id => {
        __game.world().meta.classDef = ClassArtQA.CLASSES.find(c => c.id === id);
        __game.ui.centerTreeOnStart(); __game.ui.refreshTree();
      }, id);
      const image = await artReady(); assert.equal(image.classId, id); assert(image.width > 0 && image.height > 0);
      assert(image.fullyVisible, `${id}: opening view must contain the central portrait`);
      urls.add(image.src);
      if (['necromancer', 'sorcerer', 'berserker'].includes(id)) {
        await run(id => {
          __game.ui.hideAll(); __game.devStartRun(id); __game.ui.hideAll(); __game.world().meta.passivePoints = 10;
          __game.ui.toggleTree(); __game.ui.centerTreeOnStart(); __game.ui.refreshTree(); __game.ui.folioSync();
        }, id);
        await artReady(); await capture(id);
      }
    }
    assert.equal(urls.size, ids.length, 'each class resolves its own painting');
    report.checks.push(`${ids.length} distinct class paintings packaged, decoded and fully framed on open`);

    await run(() => {
      __game.ui.hideAll(); __game.devStartRun('warrior'); __game.ui.hideAll(); __game.world().meta.passivePoints = 10;
      __game.ui.toggleTree(); __game.ui.folioSync();
      __game.ui.centerTreeOnStart(); __game.ui.refreshTree();
    });
    const before = await run(() => {
      const svg = document.querySelector('#tree-svg'), image = svg.querySelector('image'), w = __game.world();
      return { view: svg.getAttribute('viewBox'), x: image.getAttribute('x'), y: image.getAttribute('y'),
        points: w.meta.passivePoints, allocated: [...w.meta.allocated].sort() };
    });
    const point = await run(() => {
      const r = document.querySelector('#tree-svg').getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    });
    for (const [type, dx, dy] of [['mouseDown', 0, 0], ['mouseMove', 45, 30], ['mouseUp', 45, 30]]) {
      win.webContents.sendInputEvent({ type, x: point.x + dx, y: point.y + dy, button: 'left', clickCount: 1,
        modifiers: type === 'mouseMove' ? ['leftButtonDown'] : [] }); await wait(40);
    }
    const after = await run(() => {
      const svg = document.querySelector('#tree-svg'), image = svg.querySelector('image'), w = __game.world();
      return { view: svg.getAttribute('viewBox'), x: image.getAttribute('x'), y: image.getAttribute('y'),
        points: w.meta.passivePoints, allocated: [...w.meta.allocated].sort() };
    });
    assert.notEqual(after.view, before.view); assert.equal(after.x, before.x); assert.equal(after.y, before.y);
    assert.equal(after.points, before.points); assert.deepEqual(after.allocated, before.allocated);
    report.checks.push('real drag pans painting with graph without spending points');
    await run(() => document.querySelector('[data-tz="in"]').click());
    assert.notEqual(await run(() => document.querySelector('#tree-svg').getAttribute('viewBox')), after.view);
    const search = await run(() => {
      const input = document.querySelector('#tree-search'); input.value = 'strength'; input.dispatchEvent(new Event('input'));
      const art = document.querySelector('.passive-tree-art');
      return { opacity: +getComputedStyle(art).opacity, pointerEvents: getComputedStyle(art.querySelector('image')).pointerEvents,
        hits: document.querySelectorAll('.tree-node.search-hit').length };
    });
    assert(search.opacity < 1 && search.hits > 0); assert.equal(search.pointerEvents, 'none');
    await capture('search');
    await run(() => { const input = document.querySelector('#tree-search'); input.value = ''; input.dispatchEvent(new Event('input')); });
    assert.equal(await run(() => +getComputedStyle(document.querySelector('.passive-tree-art')).opacity), 1);
    report.checks.push('zoom, search dimming and click-through decoration');

    // Switch the real inventory-page owner to a different couch player's class.
    await run(() => {
      const w = __game.world(), ui = __game.ui; __game.addAlly(); const guest = w.seats.find(s => s !== w.localSeat);
      guest.couch = { side: 'left', pad: 1 }; guest.meta.classDef = ClassArtQA.CLASSES.find(c => c.id === 'necromancer');
      ui.toggleTree(guest.id, 'show'); ui.folioSync();
    });
    assert.equal((await artReady()).classId, 'necromancer');
    await run(() => { const ui = __game.ui; ui.toggleTree(__game.world().localSeat.id, 'show'); ui.folioSync(); });
    assert.equal((await artReady()).classId, 'warrior');
    report.checks.push('couch owner changes repaint with the correct class');

    win.setContentSize(1000, 720);
    await run(() => { __game.ui.centerTreeOnStart(); __game.ui.refreshTree(); __game.ui.folioSync(); });
    await artReady(); await capture('warrior-narrow');
    await run(() => { __game.ui.treeZoom = 1; __game.ui.treePan = { x: 0, y: 0 }; __game.ui.refreshTree(); });
    await capture('overview');

    await run(() => {
      const w = __game.world(); w.ledger.devotion_attuned = 1; __game.ui.treeRealm = 'devotion'; __game.ui.refreshTree();
    });
    assert.equal(await run(() => document.querySelectorAll('.passive-tree-art').length), 0);
    await run(() => {
      __game.ui.treeRealm = 'tree'; const m = __game.world().meta; m.classDef = { ...m.classDef, id: 'future-class-without-art' };
      __game.ui.refreshTree();
    });
    assert.equal(await run(() => document.querySelectorAll('.passive-tree-art-image').length), 0);
    assert(await run(() => document.querySelectorAll('.tree-node').length > 0));
    report.checks.push('other realms and future classes remain usable without class imagery');

    // A relative-base build must also find its art below a web-host subpath.
    if (process.argv.includes('--relative-base')) {
      const nested = await startGameServer({ root: path.dirname(root), savesDir: path.join(scratch, 'nested-saves') });
      try {
        const prefix = nested.url + encodeURIComponent(path.basename(root)) + '/';
        await boot('', prefix + 'index.html');
        assert((await artReady()).src.startsWith(prefix + 'assets/'));
        report.checks.push('relative-base web subpath resolves bundled class artwork');
      } finally { nested.server.close(); }
    }

    await boot('?dev=editor');
    assert.equal(await run(() => document.querySelectorAll('.passive-tree-art').length), 0);
    assert.equal(await run(() => __game.crash().fatal), null);
    report.checks.push('editor stays clear; no runtime crash');
    console.log('PASS passive tree art:', report.checks.join('; '));
  } catch (error) { report.errors.push(error.stack || String(error)); console.error(error); }
  finally { clearTimeout(timer); write(); win.destroy(); server.server.close(); app.exit(report.errors.length ? 1 : 0); }
}).catch(error => { report.errors.push(String(error)); write(); app.exit(1); });

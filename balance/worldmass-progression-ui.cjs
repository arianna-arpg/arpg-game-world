// Scoped preview build; optional deployed URL. Disposable profile only.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logFile = path.join(dir, 'worldmass-progression-ui.log'); fs.writeFileSync(logFile, 'START\n');
const log = value => fs.appendFileSync(logFile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'progression-profile-' + process.pid)); app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 180000);
  const root = path.resolve(__dirname, '../dist-preview');
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = process.argv[2] || 'http://127.0.0.1:' + server.address().port + '/';
  const win = new BrowserWindow({ show: false, width: 1280, height: 850,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = (fn, ...args) => win.webContents.executeJavaScript('(' + fn + ')(' + args.map(a => JSON.stringify(a)).join(',') + ')');
  const shot = async name => {
    await run(async () => { __game.step(2); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
    fs.writeFileSync(path.join(dir, 'worldmass-progression-' + name + '.png'), (await win.webContents.capturePage()).toPNG());
  };
  try {
    await win.loadURL(url);
    const boot = await run(() => {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      __game.devStartRun('warrior'); __game.ui.hideAll();
      const w = __game.world(); w.startWorldMass(42); w.player.invulnerable = true; __game.step(2);
      const m = w.massRuntime;
      window.progressionQA = { home: { ...w.player.pos }, homeLevel: m.levelAt(w.player.pos) };
      return { fatal: __game.crash().fatal, town: m.settlement.zone.name, version: m.generator.run.version, level: progressionQA.homeLevel };
    });
    log({ boot }); assert.equal(boot.fatal, null); assert.equal(boot.version, 4); assert.equal(boot.level, 1);
    await shot('lastlight');
    const journey = await run(() => {
      const w = __game.world(), m = w.massRuntime, candidates = new Map(), span = m.config.terrain.addressSpan;
      for (let y = -3; y <= 3; y++) for (let x = 10; x <= 16; x++)
        for (const p of m.generator.placesInCell({ dimension: 'surface', cx: String(x), cy: String(y) })) {
          const content = m.config.content.find(c => c.id === p.content);
          if (!content?.site) continue;
          const pos = { x: Number(p.center.cx) * span + p.center.x, y: Number(p.center.cy) * span + p.center.y };
          if (m.settlement.reserves(pos.x, pos.y, p.radius)) continue;
          const population = m.populationFor(p);
          if (population.level >= 5) candidates.set(p.id, { p, pos, level: population.level, name: content.site.name });
        }
      const site = [...candidates.values()].sort((a, b) => Math.hypot(a.pos.x, a.pos.y) - Math.hypot(b.pos.x, b.pos.y))[0];
      if (!site) throw Error('No eligible distant native site');
      progressionQA.site = site;
      w.player.pos = { ...site.pos }; m.update(w, true);
      for (const a of w.actors) if (a !== w.player) a.passive = true;
      const cache = w.chests.find(c => c.rewardSource === JSON.stringify([site.p.id, 'cache']));
      if (!cache) throw Error('Distant native cache was not seated');
      w.player.pos = m.walk.snapToWalkable({ x: cache.pos.x, y: cache.pos.y + 85 }); __game.step(2);
      const text = [], ctx = __game.renderer.ctx, fill = ctx.fillText;
      ctx.fillText = function(value, ...rest) { text.push(String(value)); return fill.call(this, value, ...rest); };
      __game.step(1); ctx.fillText = fill;
      const natives = m.snapshot(w).enemies.map(e => [e.id, e.monster, e.level]);
      progressionQA.natives = natives;
      return { fatal: __game.crash().fatal, name: site.name, center: site.pos, country: m.levelAt(w.player.pos),
        siteLevel: site.level, cacheLevel: cache.rewardLevel, natives, hud: text.filter(t => t.includes('Country Lv')) };
    });
    log({ journey }); assert.equal(journey.fatal, null); assert.ok(journey.siteLevel >= 5);
    assert.equal(journey.cacheLevel, journey.siteLevel); assert.ok(journey.hud.length);
    assert.ok(journey.natives.some(row => row[2] >= 5)); await shot('distant-site');
    const map = await run(async () => {
      __game.ui.toggleMap(); __game.step(1);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      return document.getElementById('world-map').textContent;
    });
    log({ map }); assert.ok(map.includes(journey.name + ' · Lv ' + journey.siteLevel)); await shot('survey');
    const checkpoint = await run(async () => {
      __game.ui.hideAll(); const w = __game.world(), m = w.massRuntime, s = progressionQA.site;
      w.player.level = 60; w.player.pos = { ...progressionQA.home }; m.update(w, true);
      if (m.populationFor(s.p).level !== s.level) throw Error('Hero level or travel changed encounter difficulty');
      const cache = w.chests.find(c => c.rewardSource === JSON.stringify([s.p.id, 'cache']));
      w.player.pos = { ...cache.pos }; cache.lockTime = 0; __game.step(2);
      __game.save(); await new Promise(r => setTimeout(r, 250));
      return { seed: m.generator.run.seed, opened: cache.opened, reward: cache.rewardLevel, source: cache.rewardSource,
        natives: m.snapshot(w).enemies.map(e => [e.id, e.monster, e.level]).sort() };
    });
    assert.ok(checkpoint.opened);
    await win.loadURL(url);
    const resumed = await run(async source => {
      for (let i = 0; i < 80 && !document.querySelector('#sm-continue:not([disabled])'); i++) await new Promise(r => setTimeout(r, 100));
      document.querySelector('#sm-continue:not([disabled])')?.click();
      for (let i = 0; i < 80 && !__game.world().massRuntime; i++) await new Promise(r => setTimeout(r, 100));
      const w = __game.world(), m = w.massRuntime; w.player.invulnerable = true;
      const cache = w.chests.find(c => c.rewardSource === source);
      return { fatal: __game.crash().fatal, seed: m.generator.run.seed, opened: cache?.opened, reward: cache?.rewardLevel,
        natives: m.snapshot(w).enemies.map(e => [e.id, e.monster, e.level]).sort() };
    }, checkpoint.source);
    log({ checkpoint, resumed }); assert.equal(resumed.fatal, null); assert.equal(resumed.seed, checkpoint.seed);
    assert.equal(resumed.reward, checkpoint.reward); assert.ok(resumed.opened);
    assert.deepEqual(resumed.natives, checkpoint.natives);
    await shot('continued');
    log('PASS default geographic difficulty, native encounter rosters, HUD/map levels, fixed cache rewards and browser Continue');
  } catch (error) { log(error.stack ?? String(error)); process.exitCode = 1; }
  finally { clearTimeout(timeout); win.destroy(); server.close(); app.exit(process.exitCode || 0); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });

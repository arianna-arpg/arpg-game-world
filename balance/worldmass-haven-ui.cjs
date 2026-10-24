// Scoped preview build required. Disposable real client; never attaches to a user's tab.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logFile = path.join(dir, 'worldmass-haven-ui.log'); fs.writeFileSync(logFile, 'START\n');
const log = value => fs.appendFileSync(logFile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'haven-profile-' + process.pid));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 300000);
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
    await run(async () => { __game.step(3); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
    fs.writeFileSync(path.join(dir, 'worldmass-haven-' + name + '.png'), (await win.webContents.capturePage()).toPNG());
  };
  try {
    await win.loadURL(url);
    const boot = await run(() => {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      __game.devStartRun('warrior'); __game.ui.hideAll();
      const w = __game.world(); w.startWorldMass(451); w.player.invulnerable = true;
      const mass = w.massRuntime, town = mass.settlement;
      window.havenQA = { hero: w.player, skills: [...w.player.skills], seed: mass.generator.run.seed, loads: 0 };
      const load = w.loadZone;
      w.loadZone = function(...args) { havenQA.loads++; return load.apply(this, args); };
      w.actors.forEach(a => { if (a.team === 'enemy') a.passive = true; });
      __game.step(3);
      return { fatal: __game.crash().fatal, town: town?.zone.name, spawn: w.player.pos, structures: w.structures.length,
        cell: w.walk.cellSize, doors: w.doodads.filter(d => d.door).length };
    });
    log(boot); assert.equal(boot.fatal, null); assert.equal(boot.town, 'Lastlight'); assert.ok(boot.doors >= 2);
    await shot('bedside');

    const door = await run(() => {
      const w = __game.world(), d = w.doodads.find(d => d.door?.id.startsWith('waking_house#'));
      w.setDoorState(d.door.id, 'open', { silent: true });
      w.player.pos = { x: 700, y: 520 }; __game.step(3);
      return { id: d.door.id, open: d.door.open, walk: w.walk.isWalkable(d.pos.x, d.pos.y) };
    });
    assert.ok(door.open && door.walk); await shot('lastlight');
    for (const [name, dx, startX, target] of [['walk-out', -1, 70, -100], ['walk-in', 1, -100, 20]]) {
      const crossed = await run((dx, startX) => {
        const w = __game.world();
        w.player.pos = { x: startX, y: 500 }; w.player.tier = 0; __game.ui.hideAll();
        __game.devInput(() => ({ dx, dy: 0, aim: { x: 700, y: 500 }, held: [], edge: [] }));
        const times = [];
        for (let i = 0; i < 100; i++) { const t = performance.now(); __game.step(1); times.push(performance.now() - t); }
        __game.devInput(null);
        times.sort((a, b) => a - b);
        return { fatal: __game.crash().fatal, pos: w.player.pos, loads: havenQA.loads,
          sameHero: w.player === havenQA.hero, sameSkills: havenQA.skills.every((s, i) => w.player.skills[i] === s),
          safe: w.isSafeAt(w.player.pos), median: times[50], p95: times[95], max: times[99] };
      }, dx, startX);
      log({ name, ...crossed }); assert.equal(crossed.fatal, null); assert.equal(crossed.loads, 0);
      assert.ok(crossed.sameHero && crossed.sameSkills);
      assert.ok(dx < 0 ? crossed.pos.x < target : crossed.pos.x > target, 'real input must cross the town border');
      await shot(name);
    }
    const font = await run(() => {
      const w = __game.world(), f = w.fonts[0];
      w.player.pos = { ...f.pos }; w.player.tier = f.tier || 0; __game.ui.hideAll(); __game.step(2);
      __game.ui.showFont(); __game.step(1);
      return { near: !!w.nearFont(), open: __game.ui.fontOpen, passives: !!document.querySelector('[data-fontpassives]') };
    });
    log({ font }); assert.ok(font.near && font.open && font.passives); await shot('font');
    const inn = await run(() => {
      __game.ui.hideAll(); const w = __game.world();
      const resident = w.actors.find(a => a.team === 'player' && a !== w.player && a.tier === 1);
      if (!resident) throw Error('No native upstairs resident');
      w.landPartyAt(resident.pos, { tier: 1 }); __game.step(2);
      return { tier: w.player.tier, walk: w.pathField(1).isWalkable(w.player.pos.x, w.player.pos.y), pos: w.player.pos };
    });
    log({ inn }); assert.equal(inn.tier, 1); assert.ok(inn.walk); await shot('inn-upstairs');
    const saved = await run(async () => {
      const w = __game.world(); __game.save(); await new Promise(r => setTimeout(r, 250));
      return { seed: w.massRuntime.generator.run.seed, tier: w.player.tier, pos: { ...w.player.pos } };
    });
    await win.loadURL(url);
    const resumed = await run(async doorId => {
      for (let i = 0; i < 80 && !document.querySelector('#sm-continue:not([disabled])'); i++) await new Promise(r => setTimeout(r, 100));
      document.querySelector('#sm-continue:not([disabled])')?.click();
      for (let i = 0; i < 80 && !__game.world().massRuntime; i++) await new Promise(r => setTimeout(r, 100));
      const w = __game.world(); w.player.invulnerable = true;
      return { fatal: __game.crash().fatal, town: w.massRuntime?.settlement?.zone.name,
        seed: w.massRuntime?.generator.run.seed, tier: w.player.tier, pos: w.player.pos,
        door: w.doodads.find(d => d.door?.id === doorId)?.door.open };
    }, door.id);
    log({ saved, resumed }); assert.equal(resumed.fatal, null); assert.equal(resumed.town, 'Lastlight');
    assert.equal(resumed.seed, saved.seed); assert.equal(resumed.tier, saved.tier); assert.ok(resumed.door);
    assert.ok(Math.hypot(resumed.pos.x - saved.pos.x, resumed.pos.y - saved.pos.y) < 40);
    await shot('continued-upstairs');
    await run(() => { __game.ui.hideAll(); __game.ui.toggleMap(); __game.step(1); });
    await shot('map');
    log('PASS: real-input continuous crossings, native Font and upstairs interiors, door and floor preservation through Continue');
  } catch (error) { log(error.stack ?? String(error)); process.exitCode = 1; }
  finally { clearTimeout(timeout); win.destroy(); server.close(); app.exit(process.exitCode || 0); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });

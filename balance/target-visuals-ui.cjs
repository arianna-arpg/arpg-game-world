const { installVisualHarnessHold } = require('./skill-visual-harness.cjs');
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports', 'skill-visuals');
const catalog = JSON.parse(fs.readFileSync(path.join(dir, 'targets.json'), 'utf8'));
const rows = [...catalog.tethers.map(s => ({ ...s, family: 'tether' })),
  ...catalog.targets.map(s => ({ ...s, family: 'target' })), ...catalog.rites.map(s => ({ ...s, family: 'rite' }))];
app.setPath('userData', path.join(dir, 'target-profile-' + process.pid)); app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timer = setTimeout(() => app.exit(1), 180000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'target-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1440, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', e => { if (e.level === 'error') errors.push(e.message); });
  const run = async fn => {
    const r = await win.webContents.executeJavaScript('(async()=>{try{return{value:await (' + fn.toString() + ')()}}catch(e){return{error:e.stack??String(e)}}})()');
    if (r.error) throw Error(r.error); return r.value;
  };
  try {
    await win.loadURL(server.url); await win.webContents.executeJavaScript('Promise.resolve(__game.hydrated())'); await installVisualHarnessHold(win);
    await win.webContents.executeJavaScript('window.targetRows=' + JSON.stringify(rows));
    await run(() => {
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('necromancer'); __game.ui.hideAll(); __game.hold(true);
      window.paintTarget = (ctx, row, phase, color = row.color, extra = {}) => {
        const r = __game.renderer, old = r.ctx; r.ctx = ctx;
        try {
          if (row.family === 'tether') r.drawTethers({ time: phase * 2, tethers: [], remoteSkillTethers: [{
            ax: 28, ay: 80, bx: 192, by: 80, width: 10, color, voice: row.id, age: phase, fade: 1, ...extra }] });
          else r.drawFlash({ pos: { x: 110, y: 80 }, radius: 40, color, life: .4 * (1 - phase), maxLife: .4,
            fx: (row.family === 'rite' ? 'skillRite:' : row.delivery?.splash ? 'skillTargetSplash:' : 'skillTarget:') + row.id, ...extra });
        } finally { r.ctx = old; }
      };
    });
    const results = await run(() => {
      const c = document.createElement('canvas'); c.width = 240; c.height = 180;
      const ctx = c.getContext('2d', { willReadFrequently: true }), signatures = new Set(); let checks = 0;
      const scan = outside => { const d = ctx.getImageData(0, 0, c.width, c.height).data; let ink = 0, leaks = 0;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 5) { ink++; if (outside(x + .5, y + .5)) leaks++; }
        if (!ink || leaks) throw Error(JSON.stringify({ ink, leaks })); checks++; };
      for (const row of targetRows.filter(s => s.family !== 'tether')) {
        ctx.clearRect(0, 0, 240, 180); paintTarget(ctx, row, .45, '#c5d1d8');
        scan((x, y) => Math.hypot(x - 110, y - 80) > 41);
        if (row.family === 'target') { const key = c.toDataURL(); if (signatures.has(key)) throw Error('Duplicate target pixels: ' + row.id); signatures.add(key); }
      }
      for (const row of targetRows.filter(s => s.family === 'tether')) for (const width of [2, 8, 16]) for (const angle of [0, .6, 2.8]) {
        const ax = 110 - Math.cos(angle) * 70, ay = 90 - Math.sin(angle) * 70, bx = 110 + Math.cos(angle) * 70, by = 90 + Math.sin(angle) * 70;
        ctx.clearRect(0, 0, 240, 180); paintTarget(ctx, row, .4, '#c5d1d8', { ax, ay, bx, by, width });
        scan((x, y) => { const q = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (140 * 140)));
          return Math.hypot(x - ax - q * (bx - ax), y - ay - q * (by - ay)) > width + 1; });
      }
      for (const family of ['tether', 'rite']) {
        const identities = new Set();
        for (const row of targetRows.filter(s => s.family === family)) {
          ctx.clearRect(0, 0, 240, 180); paintTarget(ctx, row, .4, '#c5d1d8');
          const pixels = c.toDataURL(); if (identities.has(pixels)) throw Error('Duplicate ' + family + ' pixels: ' + row.id);
          identities.add(pixels); checks++;
        }
      }
      const r = __game.renderer, old = r.ctx; r.ctx = ctx; ctx.clearRect(0, 0, 240, 180);
      const band = { ax: 28, ay: 80, bx: 192, by: 80, width: 10, color: '#ccc', voice: 'lifeline', age: 1, fade: 1, fromTier: 1, toTier: 0 };
      const world = { player: { tier: 0 }, zone: { tiers: { exposure: 'covered' } }, tethers: [], remoteSkillTethers: [band], time: 1 };
      r.drawTethers(world); if (ctx.getImageData(0, 0, 240, 180).data.some(n => n)) throw Error('Covered source leaked');
      band.fromTier = 0; band.toTier = 1; r.drawTethers(world); if (ctx.getImageData(0, 0, 240, 180).data.some(n => n)) throw Error('Covered recipient leaked');
      band.toTier = 0; r.drawTethers(world); scan(() => false); r.ctx = old; checks += 2;
      return { checks, frames: targetRows.map(row => ({ ...row, sheets: [false, true].map(mono => {
        const canvas = document.createElement('canvas'); canvas.width = 220 * 16; canvas.height = 160; const cc = canvas.getContext('2d');
        for (let i = 0; i < 16; i++) { cc.save(); cc.translate(i * 220, 0); paintTarget(cc, row, i / 16, mono ? '#c5d1d8' : row.color); cc.restore(); }
        return canvas.toDataURL();
      }) })) };
    });
    fs.writeFileSync(path.join(dir, 'target-pixels.json'), JSON.stringify({ checks: results.checks, identities: results.frames.length }));
    const html = fs.readFileSync(path.join(__dirname, 'target-study.html'), 'utf8').replace('/*__DATA__*/[]', JSON.stringify(results.frames));
    fs.writeFileSync(path.join(dir, 'target-study.html'), html);
    await run(() => {
      const w = __game.world(), p = w.player;
      w.zoneMap.qa_targets = { id: 'qa_targets', name: 'Proving Ground', level: 1, size: { w: 1600, h: 1200 }, seed: 9283,
        theme: { floor: '#303a37', grid: '#35433e', border: '#44544c', obstacle: '#444', obstacleEdge: '#555', accent: '#8cbba5' }, layout: [], objective: { kind: 'safe' }, exits: [], map: { x: 9000, y: 9000 } };
      w.loadZone('qa_targets'); p.pos = { x: 800, y: 600 }; w.actors = [p]; w.doodads = []; w.markDoodadsChanged();
      __game.hold(false); __game.step(90); w.update = () => {};
      window.spawnTarget = (x, y, ally = false) => { const a = w.createMonster('skeleton_warrior', 1, ally ? 'player' : 'enemy', ally ? p : undefined);
        a.pos = { x, y }; a.brain = undefined; a.anchored = true; a.spawnedAt = -1; a.sheet.setSource('qa', [{ stat: 'life', kind: 'override', value: 1000 }]); a.fillResources(); w.actors.push(a); return a; };
    });
    for (const id of ['sanguine_leech', 'bone_offering', 'healing_stream']) {
      await win.webContents.executeJavaScript('window.targetCast=' + JSON.stringify(id));
      const facts = await run(() => {
        const w = __game.world(), p = w.player; __game.devGrantSkill(targetCast, 1, 2); const inst = p.skills[2];
        inst.def = { ...inst.def, requirements: undefined, useTime: 0, castMode: 'cast' };
        w.actors = [p]; w.tethers = []; w.flashes = []; w.corpses = []; p.casting = null; p.useLock = 0; p.cooldowns.clear(); p.fillResources();
        const ally = targetCast !== 'sanguine_leech'; const a = spawnTarget(910, 580, ally), b = spawnTarget(990, 650, ally); a.life *= .3; b.life *= .3;
        if (targetCast === 'bone_offering') w.corpses = [{ pos: { x: 940, y: 530 }, defId: 'zombie', maxLife: 100, level: 1, remaining: 60, tier: 0 }];
        const at = w.corpses[0]?.pos ?? a.pos;
        if (!w.useSkill(p, inst, at)) throw Error('Live cast refused ' + targetCast);
        if (targetCast === 'healing_stream') w.addTether(p, a, { visual: 'lifeline', link: 'target', affects: 'allies', healPerSec: 8, width: 16, duration: 8 }, inst, p);
        for (const f of w.flashes) f.life = f.maxLife * .6; for (const t of w.tethers) t.visualAge = .4;
        __game.step(1); return { marks: w.flashes.filter(f => f.fx?.startsWith('skillTarget') || f.fx?.startsWith('skillRite')).length, bands: w.tethers.length, fatal: __game.crash().fatal };
      });
      assert.equal(facts.fatal, null); assert(facts.marks > 0, id); if (id === 'bone_offering') assert(facts.marks >= 3);
      await new Promise(r => setTimeout(r, 150)); fs.writeFileSync(path.join(dir, 'target-live-' + id + '.png'), (await win.webContents.capturePage()).toPNG());
    }
    const peer = await run(() => { __game.hold(true); const snap = __game.snapshot(); __game.applySnap(snap); __game.renderer.render(__game.world());
      return { hostBands: __game.world().tethers.length, paintedBands: __game.world().remoteSkillTethers.length, fatal: __game.crash().fatal }; });
    assert.deepEqual(peer, { hostBands: 0, paintedBands: 1, fatal: null }); assert.deepEqual(errors, []);
    await win.loadFile(path.join(dir, 'target-study.html')); await new Promise(r => setTimeout(r, 350));
    fs.writeFileSync(path.join(dir, 'target-overview.png'), (await win.webContents.capturePage()).toPNG());
    const controls = await run(() => { document.querySelector('#mono').click(); document.querySelector('#pause').click(); document.querySelector('#names').click(); document.querySelector('#bright').click();
      const select = document.querySelector('#family'); select.value = 'rite'; select.dispatchEvent(new Event('change'));
      return { count: document.querySelector('#count').textContent, pause: document.querySelector('#pause').textContent, hidden: document.body.classList.contains('hide-names') }; });
    assert.deepEqual(controls, { count: '7 offerings & rites', pause: 'Play', hidden: true });
    await new Promise(r => setTimeout(r, 150)); fs.writeFileSync(path.join(dir, 'target-rites-monochrome.png'), (await win.webContents.capturePage()).toPNG());
    await run(() => { document.querySelector('#names').click(); document.querySelector('#bright').click();
      const select = document.querySelector('#family'); select.value = 'target'; select.dispatchEvent(new Event('change')); });
    await new Promise(r => setTimeout(r, 150)); fs.writeFileSync(path.join(dir, 'target-marks-monochrome.png'), (await win.webContents.capturePage()).toPNG());
    console.log(`PASS ${results.checks} production pixel checks, 3 live casts, co-op and ${results.frames.length} animated study entries`);
  } finally { clearTimeout(timer); win.destroy(); server.server.close(); app.quit(); }
}).catch(e => { console.error(e); app.exit(1); });

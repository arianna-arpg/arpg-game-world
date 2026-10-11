const { installVisualHarnessHold } = require('./skill-visual-harness.cjs');
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports', 'skill-visuals');
const data = JSON.parse(fs.readFileSync(path.join(dir, 'self.json'), 'utf8'));
app.setPath('userData', path.join(dir, 'self-profile-' + process.pid)); app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timer = setTimeout(() => app.exit(1), 180000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'self-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1440, height: 1100, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = []; win.webContents.on('console-message', e => { if (e.level === 'error') errors.push(e.message); });
  const run = async fn => {
    const r = await win.webContents.executeJavaScript('(async()=>{try{return{value:await (' + fn.toString() + ')()}}catch(e){return{error:e.stack??String(e)}}})()');
    if (r.error) throw Error(r.error); return r.value;
  };
  try {
    await win.loadURL(server.url); await win.webContents.executeJavaScript('Promise.resolve(__game.hydrated())'); await installVisualHarnessHold(win);
    await win.webContents.executeJavaScript('window.selfRows=' + JSON.stringify(data.rows));
    await run(() => {
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('warrior'); __game.ui.hideAll(); __game.hold(true);
      window.selfPaint = (ctx, id, phase, life, color, extra = {}) => {
        const r = __game.renderer, old = r.ctx; r.ctx = ctx;
        try { r.drawFlash({ pos: { x: 180, y: 80 }, radius: 65, life, maxLife: 1, color, fx: 'skillSelf:' + phase + ':' + id, ...extra }); }
        finally { r.ctx = old; }
      };
    });
    const output = await run(() => {
      const c = document.createElement('canvas'); c.width = 360; c.height = 160;
      const ctx = c.getContext('2d', { willReadFrequently: true }); let checks = 0;
      for (const phase of ['release', 'prepare']) {
        const hashes = new Map();
        for (const row of selfRows) {
          ctx.clearRect(0, 0, 360, 160); selfPaint(ctx, row.id, phase, .55, '#c7d3d9');
          const pixels = ctx.getImageData(0, 0, 360, 160).data; let ink = 0;
          for (let y = 0; y < 160; y++) for (let x = 0; x < 360; x++) if (pixels[(y * 360 + x) * 4 + 3] > 5) {
            ink++; if (Math.hypot(x + .5 - 180, y + .5 - 80) > 66) throw Error('Escaped footprint: ' + row.id);
          }
          if (ink < 50) throw Error('Invisible: ' + row.id);
          const key = c.toDataURL(); if (hashes.has(key)) throw Error('Duplicate silhouette: ' + row.id + '/' + hashes.get(key)); hashes.set(key, row.id); checks++;
        }
      }
      for (const shape of [0, 1, 2, 3, 4, 5]) {
        ctx.clearRect(0, 0, 360, 160); selfPaint(ctx, 'cold_snap', 'burst', .5, '#c7d3d9', { radius: 60, shape, facing: .8, arcRad: .7, edgeFrac: .4 });
        const mask = document.createElement('canvas'); mask.width = 360; mask.height = 160;
        const m = mask.getContext('2d'), r = __game.renderer, old = r.ctx; r.ctx = m;
        try { m.beginPath(); r.traceAoe(180, 80, 60, shape, .8, .7); m.fill(); } finally { r.ctx = old; }
        const p = ctx.getImageData(0, 0, 360, 160).data, q = m.getImageData(0, 0, 360, 160).data; let ink = 0;
        for (let y = 0; y < 160; y++) for (let x = 0; x < 360; x++) if (p[(y * 360 + x) * 4 + 3] > 5) {
          ink++; if (!q[(y * 360 + x) * 4 + 3] || Math.hypot(x + .5 - 180, y + .5 - 80) < 23) throw Error('False blast area ' + shape);
        }
        if (!ink) throw Error('Empty blast ' + shape); checks++;
      }
      return { checks, rows: selfRows.map(row => {
        const guard = row.mode === 'guard', instant = !row.prepares;
        const blast = ['cold_snap', 'detonation', 'last_rite', 'command_detonate', 'shatter_totem'].includes(row.id);
        const note = guard ? 'Held stance · readiness follows the real guard' : row.mode === 'channel' ? (row.prepares ? 'Held charge → release' : 'Repeated delivery · no completion gauge') : instant ? 'Instant activation · no invented wind-up' : 'Gather → release · cast clock in play';
        const sheets = {};
        for (const mode of ['sequence', 'release']) sheets[mode] = [false, true].map(mono => {
          const canvas = document.createElement('canvas'); canvas.width = 360 * 24; canvas.height = 160;
          const cc = canvas.getContext('2d');
          for (let i = 0; i < 24; i++) {
            cc.save(); cc.translate(i * 360, 0); cc.beginPath(); cc.rect(0, 0, 360, 160); cc.clip();
            const charge = mode === 'sequence' && !instant && i < 12;
            const phase = guard ? 'prepare' : charge ? 'prepare' : blast ? 'burst' : 'release';
            const progress = guard ? Math.min(.995, i / 12) : charge ? i / 12 : (i - (mode === 'sequence' && !instant ? 12 : 0)) / (mode === 'sequence' && !instant ? 12 : 24);
            const color = mono ? '#c7d3d9' : row.color;
            selfPaint(cc, row.id, phase, Math.max(.005, 1 - progress), color,
              !charge && row.rite ? { fx: 'skillRite:' + row.id } : {});
            cc.restore();
          }
          return canvas.toDataURL();
        });
        return { ...row, note, sheets };
      }) };
    });
    fs.writeFileSync(path.join(dir, 'self-pixels.json'), JSON.stringify({ checks: output.checks, identities: output.rows.length }));
    fs.writeFileSync(path.join(dir, 'self-study.html'), fs.readFileSync(path.join(__dirname, 'self-study.html'), 'utf8').replace('/*__DATA__*/[]', JSON.stringify(output.rows)));
    await run(() => {
      const w = __game.world(), p = w.player;
      w.zoneMap.qa_self = { id: 'qa_self', name: 'Proving Ground', level: 1, size: { w: 1800, h: 1400 }, seed: 9283,
        theme: { floor: '#303a37', grid: '#35433e', border: '#44544c', obstacle: '#444', obstacleEdge: '#555', accent: '#8cbba5' }, layout: [], objective: { kind: 'safe' }, exits: [], map: { x: 9000, y: 9000 } };
      w.loadZone('qa_self'); p.pos = { x: 700, y: 600 }; w.actors = [p]; w.doodads = []; w.markDoodadsChanged();
      __game.hold(false); __game.step(90); window.selfUpdate = w.update.bind(w); w.update = () => {};
    });
    for (const [id, frames] of [['war_cry', 8], ['stone_skin', 50], ['shield_up', 75], ['surgewind', 60], ['mark', 1], ['cold_snap', 45], ['iron_ward', 40], ['detonation', 40]]) {
      await win.webContents.executeJavaScript('window.selfCase=' + JSON.stringify({ id, frames }));
      const facts = await run(() => {
        const w = __game.world(), p = w.player; __game.devGrantSkill(selfCase.id, 1, 2); const inst = p.skills[2];
        inst.def = { ...inst.def, requirements: undefined };
        p.pos = { x: 700, y: 600 }; p.casting = null; p.cooldowns.clear(); p.useLock = 0; p.statuses = []; p.fillResources();
        w.actors = [p]; w.flashes = []; w.zones = []; w.projectiles = [];
        if (inst.def.pool) p.pools.set(inst.def.pool.id, 200);
        if (!w.useSkill(p, inst, { x: 850, y: 600 })) throw Error('Refused ' + selfCase.id);
        for (let i = 0; i < selfCase.frames; i++) selfUpdate(1 / 60);
        if (p.ironWard) p.ironWard.stored = p.ironWard.cap * .65;
        __game.step(1); return { held: !!p.casting, marks: w.flashes.filter(f => f.fx?.startsWith('skillSelf:')).length, fatal: __game.crash().fatal };
      });
      assert(facts.held || facts.marks > 0, id); assert.equal(facts.fatal, null);
      await new Promise(r => setTimeout(r, 80)); fs.writeFileSync(path.join(dir, 'self-live-' + id + '.png'), (await win.webContents.capturePage()).toPNG());
    }
    const peer = await run(() => {
      __game.hold(true); const snap = __game.snapshot(); __game.applySnap(snap); __game.renderer.render(__game.world());
      return { marks: __game.world().flashes.filter(f => f.fx?.startsWith('skillSelf:')).length, fatal: __game.crash().fatal };
    });
    assert(peer.marks > 0); assert.equal(peer.fatal, null); assert.deepEqual(errors, []);
    await win.loadFile(path.join(dir, 'self-study.html')); await new Promise(r => setTimeout(r, 450));
    await run(() => { time = 1.55; paused = true; paint(); }); await new Promise(r => setTimeout(r, 100));
    fs.writeFileSync(path.join(dir, 'self-overview.png'), (await win.webContents.capturePage()).toPNG());
    const controls = await run(() => {
      paused = false; const family = document.querySelector('#family'); family.value = 'detonations'; family.dispatchEvent(new Event('change'));
      document.querySelector('#mono').click(); document.querySelector('#names').click(); document.querySelector('#bright').click(); document.querySelector('#speed').click();
      time = 1.6; paused = true; paint();
      return { count: document.querySelector('#count').textContent, speed: document.querySelector('#speed').textContent, hidden: document.body.classList.contains('hide-names') };
    });
    assert.deepEqual(controls, { count: '8 skills', speed: 'Normal speed', hidden: true });
    await new Promise(r => setTimeout(r, 100)); fs.writeFileSync(path.join(dir, 'self-monochrome.png'), (await win.webContents.capturePage()).toPNG());
    console.log(`PASS ${output.checks} pixel checks, 8 live casts, co-op and ${output.rows.length} animated identities`);
  } finally { clearTimeout(timer); win.destroy(); server.server.close(); app.quit(); }
}).catch(e => { console.error(e); app.exit(1); });

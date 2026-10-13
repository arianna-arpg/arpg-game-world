const { installVisualHarnessHold } = require('./skill-visual-harness.cjs');
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports', 'skill-visuals');
const data = JSON.parse(fs.readFileSync(path.join(dir, 'movement.json'), 'utf8'));
app.setPath('userData', path.join(dir, 'movement-profile-' + process.pid)); app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timer = setTimeout(() => app.exit(1), 180000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'movement-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1440, height: 1100, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = []; win.webContents.on('console-message', e => { if (e.level === 'error') errors.push(e.message); });
  const run = async fn => {
    const r = await win.webContents.executeJavaScript('(async()=>{try{return{value:await (' + fn.toString() + ')()}}catch(e){return{error:e.stack??String(e)}}})()');
    if (r.error) throw Error(r.error); return r.value;
  };
  try {
    await win.loadURL(server.url); await win.webContents.executeJavaScript('Promise.resolve(__game.hydrated())'); await installVisualHarnessHold(win);
    await win.webContents.executeJavaScript('window.moveRows=' + JSON.stringify(data.rows));
    await run(() => {
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('warrior'); __game.ui.hideAll(); __game.hold(true);
      window.movePaint = (ctx, f) => { const r = __game.renderer, old = r.ctx; r.ctx = ctx; try { r.drawFlash(f); } finally { r.ctx = old; } };
      window.moveMoment = (ctx, row, phase, life, color = row.color, extra = {}) => movePaint(ctx,
        { pos: { x: 220, y: 90 }, radius: 72, facing: 0, life, maxLife: 1, color, fx: 'skillMove:' + phase + ':' + row.id, ...extra });
    });
    const output = await run(() => {
      const c = document.createElement('canvas'); c.width = 440; c.height = 180;
      const ctx = c.getContext('2d', { willReadFrequently: true }); let checks = 0;
      const scan = outside => {
        const d = ctx.getImageData(0, 0, 440, 180).data; let ink = 0, leaks = 0;
        for (let y = 0; y < 180; y++) for (let x = 0; x < 440; x++) if (d[(y * 440 + x) * 4 + 3] > 5) { ink++; if (outside(x + .5, y + .5)) leaks++; }
        if (!ink || leaks) throw Error(JSON.stringify({ ink, leaks })); checks++;
      };
      for (const phase of ['depart', 'arrive']) {
        const hashes = new Map();
        for (const row of moveRows) {
          ctx.clearRect(0, 0, 440, 180); moveMoment(ctx, row, phase, .55, '#c5d1d8');
          const key = c.toDataURL(); if (hashes.has(key)) throw Error('Duplicate ' + phase + ': ' + row.id + '/' + hashes.get(key)); hashes.set(key, row.id);
          try { scan((x, y) => Math.hypot(x - 220, y - 90) > 73); } catch (e) { throw Error(row.id + '/' + phase + ': ' + e.message); }
        }
      }
      for (const row of moveRows.filter(r => r.family === 'leap')) for (const shape of [0, 1, 2, 3, 4, 5]) {
        const pos = { x: 220, y: 90 }, radius = 62, facing = .8, arcRad = .7;
        ctx.clearRect(0, 0, 440, 180); moveMoment(ctx, row, 'impact', .55, '#c5d1d8', { pos, radius, shape, facing, arcRad, edgeFrac: .4 });
        const mask = document.createElement('canvas'); mask.width = 440; mask.height = 180;
        const m = mask.getContext('2d'), renderer = __game.renderer, old = renderer.ctx; renderer.ctx = m;
        try { m.beginPath(); renderer.traceAoe(pos.x, pos.y, radius, shape, facing, arcRad); m.fill(); } finally { renderer.ctx = old; }
        const md = m.getImageData(0, 0, 440, 180).data;
        scan((x, y) => Math.hypot(x - 220, y - 90) < radius * .4 - 1 || md[(Math.floor(y) * 440 + Math.floor(x)) * 4 + 3] === 0);
      }
      const distSeg = (x, y, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, q = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - a.x - q * dx, y - a.y - q * dy); };
      for (const row of moveRows.filter(r => r.family !== 'blink')) {
        const points = [{ x: 70, y: 80, at: .1 }, { x: 200, y: 80, at: .17 }, { x: 240, y: 135, at: .2 }];
        ctx.clearRect(0, 0, 440, 180); movePaint(ctx, { pos: points[2], radius: 16, color: '#c5d1d8', life: .8, maxLife: 1,
          movement: { skillId: row.id, clock: .2, progress: .5, points } });
        scan((x, y) => Math.min(distSeg(x, y, points[0], points[1]), distSeg(x, y, points[1], points[2])) > 17);
      }
      return { checks, rows: moveRows.map(row => {
        // Fit the measured journey, never its unfulfilled requested destination.
        const xs = row.frames.map(f => f.pos.x), ys = row.frames.map(f => f.pos.y);
        const minX = Math.min(...xs) - 85, maxX = Math.max(...xs) + 130;
        const minY = Math.min(...ys) - 100, maxY = Math.max(...ys) + 100;
        const scale = Math.min(1, 430 / (maxX - minX), 170 / (maxY - minY));
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
        // Independently check recorded wire coordinates before adding the body.
        ctx.clearRect(0, 0, 440, 180); ctx.save(); ctx.translate(220, 90); ctx.scale(scale, scale); ctx.translate(-cx, -cy);
        for (const frame of row.frames) for (const flash of frame.flashes) movePaint(ctx, { ...flash, pos: { x: flash.p[0], y: flash.p[1] } });
        ctx.restore(); scan(() => false);
        const sheets = {};
        for (const mode of ['travel', 'depart', 'arrive']) sheets[mode] = [false, true].map(mono => {
          const frames = mode === 'travel' ? 48 : 16, canvas = document.createElement('canvas'); canvas.width = 440 * frames; canvas.height = 180;
          const cc = canvas.getContext('2d');
          for (let i = 0; i < frames; i++) {
            cc.save(); cc.translate(i * 440, 0); cc.beginPath(); cc.rect(0, 0, 440, 180); cc.clip();
            if (mode === 'travel') {
              const f = row.frames[Math.min(row.frames.length - 1, Math.floor(i / frames * row.frames.length))];
              cc.translate(220, 90); cc.scale(scale, scale); cc.translate(-cx, -cy);
              for (const flash of f.flashes) movePaint(cc, { ...flash, pos: { x: flash.p[0], y: flash.p[1] }, color: mono ? '#c5d1d8' : flash.color });
              cc.beginPath(); cc.ellipse(f.pos.x, f.pos.y + 4, 13, 6, 0, 0, Math.PI * 2); cc.fillStyle = '#0b1015'; cc.fill();
              const radius = 10 * (f.leap === null ? 1 : 1 + .55 * Math.sin(Math.PI * f.leap));
              cc.beginPath(); cc.arc(f.pos.x, f.pos.y, radius, 0, Math.PI * 2); cc.fillStyle = '#c0c7c5'; cc.fill();
              cc.strokeStyle = '#26333a'; cc.lineWidth = 2; cc.stroke();
            } else moveMoment(cc, row, mode === 'arrive' && row.family === 'leap' ? 'impact' : mode, 1 - i / frames, mono ? '#c5d1d8' : row.color);
            cc.restore();
          }
          return canvas.toDataURL();
        });
        return { id: row.id, name: row.name, family: row.family, duration: row.duration, sheets };
      }) };
    });
    output.checks += output.rows.length; // recorded-journey masks ran while building the rows
    fs.writeFileSync(path.join(dir, 'movement-pixels.json'), JSON.stringify({ checks: output.checks, identities: output.rows.length }));
    fs.writeFileSync(path.join(dir, 'movement-study.html'), fs.readFileSync(path.join(__dirname, 'movement-study.html'), 'utf8').replace('/*__DATA__*/[]', JSON.stringify(output.rows)));
    await run(() => {
      const w = __game.world(), p = w.player;
      w.zoneMap.qa_movement = { id: 'qa_movement', name: 'Proving Ground', level: 1, size: { w: 1800, h: 1400 }, seed: 9283,
        theme: { floor: '#303a37', grid: '#35433e', border: '#44544c', obstacle: '#444', obstacleEdge: '#555', accent: '#8cbba5' }, layout: [], objective: { kind: 'safe' }, exits: [], map: { x: 9000, y: 9000 } };
      w.loadZone('qa_movement'); p.pos = { x: 700, y: 600 }; w.actors = [p]; w.doodads = []; w.markDoodadsChanged();
      __game.hold(false); __game.step(90); window.movementUpdate = w.update.bind(w); w.update = () => {};
    });
    for (const [id, frames] of [['charge', 18], ['surge', 5], ['shield_charge', 10], ['crushing_leap', 35], ['phoenix_dive', 32], ['teleport', 1], ['warp', 30], ['caged_comet', 35]]) {
      await win.webContents.executeJavaScript('window.moveCase=' + JSON.stringify({ id, frames }));
      const facts = await run(() => {
        const w = __game.world(), p = w.player; __game.devGrantSkill(moveCase.id, 1, 2); const inst = p.skills[2];
        inst.def = { ...inst.def, requirements: undefined, useTime: 0, castMode: 'cast' };
        p.pos = { x: 700, y: 600 }; p.casting = null; p.cooldowns.clear(); p.useLock = 0; p.dash = null; p.leap = undefined; p.caromRun = null; p.statuses = []; p.untargetable = false; p.fillResources();
        w.actors = [p]; w.flashes = []; w.zones = []; w.pendingBlinks = []; w.projectiles = [];
        if (!w.useSkill(p, inst, { x: 950, y: 600 })) throw Error('Refused ' + moveCase.id);
        for (let i = 0; i < moveCase.frames; i++) movementUpdate(1 / 60);
        __game.step(1); return { marks: w.flashes.filter(f => f.movement || f.fx?.startsWith('skillMove:')).length, fatal: __game.crash().fatal };
      });
      assert(facts.marks > 0, id); assert.equal(facts.fatal, null);
      await new Promise(r => setTimeout(r, 100)); fs.writeFileSync(path.join(dir, 'movement-live-' + id + '.png'), (await win.webContents.capturePage()).toPNG());
    }
    const peer = await run(() => {
      __game.hold(true); const snap = __game.snapshot(); __game.applySnap(snap); __game.renderer.render(__game.world());
      return { trails: __game.world().flashes.filter(f => f.movement).length, fatal: __game.crash().fatal };
    });
    assert(peer.trails > 0); assert.equal(peer.fatal, null); assert.deepEqual(errors, []);
    await win.loadFile(path.join(dir, 'movement-study.html')); await new Promise(r => setTimeout(r, 450));
    await run(() => { time = .16; paused = true; paint(); });
    fs.writeFileSync(path.join(dir, 'movement-overview.png'), (await win.webContents.capturePage()).toPNG());
    const controls = await run(() => {
      paused = false;
      const family = document.querySelector('#family'); family.value = 'blink'; family.dispatchEvent(new Event('change'));
      const mode = document.querySelector('#mode'); mode.value = 'arrive'; mode.dispatchEvent(new Event('change'));
      document.querySelector('#mono').click(); document.querySelector('#names').click(); document.querySelector('#bright').click(); document.querySelector('#speed').click();
      return { count: document.querySelector('#count').textContent, speed: document.querySelector('#speed').textContent, hidden: document.body.classList.contains('hide-names') };
    });
    assert.deepEqual(controls, { count: '9 movement skills', speed: 'Normal speed', hidden: true });
    await new Promise(r => setTimeout(r, 650)); await run(() => document.querySelector('#pause').click());
    fs.writeFileSync(path.join(dir, 'movement-monochrome.png'), (await win.webContents.capturePage()).toPNG());
    assert.equal(await run(() => document.querySelector('#pause').textContent), 'Play');
    console.log(`PASS ${output.checks} pixel checks, 8 live casts, co-op and ${output.rows.length} animated identities`);
  } finally { clearTimeout(timer); win.destroy(); server.server.close(); app.quit(); }
}).catch(e => { console.error(e); app.exit(1); });

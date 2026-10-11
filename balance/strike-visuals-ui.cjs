const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports', 'skill-visuals');
const data = JSON.parse(fs.readFileSync(path.join(dir, 'strikes.json'), 'utf8'));
const rows = [...data.lightning, ...data.strikes];
app.setPath('userData', path.join(dir, 'strike-profile-' + process.pid)); app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timer = setTimeout(() => app.exit(1), 180000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'strike-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1440, height: 1050, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = []; win.webContents.on('console-message', e => { if (e.level === 'error') errors.push(e.message); });
  const run = async fn => {
    const r = await win.webContents.executeJavaScript('(async()=>{try{return{value:await (' + fn.toString() + ')()}}catch(e){return{error:e.stack??String(e)}}})()');
    if (r.error) throw Error(r.error); return r.value;
  };
  try {
    await win.loadURL(server.url); await win.webContents.executeJavaScript('Promise.resolve(__game.hydrated())');
    await win.webContents.executeJavaScript('window.strikeRows=' + JSON.stringify(rows));
    await run(() => {
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('warrior'); __game.ui.hideAll(); __game.hold(true);
      window.paintStrike = (ctx, row, phase, color = row.color, extra = {}) => {
        const r = __game.renderer, old = r.ctx; r.ctx = ctx;
        try {
          if (row.family === 'lightning') {
            const f = row.frames[Math.min(row.frames.length - 1, Math.floor(phase * row.frames.length))];
            if (!f) return;
            ctx.save(); ctx.translate(25, 38); ctx.scale(.62, .62); ctx.translate(-700, -650);
            r.drawFlash({ pos: { x: 700, y: 700 }, radius: 7, color, life: f.life, maxLife: 1, lightning: f.trace }); ctx.restore();
          } else {
            const arc = row.delivery.arcDeg * Math.PI / 180;
            const band = row.delivery.shape === 'band';
            r.drawFlash({ pos: { x: band ? 108 : 54, y: 80 }, radius: band ? 50 : 90, color,
              life: 1 - phase, maxLife: 1, fx: row.fx, facing: 0, shape: band ? 5 : undefined,
              arc: band ? undefined : { facing: 0, arcRad: arc }, edgeFrac: row.delivery.edgeOnly, ...extra });
          }
        } finally { r.ctx = old; }
      };
    });
    const results = await run(() => {
      const c = document.createElement('canvas'); c.width = 260; c.height = 220;
      const ctx = c.getContext('2d', { willReadFrequently: true }), keys = new Map(); let checks = 0;
      const scan = outside => {
        const d = ctx.getImageData(0, 0, c.width, c.height).data; let ink = 0, leaks = 0;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 5) { ink++; if (outside(x + .5, y + .5)) leaks++; }
        if (!ink || leaks) throw Error(JSON.stringify({ ink, leaks })); checks++;
      };
      for (const row of strikeRows.filter(s => s.family !== 'lightning')) {
        ctx.clearRect(0, 0, 260, 220); paintStrike(ctx, row, .4, '#cad7de');
        const key = c.toDataURL(); if (keys.has(key)) throw Error('Duplicate pixels: ' + row.id + ' / ' + keys.get(key)); keys.set(key, row.id);
        const band = row.delivery.shape === 'band', arc = row.delivery.arcDeg * Math.PI / 180;
        try { scan((x, y) => {
          const dd = Math.hypot(x - 54, y - 80), over = Math.abs(Math.atan2(y - 80, x - 54)) - arc / 2;
          return band ? Math.abs(x - 108) > 50 * .4 + 1 || Math.abs(y - 80) > 51
            : dd > 91 || over > 0 && dd * Math.sin(Math.min(Math.PI / 2, over)) > 1.5
              || !!row.delivery.edgeOnly && dd < 90 * row.delivery.edgeOnly - 1;
        }); } catch (e) { throw Error(row.id + ': ' + e.message); }
      }
      // A separately traced mask verifies all sigil/crescent/sector/band boundaries
      // and circular safe centers, including custom arc widths on delayed repeats.
      for (const id of ['cleave', 'surgical_strike', 'flame_wave', 'focusing_ray']) for (const shape of [0, 1, 2, 3, 4, 5]) for (const facing of [0, .8]) {
        const row = strikeRows.find(s => s.id === id), pos = { x: 130, y: 110 }, radius = 65, arcRad = .65;
        ctx.clearRect(0, 0, 260, 220); paintStrike(ctx, row, .4, '#bbb', { pos, radius, shape, facing, arc: undefined, arcRad, edgeFrac: .55 });
        const mask = document.createElement('canvas'); mask.width = 260; mask.height = 220; const m = mask.getContext('2d');
        const r = __game.renderer, old = r.ctx; r.ctx = m;
        try { m.beginPath(); r.traceAoe(pos.x, pos.y, radius, shape, facing, arcRad); m.fill(); } finally { r.ctx = old; }
        const md = m.getImageData(0, 0, 260, 220).data;
        scan((x, y) => Math.hypot(x - 130, y - 110) < radius * .55 - 1 || md[(Math.floor(y) * 260 + Math.floor(x)) * 4 + 3] === 0);
      }
      const lightning = strikeRows.find(s => s.id === 'chain_lightning');
      const fixture = { skillId: lightning.id, width: 7, clock: .2, points: [{ x: 30, y: 60, at: .05 }, { x: 120, y: 60, at: .1 }, { x: 160, y: 130, at: .2 }] };
      const r = __game.renderer, old = r.ctx; r.ctx = ctx;
      const distSeg = (x, y, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, q = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - a.x - q * dx, y - a.y - q * dy); };
      ctx.clearRect(0, 0, 260, 220); r.drawFlash({ pos: { x: 160, y: 130 }, radius: 7, color: '#ccc', life: 1, maxLife: 1, lightning: fixture }); r.ctx = old;
      scan((x, y) => Math.min(distSeg(x, y, fixture.points[0], fixture.points[1]), distSeg(x, y, fixture.points[1], fixture.points[2])) > 8);
      return { checks, rows: strikeRows.map(row => {
        const frames = row.family === 'lightning' ? 48 : 16, width = row.family === 'lightning' ? 440 : 220;
        return { id: row.id, name: row.name, family: row.family, frames, width, sheets: [false, true].map(mono => {
          const canvas = document.createElement('canvas'); canvas.width = width * frames; canvas.height = 160; const cc = canvas.getContext('2d');
          for (let i = 0; i < frames; i++) {
            cc.save(); cc.translate(i * width, 0); cc.beginPath(); cc.rect(0, 0, width, 160); cc.clip();
            paintStrike(cc, row, i / frames, mono ? '#c5d1d8' : row.color); cc.restore();
          }
          return canvas.toDataURL();
        }) };
      }) };
    });
    fs.writeFileSync(path.join(dir, 'strike-pixels.json'), JSON.stringify({ checks: results.checks, identities: results.rows.length }));
    fs.writeFileSync(path.join(dir, 'strike-study.html'), fs.readFileSync(path.join(__dirname, 'strike-study.html'), 'utf8').replace('/*__DATA__*/[]', JSON.stringify(results.rows)));
    await run(() => {
      const w = __game.world(), p = w.player;
      w.zoneMap.qa_strikes = { id: 'qa_strikes', name: 'Proving Ground', level: 1, size: { w: 1600, h: 1200 }, seed: 9283,
        theme: { floor: '#303a37', grid: '#35433e', border: '#44544c', obstacle: '#444', obstacleEdge: '#555', accent: '#8cbba5' }, layout: [], objective: { kind: 'safe' }, exits: [], map: { x: 9000, y: 9000 } };
      w.loadZone('qa_strikes'); p.pos = { x: 800, y: 600 }; w.actors = [p]; w.doodads = []; w.markDoodadsChanged();
      __game.hold(false); __game.step(90); window.strikeUpdate = w.update.bind(w); w.update = () => {};
    });
    for (const id of ['cleave', 'heavy_strike', 'surgical_strike', 'flame_wave', 'lightning_bolt', 'chain_lightning']) {
      await win.webContents.executeJavaScript('window.strikeCast=' + JSON.stringify(id));
      const facts = await run(() => {
        const w = __game.world(), p = w.player; __game.devGrantSkill(strikeCast, 1, 2); const inst = p.skills[2];
        inst.def = { ...inst.def, requirements: undefined, useTime: 0, castMode: 'cast' }; p.casting = null; p.cooldowns.clear(); p.useLock = 0; p.fillResources();
        w.actors = [p]; w.flashes = []; w.projectiles = []; w.zones = [];
        for (const [x, y] of [[875, 600], [950, 660], [1030, 595]]) {
          const a = w.createMonster('zombie', 1, 'enemy'); a.pos = { x, y }; a.brain = undefined; a.anchored = true; a.spawnedAt = -1;
          a.sheet.setSource('qa', [{ stat: 'life', kind: 'override', value: 100000 }]); a.fillResources(); w.actors.push(a);
        }
        if (!w.useSkill(p, inst, { x: 1050, y: 600 })) throw Error('Refused ' + strikeCast);
        if (strikeCast.includes('lightning')) for (let i = 0; i < 17; i++) strikeUpdate(1 / 60);
        else for (const f of w.flashes) f.life = f.maxLife * .65;
        __game.step(1);
        return { marks: w.flashes.filter(f => f.lightning || f.fx?.startsWith('skillStrike:')).length, fatal: __game.crash().fatal };
      });
      assert(facts.marks > 0, id); assert.equal(facts.fatal, null);
      await new Promise(r => setTimeout(r, 120)); fs.writeFileSync(path.join(dir, 'strike-live-' + id + '.png'), (await win.webContents.capturePage()).toPNG());
    }
    const peer = await run(() => { __game.hold(true); const snap = __game.snapshot(); __game.applySnap(snap); __game.renderer.render(__game.world());
      return { traces: __game.world().flashes.filter(f => f.lightning).length, fatal: __game.crash().fatal }; });
    assert(peer.traces > 0); assert.equal(peer.fatal, null); assert.deepEqual(errors, []);
    await win.loadFile(path.join(dir, 'strike-study.html')); await new Promise(r => setTimeout(r, 350));
    fs.writeFileSync(path.join(dir, 'strike-overview.png'), (await win.webContents.capturePage()).toPNG());
    const controls = await run(() => { const f = document.querySelector('#family'); f.value = 'melee'; f.dispatchEvent(new Event('change'));
      document.querySelector('#mono').click(); document.querySelector('#pause').click(); document.querySelector('#names').click(); document.querySelector('#bright').click();
      return { count: document.querySelector('#count').textContent, pause: document.querySelector('#pause').textContent, hidden: document.body.classList.contains('hide-names') }; });
    assert.deepEqual(controls, { count: '99 melee skills', pause: 'Play', hidden: true });
    await new Promise(r => setTimeout(r, 150)); fs.writeFileSync(path.join(dir, 'strike-monochrome.png'), (await win.webContents.capturePage()).toPNG());
    console.log(`PASS ${results.checks} pixel checks, 6 live casts, co-op and ${results.rows.length} animated entries`);
  } finally { clearTimeout(timer); win.destroy(); server.server.close(); app.quit(); }
}).catch(e => { console.error(e); app.exit(1); });

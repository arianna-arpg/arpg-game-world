const { installVisualHarnessHold } = require('./skill-visual-harness.cjs');
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports', 'skill-visuals');
const data = JSON.parse(fs.readFileSync(path.join(dir, 'presence.json'), 'utf8'));
const studyOnly = process.argv.includes('--study-only');
app.setPath('userData', path.join(dir, 'presence-profile-' + process.pid)); app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timer = setTimeout(() => app.exit(1), 240000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'presence-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1440, height: 1120, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = []; win.webContents.on('console-message', e => { if (e.level === 'error') errors.push(e.message); });
  const shot = async name => {
    // Hidden windows can retain an old compositor frame while newly selected
    // sprite sheets decode. Let the page settle before requesting its repaint.
    await new Promise(r => setTimeout(r, 600));
    win.webContents.invalidate(); await new Promise(r => setTimeout(r, 200));
    const png = (await win.webContents.capturePage()).toPNG(); fs.writeFileSync(path.join(dir, name), png); return png;
  };
  const run = async fn => {
    const r = await win.webContents.executeJavaScript('(async()=>{try{return{value:await (' + fn.toString() + ')()}}catch(e){return{error:e.stack??String(e)}}})()');
    if (r.error) throw Error(r.error); return r.value;
  };
  try {
    let pixelChecks = 0;
    if (!studyOnly) {
    await win.loadURL(server.url); await win.webContents.executeJavaScript('Promise.resolve(__game.hydrated())'); await installVisualHarnessHold(win);
    await win.webContents.executeJavaScript('window.presenceRows=' + JSON.stringify(data.rows));
    await run(() => {
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('warrior'); __game.ui.hideAll(); __game.hold(true);
      window.presencePaint = (ctx, row, phase, life, color, extra = {}) => {
        const r = __game.renderer, old = r.ctx, w = __game.world(); r.ctx = ctx;
        try {
          if (phase === 'arrive' && row.family === 'storm') {
            const fields = w.remoteSkillFields;
            try {
              w.remoteSkillFields = [{ skillId: row.id, pos: { x: 180, y: 90 }, radius: 70, color, shape: 0, facing: 0,
                delay: life, delay0: 1, telegraph: 1, exploded: false, linger: 0, tier: w.player.tier, ...extra }]; r.drawZones(w);
            } finally { w.remoteSkillFields = fields; }
          } else r.drawFlash({ pos: { x: 180, y: 90 }, radius: 70, life, maxLife: 1, color, fx: 'skillPresence:' + phase + ':' + row.id, ...extra });
        } finally { r.ctx = old; }
      };
    });
    const pixels = await run(() => {
      const c = document.createElement('canvas'); c.width = 360; c.height = 180;
      const ctx = c.getContext('2d', { willReadFrequently: true }); let checks = 0;
      for (const phase of ['arrive', 'pulse', 'expire', 'break']) {
        const hashes = new Map();
        for (const row of presenceRows) {
          ctx.clearRect(0, 0, 360, 180); presencePaint(ctx, row, phase, .55, '#c7d3d9');
          const pixels = ctx.getImageData(0, 0, 360, 180).data; let ink = 0;
          for (let y = 0; y < 180; y++) for (let x = 0; x < 360; x++) if (pixels[(y * 360 + x) * 4 + 3] > 5) {
            ink++; if (Math.hypot(x + .5 - 180, y + .5 - 90) > 72) throw Error('Escaped footprint: ' + row.id);
          }
          if (ink < 60) throw Error('Invisible: ' + row.id);
          const key = c.toDataURL(); if (hashes.has(key)) throw Error('Duplicate silhouette: ' + row.id + '/' + hashes.get(key)); hashes.set(key, row.id); checks++;
        }
      }
      for (const shape of [0, 1, 2, 3, 4, 5]) {
        ctx.clearRect(0, 0, 360, 180); presencePaint(ctx, { id: 'meteor_storm' }, 'pulse', .5, '#c7d3d9', { radius: 65, shape, facing: .8, arcRad: .7, edgeFrac: .4 });
        const mask = document.createElement('canvas'); mask.width = 360; mask.height = 180;
        const m = mask.getContext('2d'), r = __game.renderer, old = r.ctx; r.ctx = m;
        try { m.beginPath(); r.traceAoe(180, 90, 65, shape, .8, .7); m.fill(); } finally { r.ctx = old; }
        const p = ctx.getImageData(0, 0, 360, 180).data, q = m.getImageData(0, 0, 360, 180).data; let ink = 0;
        for (let y = 0; y < 180; y++) for (let x = 0; x < 360; x++) if (p[(y * 360 + x) * 4 + 3] > 5) {
          ink++; if (!q[(y * 360 + x) * 4 + 3] || Math.hypot(x + .5 - 180, y + .5 - 90) < 25) throw Error('False blast area ' + shape);
        }
        if (!ink) throw Error('Empty blast ' + shape); checks++;
      }
      // Exercise the exact terrain-gated flash entry used by the frame loop.
      const w = __game.world(), r = __game.renderer, original = w.walk, old = r.ctx;
      if (!original || original.constructor.name === 'Object') throw Error('Expected a real walk grid');
      const grid = new original.constructor(400, 200, 20); grid.regionAt = x => x < 180 ? 'cistern_water' : 'grass';
      w.walk = grid; r.ctx = ctx;
      try {
        const f = { pos: { x: 180, y: 90 }, radius: 70, life: .6, maxLife: 1, color: '#c7d3d9', fx: 'skillPresence:pulse:cistern_boil', onGround: ['cistern_water'], recoveryCueTier: w.player.tier };
        ctx.clearRect(0, 0, 360, 180); r.drawTerrainFlash(f, w);
        const p = ctx.getImageData(0, 0, 360, 180).data; let ink = 0;
        for (let y = 0; y < 180; y++) for (let x = 0; x < 360; x++) if (p[(y * 360 + x) * 4 + 3] > 5) { ink++; if (x >= 180) throw Error('Ground blast painted dry shore'); }
        if (!ink) throw Error('Wet-side impact missing'); checks++;
        ctx.clearRect(0, 0, 360, 180); r.drawTerrainFlash({ ...f, recoveryCueTier: w.player.tier + 1 }, w);
        if (ctx.getImageData(0, 0, 360, 180).data.some(n => n)) throw Error('Ground impact leaked between floors'); checks++;
      } finally { w.walk = original; r.ctx = old; }
      return { checks };
    });
    fs.writeFileSync(path.join(dir, 'presence-pixels.json'), JSON.stringify(pixels));
    // Per-row transfers keep the renderer bridge bounded; production paint is
    // baked into transparent sheets so the review page needs no game or saves.
    const rows = [];
    for (const row of data.rows) {
      await win.webContents.executeJavaScript('window.presenceRow=' + JSON.stringify(row));
      rows.push(await run(() => {
        const row = presenceRow, sheets = {};
        for (const mode of ['sequence', 'break']) sheets[mode] = [false, true].map(mono => {
          const c = document.createElement('canvas'); c.width = 360 * 36; c.height = 180; const ctx = c.getContext('2d');
          for (let i = 0; i < 36; i++) {
            ctx.save(); ctx.translate(i * 360, 0); ctx.beginPath(); ctx.rect(0, 0, 360, 180); ctx.clip();
            const phase = mode === 'break' ? 'break' : i < 12 ? 'arrive' : i < 24 ? 'pulse' : 'expire';
            const q = mode === 'break' ? i / 36 : (i % 12) / 12;
            presencePaint(ctx, row, phase, Math.max(.005, 1 - q), mono ? '#c7d3d9' : row.color); ctx.restore();
          }
          return c.toDataURL('image/webp', .96);
        });
        return { ...row, note: row.family === 'storm' ? 'Gather at strike site · impact · shedding remnants' : row.family === 'summon' ? 'Assemble · answer · unbind' : 'Build · activate · dismantle', sheets };
      }));
    }
    fs.writeFileSync(path.join(dir, 'presence-study.html'), fs.readFileSync(path.join(__dirname, 'presence-study.html'), 'utf8').replace('/*__DATA__*/[]', JSON.stringify(rows)));
    await run(() => {
      const w = __game.world(), p = w.player;
      w.zoneMap.qa_presence = { id: 'qa_presence', name: 'Proving Ground', level: 1, size: { w: 1800, h: 1400 }, seed: 9283,
        theme: { floor: '#303a37', grid: '#35433e', border: '#44544c', obstacle: '#444', obstacleEdge: '#555', accent: '#8cbba5' }, layout: [], objective: { kind: 'safe' }, exits: [], map: { x: 9000, y: 9000 } };
      w.loadZone('qa_presence'); p.pos = { x: 700, y: 600 }; w.actors = [p]; w.doodads = []; w.markDoodadsChanged();
      __game.hold(false); __game.step(90); window.presenceUpdate = w.update.bind(w); w.update = () => {};
    });
    for (const id of ['meteor_storm', 'arrowfall', 'stormcall_strike', 'summon_skeleton', 'summon_stone_golem', 'flame_totem', 'ballista_sentry', 'lay_brood_egg']) {
      await win.webContents.executeJavaScript('window.presenceCase=' + JSON.stringify(id));
      const facts = await run(() => {
        const w = __game.world(), p = w.player; __game.devGrantSkill(presenceCase, 1, 2); const inst = p.skills[2];
        inst.def = { ...inst.def, requirements: undefined }; p.pos = { x: 700, y: 600 }; p.casting = null; p.cooldowns.clear(); p.useLock = 0; p.statuses = []; p.reservedMana = 0;
        p.sheet.setSource('qa-presence', [{ stat: 'mana', kind: 'override', value: 10000 }]); p.fillResources();
        w.actors = [p]; w.flashes = []; w.zones = []; w.projectiles = []; w.auras = [];
        if (!w.executeSkill(p, inst, { x: 850, y: 600 })) throw Error('Refused ' + presenceCase);
        __game.step(1);
        return { fields: w.zones.length, births: w.actors.filter(a => a.presenceBadge).length, marks: w.flashes.filter(f => f.fx?.startsWith('skillPresence:')).length, fatal: __game.crash().fatal };
      });
      assert(facts.fields || facts.births, id); assert.equal(facts.fatal, null);
      await shot('presence-live-' + id + '.png');
      const ending = await run(() => {
        const w = __game.world();
        for (const a of w.actors) if (a.presenceBadge) { a.lifespan = .1; a.brain = undefined; }
        for (let i = 0; i < 15; i++) presenceUpdate(1 / 60);
        __game.step(1); return { cues: w.flashes.filter(f => f.fx?.startsWith('skillPresence:')).length, fatal: __game.crash().fatal };
      });
      assert.equal(ending.fatal, null);
      if (!facts.fields) assert(ending.cues > 0, id + ' expiration');
    }
    const peer = await run(() => { __game.hold(true); const s = __game.snapshot(); __game.applySnap(s); __game.renderer.render(__game.world()); return __game.crash().fatal; });
    assert.equal(peer, null); assert.deepEqual(errors, []); pixelChecks = pixels.checks;
    }
    await win.loadFile(path.join(dir, 'presence-study.html')); await new Promise(r => setTimeout(r, 450));
    await run(() => { time = 1.6; paused = true; paint(); }); await new Promise(r => setTimeout(r, 100));
    const overview = await shot('presence-overview.png');
    const controls = await run(() => {
      const family = document.querySelector('#family'); family.value = 'construct'; family.dispatchEvent(new Event('change'));
      document.querySelector('#mono').click(); document.querySelector('#names').click(); document.querySelector('#bright').click(); document.querySelector('#speed').click();
      const scrub = document.querySelector('#scrub'); scrub.value = 28; scrub.dispatchEvent(new Event('input')); paint();
      return { count: document.querySelector('#count').textContent, beat: document.querySelector('#beat').textContent, hidden: document.body.classList.contains('hide-names') };
    });
    assert.deepEqual(controls, { count: '45 skills', beat: 'Expiration', hidden: true });
    const monochrome = await shot('presence-monochrome.png'); assert(!overview.equals(monochrome), 'offscreen study controls must repaint');
    console.log(studyOnly ? 'PASS study controls and visible offscreen repaints'
      : `PASS ${pixelChecks} pixel checks, 8 live lifecycles, co-op and ${data.rows.length} animated identities`);
  } finally { clearTimeout(timer); win.destroy(); server.server.close(); app.quit(); }
}).catch(e => { console.error(e); app.exit(1); });

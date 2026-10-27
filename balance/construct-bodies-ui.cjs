// Hidden production-renderer study. Run presencevisuals, then build into
// balance/reports/construct-visuals/dist. All profiles/saves stay disposable.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports', 'construct-visuals');
const rows = JSON.parse(fs.readFileSync(path.join(dir, 'catalogue.json'), 'utf8'));
app.disableHardwareAcceleration();
app.setPath('userData', path.join(dir, `profile-${process.pid}`));
app.whenReady().then(async () => {
  const timer = setTimeout(() => app.exit(1), 180000);
  const server = await startGameServer({ root: path.join(dir, 'dist'), savesDir: path.join(dir, `saves-${process.pid}`) });
  const win = new BrowserWindow({ show: false, width: 1440, height: 1080, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = []; win.webContents.on('console-message', e => { if (e.level === 'error') errors.push(e.message); });
  const run = fn => win.webContents.executeJavaScript(`(${fn.toString()})()`);
  try {
    await win.loadURL(server.url); await run(() => __game.hydrated());
    await win.webContents.executeJavaScript('window.constructRows=' + JSON.stringify(rows));
    await run(() => {
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('necromancer'); __game.ui.hideAll(); __game.hold(true);
      const w = __game.world();
      w.zoneMap.qa_constructs = { id: 'qa_constructs', name: 'Construct Study', level: 1, size: { w: 1800, h: 1400 }, seed: 9283,
        theme: { floor: '#303a37', grid: '#35433e', border: '#44544c', obstacle: '#444', obstacleEdge: '#555', accent: '#8cbba5' },
        layout: [], objective: { kind: 'safe' }, exits: [], map: { x: 9000, y: 9000 } };
      w.loadZone('qa_constructs'); w.player.pos = { x: 900, y: 760 }; w.actors = [w.player]; w.doodads = []; w.markDoodadsChanged();
      w.time = 10; w.flashes = []; w.texts = [];
      window.constructActors = constructRows.map((row, i) => {
        __game.devGrantSkill(row.id, 1, 2); const inst = w.player.skills[2];
        const a = w.spawnConstruct(w.player, inst, inst.def.delivery, w.player.pos);
        if (!a || a.look !== row.look) throw Error(row.id + ': delivery body did not reach renderer');
        a.pos = { x: 635 + (i % 8) * 75, y: 470 + Math.floor(i / 8) * 55 };
        a.facing = a.facingPrev = -Math.PI / 2; a.spawnedAt = -1; a.brain = undefined; return a;
      });
      window.constructPaint = (ctx, a, scale, mono) => {
        const r = __game.renderer, oldCtx = r.ctx, oldColor = a.color, oldBadge = a.presenceBadge, oldConstruct = a.construct;
        // Body-only study: omit range effects and source foot badges. The world
        // capture below retains both, at the unmodified collision radius.
        try {
          r.ctx = ctx; if (mono) a.color = '#bfc6cd'; a.presenceBadge = undefined; a.construct = undefined;
          ctx.save(); ctx.scale(scale, scale); ctx.translate(-a.pos.x, -a.pos.y); r.drawActor(a, w); ctx.restore();
        } finally { r.ctx = oldCtx; a.color = oldColor; a.presenceBadge = oldBadge; a.construct = oldConstruct; }
      };
    });
    const result = await run(() => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 128; const ctx = c.getContext('2d', { willReadFrequently: true });
      const hashes = new Map(); let checks = 0;
      for (const a of constructActors) {
        for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          a.facing = facing;
          ctx.clearRect(0, 0, 128, 128); ctx.save(); ctx.translate(64, 64); constructPaint(ctx, a, 1, true); ctx.restore();
          const pixels = ctx.getImageData(0, 0, 128, 128).data; let ink = 0;
          for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) if (pixels[(y * 128 + x) * 4 + 3] > 40) {
            ink++; if (x < 8 || y < 8 || x > 119 || y > 119) throw Error(a.sourceSkillId + ': escaped study tile');
          }
          if (ink < 45) throw Error(a.sourceSkillId + ': invisible body');
          if (facing === 0) {
            // Alpha mask removes palette/material differences from the test.
            const mask = Array.from(pixels).filter((_, i) => i % 4 === 3).map(v => v > 80 ? '1' : '0').join('');
            if (hashes.has(mask)) throw Error(a.sourceSkillId + ': same silhouette as ' + hashes.get(mask));
            hashes.set(mask, a.sourceSkillId);
          }
          checks++;
        }
      }
      const pad = constructActors.find(a => a.sourceSkillId === 'temporal_pad'), native = pad.look; pad.facing = 0;
      const ringCoverage = look => {
        pad.look = look; ctx.clearRect(0, 0, 128, 128); ctx.save(); ctx.translate(64, 64); constructPaint(ctx, pad, 1, true); ctx.restore();
        const px = ctx.getImageData(0, 0, 128, 128).data; let ink = 0;
        for (let i = 0; i < 72; i++) {
          const angle = i / 72 * Math.PI * 2, r = pad.radius + 2;
          const x = Math.floor(64 + Math.cos(angle) * r), y = Math.floor(64 + Math.sin(angle) * r);
          if (px[(y * 128 + x) * 4 + 3] > 40) ink++;
        }
        return ink / 72;
      };
      try {
        const before = ringCoverage('construct_pad'), after = ringCoverage(native);
        if (before < .8 || after > .4) throw Error(`Ownership ring did not yield to clasp: ${before}/${after}`);
      } finally { pad.look = native; }
      return { checks, fatal: __game.crash().fatal };
    });
    assert.equal(result.fatal, null);
    for (const bright of [false, true]) {
      await win.webContents.executeJavaScript('window.constructBright=' + bright);
      const png = await run(() => {
        const c = document.createElement('canvas'); c.width = 1200; c.height = 110 + Math.ceil(constructRows.length / 6) * 168;
        const ctx = c.getContext('2d'); ctx.fillStyle = constructBright ? '#d8d6cc' : '#121a20'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = constructBright ? '#233039' : '#e2e8e8'; ctx.font = '24px sans-serif'; ctx.fillText('HOLLOW WAKE / CONSTRUCT BODIES', 24, 36);
        ctx.font = '14px sans-serif'; ctx.fillText('Enlarged body study  /  native size  /  shared color at native size', 24, 66);
        constructActors.forEach((a, i) => {
          const x = (i % 6) * 200, y = 100 + Math.floor(i / 6) * 168; a.facing = -Math.PI / 2;
          ctx.save(); ctx.beginPath(); ctx.rect(x, y, 200, 168); ctx.clip();
          for (const [dx, scale, mono] of [[55, 2.6, false], [125, 1, false], [169, 1, true]]) {
            ctx.save(); ctx.translate(x + dx, y + 67); constructPaint(ctx, a, scale, mono); ctx.restore();
          }
          ctx.fillStyle = constructBright ? '#233039' : '#e2e8e8'; ctx.font = '13px sans-serif';
          ctx.fillText(constructRows[i].name, x + 12, y + 130, 180); ctx.restore();
        });
        return c.toDataURL('image/png').split(',')[1];
      });
      fs.writeFileSync(path.join(dir, bright ? 'constructs-bright.png' : 'constructs-dark.png'), Buffer.from(png, 'base64'));
    }
    const comparison = await run(() => {
      const cases = { flame_totem: 'construct_totem', orb_of_storms: 'construct_pylon', ballista_sentry: 'construct_sentry',
        battle_standard: 'construct_pylon', font_of_renewal: 'construct_totem', mender_relic: 'construct_relic',
        stone_rampart: 'construct_barrier_stone', wall_of_meat: 'construct_barrier_bone', frost_trap: 'construct_trap',
        gate_shift: 'construct_gate', holy_relic: 'construct_relic', torpor_field: 'construct_dome' };
      const c = document.createElement('canvas'); c.width = 1200; c.height = 740; const ctx = c.getContext('2d');
      ctx.fillStyle = '#131c23'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#e7edeb'; ctx.font = '26px sans-serif'; ctx.fillText('HOLLOW WAKE / CONSTRUCT VISUAL PASS', 28, 40);
      ctx.fillStyle = '#aab9c1'; ctx.font = '15px sans-serif'; ctx.fillText('Previous body  →  New body     |     Enlarged from the production renderer', 28, 70);
      Object.entries(cases).forEach(([id, oldLook], i) => {
        const a = constructActors.find(a => a.sourceSkillId === id), row = constructRows.find(r => r.id === id), native = a.look;
        const x = 20 + (i % 4) * 295, y = 100 + Math.floor(i / 4) * 210; a.facing = -Math.PI / 2;
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, 285, 205); ctx.clip();
        try {
          for (const [look, dx] of [[oldLook, 65], [native, 209]]) {
            a.look = look; ctx.save(); ctx.translate(x + dx, y + 80); constructPaint(ctx, a, 3, false); ctx.restore();
          }
        } finally { a.look = native; }
        ctx.fillStyle = '#899ca7'; ctx.font = '22px sans-serif'; ctx.fillText('→', x + 130, y + 85);
        ctx.fillStyle = '#e7edeb'; ctx.font = '16px sans-serif'; ctx.fillText(row.name, x + 24, y + 157);
        ctx.restore();
      });
      return c.toDataURL('image/png').split(',')[1];
    });
    fs.writeFileSync(path.join(dir, 'constructs-comparison.png'), Buffer.from(comparison, 'base64'));
    const world = await run(() => {
      const w = __game.world(); w.flashes = []; w.texts = [];
      __game.renderer.render(w);
      return document.querySelector('#game').toDataURL('image/png').split(',')[1];
    });
    fs.writeFileSync(path.join(dir, 'constructs-world.png'), Buffer.from(world, 'base64'));
    const peer = await run(() => { const s = __game.snapshot(); __game.applySnap(s); __game.renderer.render(__game.world()); return __game.crash().fatal; });
    assert.equal(peer, null); assert.deepEqual(errors, []);
    console.log(`PASS ${result.checks} native-size/facing pixel checks, ${rows.length} distinct masks, dark/bright studies and co-op frame`);
  } catch (e) { console.error(e); process.exitCode = 1; }
  finally { clearTimeout(timer); win.destroy(); server.server.close(); app.exit(process.exitCode || 0); }
}).catch(e => { console.error(e); app.exit(1); });

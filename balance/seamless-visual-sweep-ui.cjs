// Actual seamless client, native terrain, real casts and disposable account/saves.
// Build and run probe_playercastvisuals first. No writes to a player's profile.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const { installVisualHarnessHold } = require('./skill-visual-harness.cjs');
const { buildSync } = require('esbuild');
const dir = path.join(__dirname, 'reports', 'skill-visuals');
fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, 'sweep-profile-' + process.pid)); app.disableHardwareAcceleration();
const ids = ['summon_skeleton','summon_skeleton_archer','summon_skeleton_mage','summon_stone_golem','summon_bone_golem','summon_fire_golem',
  'flame_totem','ballista_sentry','meteor_storm','stormcall_strike','firebolt','frostbolt','lightning_bolt','chain_lightning',
  'sunpiercer','umbral_lance','frost_nova','pyre_nova','cleave','heavy_strike','bone_offering','the_amalgam'];
const saveImage = (name, url) => fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
app.whenReady().then(async () => {
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'sweep-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1440, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const report = { errors: [], rows: [] };
  const write = () => fs.writeFileSync(path.join(dir, 'seamless-live-sweep.json'), JSON.stringify(report, null, 2));
  const timer = setTimeout(() => { write(); console.error('Sweep timeout'); app.exit(1); }, 360000);
  win.webContents.on('console-message', e => { if (e.level === 'error') report.errors.push(e.message); });
  const run = async (fn, ...args) => {
    const r = await win.webContents.executeJavaScript('(async()=>{try{return {value:await (' + fn + ')(' + args.map(a => JSON.stringify(a)).join(',') + ')}}catch(e){return {error:e.stack||String(e)}}})()');
    if (r.error) throw Error(r.error); return r.value;
  };
  try {
    await win.loadURL(server.url); await run(() => __game.hydrated()); await installVisualHarnessHold(win);
    // Load inspection helpers only in this disposable client, never the product.
    const code = buildSync({ stdin: { contents: "export {companionCueState} from './src/engine/companionCues'; export {playerCastPreparation} from './src/engine/playerCastVisual'; export {drawCastPreparation} from './src/render/vis/skillCastPreparation'; export {skillCastProfile} from './src/data/skillCastVisuals'; export {SKILLS} from './src/data/skills';", resolveDir: path.resolve(__dirname, '..'), loader: 'ts' }, bundle: true, write: false, format: 'iife', globalName: 'SweepQA' }).outputFiles[0].text;
    await win.webContents.executeJavaScript(code);
    report.start = await run(async () => {
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('necromancer'); __game.ui.hideAll();
      const w = __game.world(); if (!w.massRuntime) w.startWorldMass(42);
      w.player.invulnerable = true; __game.hold(true); window.sweepAdvance = Object.getPrototypeOf(w).update.bind(w);
      // Leave the opening room through the real seamless landing path.
      w.landPartyAt({ x: w.player.pos.x + 850, y: w.player.pos.y + 520 }); w.massRuntime.update(w, true);
      w.time = __game.clipCatalog().noon;
      window.sweepHome = { ...w.player.pos }; w.actors = [w.player];
      __game.settings().cameraMode = 'hero';
      for (let i = 0; i < 12; i++) { sweepAdvance(1 / 60); if (i % 4 === 0) await new Promise(r => setTimeout(r, 0)); }
      __game.ui.hideAll(); __game.step(1);
      window.sweepFrames = [];
      window.sweepCapture = (width = 220, height = 190, dx = 0) => {
        __game.renderer.render(w); const r = __game.renderer, g = document.getElementById('game'), at = r.toScreen(w.player.pos);
        const c = document.createElement('canvas'); c.width = width; c.height = height;
        c.getContext('2d').drawImage(g, at.x - width / 2 + dx, at.y - height / 2, width, height, 0, 0, width, height);
        return c.toDataURL();
      };
      return { seamless: !!w.massRuntime, zone: w.zone.id, home: sweepHome, fatal: __game.crash().fatal };
    });
    assert(report.start.seamless); assert.equal(report.start.fatal, null);
    for (const id of ids) {
      const row = await run(async id => {
        const w = __game.world(), p = w.player;
        p.pos = { ...sweepHome }; p.casting = null; p.useLock = 0; p.cooldowns.clear(); p.statuses = []; p.reservedMana = 0;
        w.actors = [p]; w.flashes = []; w.zones = []; w.projectiles = []; w.auras = []; w.corpses = [];
        p.sheet.setSource('sweep-qa', [{ stat: 'mana', kind: 'override', value: 100000 }, { stat: 'life', kind: 'override', value: 100000 }]);
        p.fillResources(); if (__game.devGrantSkill(id, 1, 2) < 0) throw Error('Missing skill ' + id);
        const inst = p.skills[2]; inst.def = { ...inst.def, requirements: undefined };
        const target = { x: p.pos.x + 155, y: p.pos.y };
        if (id === 'the_amalgam') {
          __game.devGrantSkill('summon_skeleton', 1, 3); const food = p.skills[3];
          food.def = { ...food.def, requirements: undefined };
          for (let i = 0; i < 3; i++) w.executeSkill(p, food, { x: p.pos.x + 70, y: p.pos.y + i * 25 });
        }
        if (['firebolt','frostbolt','lightning_bolt','chain_lightning','sunpiercer','umbral_lance','cleave','heavy_strike','frost_nova','pyre_nova'].includes(id)) {
          for (let i = 0; i < 3; i++) {
            const e = w.createMonster('zombie', 1, 'enemy');
            e.pos = { x: p.pos.x + (inst.def.delivery.type === 'melee' ? 38 : 130) + i * 65, y: p.pos.y + (i % 2 ? 48 : 0) };
            e.passive = true; e.anchored = true; e.sheet.setSource('sweep-target', [{ stat: 'life', kind: 'override', value: 100000 }]); e.fillResources(); w.actors.push(e);
          }
        }
        if (id === 'bone_offering') {
          const dead = w.createMonster('zombie', 1, 'enemy'); dead.pos = { ...target }; w.actors.push(dead); w.kill(dead);
        }
        if (!w.useSkill(p, inst, target, true)) throw Error('Refused real cast ' + id);
        const total = p.casting?.total, mode = p.casting?.mode;
        const frames = [], timings = [];
        for (const fraction of [.18, .52, .86]) {
          const clock = p.casting?.mode === 'channel' ? 1.2 : (total || 1);
          const elapsed = clock * (fraction - (timings.at(-1)?.fraction ?? 0));
          for (let t = 0; t < elapsed - .00001; t += 1 / 60) w.updateCasting(p, Math.min(1 / 60, elapsed - t));
          const cue = SweepQA.playerCastPreparation(p);
          frames.push(sweepCapture());
          timings.push({ fraction, fill: cue?.fill, family: cue?.profile.family, cast: !!p.casting });
        }
        // True release: retain native delivery and actual cast timing.
        if (p.casting) {
          if (p.casting.mode === 'charge' || p.casting.mode === 'channel') p.casting.held = false;
          for (let i = 0; i < 100 && p.casting; i++) w.updateCasting(p, 1 / 60);
        }
        const payload = sweepCapture(500, 330, 75);
        // Advance native effects through real world updates, retaining seamless terrain.
        const seconds = ['summon', 'construct'].includes(inst.def.delivery.type) || id === 'the_amalgam' ? .85
          : inst.def.delivery.type === 'storm' ? Math.max(.15, Math.min(...w.zones.map(z => z.delay).filter(n => n > 0)) + .06) : .15;
        for (let i = 0; i < Math.ceil(Math.min(3, seconds) * 60); i++) { sweepAdvance(1 / 60); if (i % 8 === 0) await new Promise(r => setTimeout(r, 0)); }
        const aftermath = sweepCapture(500, 330, 75);
        const facts = { id, name: inst.def.name, total, mode, timings, births: w.actors.filter(a => a.owner === p).length,
          projectiles: w.projectiles.length, fields: w.zones.length, fatal: __game.crash().fatal };
        for (let i = 0; i < 18; i++) sweepAdvance(1 / 60);
        const late = sweepCapture(500, 330, 75);
        sweepFrames.push({ ...facts, frames, payload, aftermath, late }); return facts;
      }, id);
      assert.equal(row.fatal, null); report.rows.push(row); write(); console.log('Swept ' + id);
    }
    const atlas = await run(async () => {
      const image = src => new Promise(resolve => { const i = new Image(); i.onload = () => resolve(i); i.src = src; });
      const sheets = [];
      for (const mono of [false, true]) {
        const c = document.createElement('canvas'); c.width = 900; c.height = sweepFrames.length * 210;
        const ctx = c.getContext('2d'); ctx.fillStyle = '#151c23'; ctx.fillRect(0, 0, c.width, c.height);
        for (let i = 0; i < sweepFrames.length; i++) {
          const row = sweepFrames[i]; ctx.filter = 'none'; ctx.fillStyle = '#eee8db'; ctx.font = '13px sans-serif';
          ctx.fillText(row.name, 10, i * 210 + 17);
          ctx.filter = mono ? 'grayscale(1)' : 'none';
          for (let n = 0; n < 3; n++) ctx.drawImage(await image(row.frames[n]), n * 225, i * 210 + 22);
          ctx.drawImage(await image(row.aftermath), 675, i * 210 + 22, 220, 145);
        }
        sheets.push(c.toDataURL());
      }
      return sheets;
    });
    saveImage('seamless-casts-color', atlas[0]); saveImage('seamless-casts-mono', atlas[1]);
    fs.writeFileSync(path.join(dir, 'seamless-sweep-frames.json'), JSON.stringify(await run(() => sweepFrames)));
    // Whole-field view with real summon births, idle/combat/return and a live cast.
    report.links = await run(async () => {
      const w = __game.world(), p = w.player; p.casting = null; p.useLock = 0; p.cooldowns.clear(); p.reservedMana = 0;
      w.actors = [p]; w.flashes = []; w.zones = []; w.projectiles = []; w.corpses = []; p.pos = { ...sweepHome };
      for (const [i, id] of ['summon_skeleton','summon_skeleton_archer','summon_skeleton_mage','summon_stone_golem'].entries()) {
        __game.devGrantSkill(id, 1, 2); const inst = p.skills[2]; inst.def = { ...inst.def, requirements: undefined };
        w.executeSkill(p, inst, { x: p.pos.x + 30 + i * 20, y: p.pos.y + 40 });
      }
      for (let i = 0; i < 72; i++) { sweepAdvance(1 / 60); if (i % 12 === 0) await new Promise(r => setTimeout(r, 0)); }
      const minions = w.actors.filter(a => a.owner === p && !a.dead);
      for (const [i, m] of minions.entries()) { m.pos = { x: p.pos.x + 45 + i * 10, y: p.pos.y + 25 }; m.emergeUntil = undefined; __game.ai(m, w, 1 / 60); }
      const idle = minions.reduce((n, m) => n + SweepQA.companionCueState(m, w).links.filter(l => l.kind === 'owner').length, 0);
      const idleImage = sweepCapture(780, 500);
      const m = minions[0]; m.pos = { x: p.pos.x + 310, y: p.pos.y - 15 }; __game.ai(m, w, 1 / 60);
      const returning = SweepQA.companionCueState(m, w).links.some(l => l.kind === 'owner');
      const returnImage = sweepCapture(780, 500, 100);
      m.pos = { x: p.pos.x + 45, y: p.pos.y }; __game.ai(m, w, 1 / 60);
      const arrived = SweepQA.companionCueState(m, w).links.length;
      __game.devGrantSkill('summon_skeleton', 1, 2); const inst = p.skills[2]; inst.def = { ...inst.def, requirements: undefined };
      p.cooldowns.clear(); p.useLock = 0; w.useSkill(p, inst, p.pos, true); w.updateCasting(p, p.casting.total * .55);
      __game.renderer.render(w);
      return { idle, returning, arrived, minions: minions.length, idleImage, returnImage, castImage: document.getElementById('game').toDataURL() };
    });
    assert.equal(report.links.idle, 0); assert(report.links.returning); assert.equal(report.links.arrived, 0);
    for (const key of ['idleImage','returnImage','castImage']) { saveImage('seamless-' + key, report.links[key]); delete report.links[key]; }
    report.visibility = await run(() => {
      const w = __game.world(), r = __game.renderer, p = w.player;
      const e = w.createMonster('zombie', 1, 'enemy'); e.pos = { x: p.pos.x + 100, y: p.pos.y };
      e.casting = { ...p.casting, aim: { ...p.pos } }; w.actors.push(e);
      const paint = (a, on) => {
        w.account.cosmetics.loadout.castingEffects = on; const c = document.createElement('canvas'); c.width = c.height = 220;
        const ctx = c.getContext('2d'), old = r.ctx; ctx.translate(110 - a.pos.x, 110 - a.pos.y); r.ctx = ctx;
        try { r.drawActor(a, w); return c.toDataURL(); } finally { r.ctx = old; }
      };
      const ownDiffers = paint(p, true) !== paint(p, false), enemyStable = paint(e, true) === paint(e, false);
      w.account.cosmetics.loadout.castingEffects = true; return { ownDiffers, enemyStable };
    });
    assert(report.visibility.ownDiffers && report.visibility.enemyStable);
    report.wardrobe = await run(() => {
      const w = __game.world(); __game.ui.showWardrobe(); const btn = document.querySelector('[data-wd-casting]');
      if (!btn) throw Error('Missing wardrobe toggle'); btn.click();
      const off = __game.account().cosmetics.loadout.castingEffects === false, bar = !!w.player.casting;
      return { off, bar, label: document.querySelector('[data-wd-casting]').textContent };
    });
    assert(report.wardrobe.off && report.wardrobe.bar);
    await new Promise(r => setTimeout(r, 150)); win.webContents.invalidate();
    fs.writeFileSync(path.join(dir, 'seamless-wardrobe.png'), (await win.webContents.capturePage()).toPNG());
    await run(() => __game.saveAccount()); await win.loadURL(server.url); await run(() => __game.hydrated());
    report.wardrobe.persisted = await run(() => __game.account().cosmetics.loadout.castingEffects === false);
    assert(report.wardrobe.persisted);
    assert.deepEqual(report.errors, []); write();
    console.log('PASS actual seamless terrain, ' + ids.length + ' real cast courses, color/monochrome frames, return-only links and Wardrobe toggle');
  } finally { clearTimeout(timer); write(); win.destroy(); server.server.close(); app.quit(); }
}).catch(e => { console.error(e.stack || e); app.exit(1); });

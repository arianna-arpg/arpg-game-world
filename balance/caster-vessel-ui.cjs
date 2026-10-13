// Actual caster/renderer review: native clocks, posed bodies, four facings,
// player-only art, palette-independent comparison and disposable account/saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const { installVisualHarnessHold } = require('./skill-visual-harness.cjs');
const dir = path.join(__dirname, 'reports', 'skill-visuals');
fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, 'vessel-profile-' + process.pid)); app.disableHardwareAcceleration();
const heroClass = process.env.HOLLOW_WAKE_QA_CLASS || 'necromancer';
const stem = 'caster-vessel-' + heroClass;
const ids = ['summon_skeleton', 'summon_skeleton_mage', 'summon_stone_golem', 'flame_totem', 'meteor_storm',
  'firebolt', 'frostbolt', 'lightning_bolt', 'chain_lightning', 'sunpiercer', 'frost_nova', 'bone_offering', 'cleave', 'quickstep', 'stone_skin'];
app.whenReady().then(async () => {
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'vessel-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1440, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const report = { errors: [], rows: [] };
  const run = async (fn, ...args) => {
    const r = await win.webContents.executeJavaScript('(async()=>{try{return {value:await (' + fn + ')(' + args.map(a => JSON.stringify(a)).join(',') + ')}}catch(e){return {error:e.stack||String(e)}}})()');
    if (r.error) throw Error(r.error); return r.value;
  };
  const timer = setTimeout(() => app.exit(1), 360000);
  win.webContents.on('console-message', e => { if (e.level === 'error') report.errors.push(e.message); });
  try {
    await win.loadURL(server.url); await run(() => __game.hydrated()); await installVisualHarnessHold(win);
    await run(async heroClass => {
      __game.account().ledger.prologue_lived = 1; __game.devStartRun(heroClass); __game.ui.hideAll();
      const w = __game.world(); if (!w.massRuntime) w.startWorldMass(42);
      w.player.invulnerable = true; __game.hold(true);
      w.landPartyAt({ x: w.player.pos.x + 850, y: w.player.pos.y + 520 }); w.massRuntime.update(w, true);
      w.time = __game.clipCatalog().noon; window.vesselHome = { ...w.player.pos }; w.actors = [w.player];
      __game.settings().cameraMode = 'hero'; __game.ui.hideAll(); __game.step(1);
      window.vesselRows = [];
      window.captureBody = () => {
        const w = __game.world(), p = w.player, r = __game.renderer;
        const c = document.createElement('canvas'); c.width = 240; c.height = 220;
        const ctx = c.getContext('2d'); ctx.fillStyle = '#141e23'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.translate(120, 130); ctx.scale(2.4, 2.4); ctx.translate(-p.pos.x, -p.pos.y);
        const old = r.ctx; r.ctx = ctx;
        try { r.drawActor(p, w); } finally { r.ctx = old; }
        return c.toDataURL();
      };
    }, heroClass);
    for (const id of ids) {
      const row = await run(async id => {
        const w = __game.world(), p = w.player;
        p.pos = { ...vesselHome }; p.casting = null; p.bodyAction = undefined; p.useLock = 0; p.cooldowns.clear(); p.statuses = []; p.reservedMana = 0;
        w.actors = [p]; w.flashes = []; w.zones = []; w.projectiles = []; w.auras = []; w.corpses = [];
        p.sheet.setSource('vessel-qa', [{ stat: 'mana', kind: 'override', value: 100000 }, { stat: 'life', kind: 'override', value: 100000 }]); p.fillResources();
        if (__game.devGrantSkill(id, 1, 2) < 0) throw Error('Missing skill ' + id);
        const inst = p.skills[2]; inst.def = { ...inst.def, requirements: undefined };
        const target = { x: p.pos.x + 120, y: p.pos.y + 65 };
        if (id === 'bone_offering') { const dead = w.createMonster('zombie', 1, 'enemy'); dead.pos = { ...target }; w.actors.push(dead); w.kill(dead); }
        if (!w.useSkill(p, inst, target, true) || !p.casting) throw Error('No preparation for ' + id);
        const total = p.casting.total, mode = p.casting.mode, duration = mode === 'channel' ? 1.2 : total;
        const frames = [], facings = [], times = [];
        for (let i = 0; i < 25; i++) {
          const to = duration * (.02 + .96 * i / 24), dt = to - (times.at(-1) ?? 0);
          w.updateCasting(p, dt); w.time += dt; times.push(to);
          if (!p.casting) throw Error('Early end ' + id);
          frames.push(captureBody());
        }
        // Actual in-game composition at normal zoom, including native cast bar.
        __game.renderer.render(w); const g = document.getElementById('game'), at = __game.renderer.toScreen(p.pos);
        const c = document.createElement('canvas'); c.width = 320; c.height = 240;
        c.getContext('2d').drawImage(g, at.x - 160, at.y - 120, 320, 240, 0, 0, 320, 240);
        const context = c.toDataURL();
        const savedFacing = p.facing, aim = p.casting.aim, locked = p.casting.lockedAim;
        for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          p.facing = facing; p.casting.aim = { x: p.pos.x + Math.cos(facing) * 120, y: p.pos.y + Math.sin(facing) * 120 };
          if (locked) p.casting.lockedAim = { ...p.casting.aim };
          facings.push(captureBody());
        }
        p.facing = savedFacing; p.casting.aim = aim; p.casting.lockedAim = locked;
        w.account.cosmetics.loadout.castingEffects = false; const off = captureBody();
        w.account.cosmetics.loadout.castingEffects = true; const on = captureBody();
        if (off === on) throw Error('No visible casting effect for ' + id);
        p.applyStatus('stun', w.time, 1, 'vessel-qa');
        const stunnedOn = captureBody(); w.account.cosmetics.loadout.castingEffects = false; const stunnedOff = captureBody();
        if (stunnedOn !== stunnedOff) throw Error('Casting art survived stun ' + id);
        p.statuses = []; w.account.cosmetics.loadout.castingEffects = true;
        const row = { id, name: inst.def.name, total, mode, frames, facings, context, off };
        vesselRows.push(row); return { id, total, mode, frames: frames.length, facingImages: new Set(facings).size, interruption: true };
      }, id);
      assert.equal(row.facingImages, 4); report.rows.push(row); console.log('PASS body/facing/interruption ' + id);
    }
    const rows = await run(() => vesselRows);
    fs.writeFileSync(path.join(dir, stem + '-frames.json'), JSON.stringify(rows));
    const sheets = await run(async () => {
      const image = src => new Promise(resolve => { const i = new Image(); i.onload = () => resolve(i); i.src = src; });
      const result = [];
      for (let offset = 0; offset < vesselRows.length; offset += 5) {
        const c = document.createElement('canvas'); c.width = 960; c.height = Math.min(5, vesselRows.length - offset) * 244;
        const ctx = c.getContext('2d'); ctx.fillStyle = '#141e23'; ctx.fillRect(0, 0, c.width, c.height);
        for (let n = offset; n < Math.min(vesselRows.length, offset + 5); n++) {
          const row = vesselRows[n], y = (n - offset) * 244;
          ctx.filter = 'none'; ctx.fillStyle = '#eee'; ctx.font = '14px sans-serif'; ctx.fillText(row.name, 10, y + 17);
          for (const [i, src] of [row.frames[0], row.frames[12], row.frames[24], row.facings[2]].entries()) {
            ctx.filter = 'grayscale(1)'; ctx.drawImage(await image(src), i * 240, y + 22);
          }
        }
        result.push(c.toDataURL());
      }
      return result;
    });
    for (let i = 0; i < sheets.length; i++) fs.writeFileSync(path.join(dir, stem + '-mono-' + i + '.png'), Buffer.from(sheets[i].split(',')[1], 'base64'));
    require('./caster-vessel-study.cjs').writeVesselStudy(dir);
    assert.deepEqual(report.errors, []);
    fs.writeFileSync(path.join(dir, stem + '-live.json'), JSON.stringify(report, null, 2));
    console.log('PASS native caster motion study: ' + ids.length + ' skills, four facings, toggle and interruption');
  } finally { clearTimeout(timer); win.destroy(); server.server.close(); app.quit(); }
}).catch(e => { console.error(e.stack || e); app.exit(1); });

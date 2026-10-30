// Hidden, isolated client walkthrough. Build to balance/reports/damage-text-dist.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports', 'damage-text');
fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, 'profile-' + process.pid));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timer = setTimeout(() => app.exit(1), 180000);
  const server = await startGameServer({ root: path.join(__dirname, 'reports', 'damage-text-dist'), savesDir: path.join(dir, 'saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1280, height: 850, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = async (fn, ...args) => {
    const result = await win.webContents.executeJavaScript(`(async () => { try {
      return { ok: true, value: await (${fn})(${args.map(a => JSON.stringify(a)).join(',')}) };
    } catch (e) { return { ok: false, error: e.stack || String(e) }; } })()`);
    if (!result.ok) throw Error(result.error);
    return result.value;
  };
  const results = [];
  const capture = async (name, expected) => {
    const result = await run(() => {
      const r = __game.renderer, w = __game.world(), ctx = r.ctx, rows = [], original = r.drawTexts;
      const state = JSON.stringify([w.time, w.player.life, w.player.mana, w.texts]);
      r.drawTexts = function(world) {
        const fill = ctx.fillText;
        ctx.fillText = function(text, x, y, ...rest) {
          rows.push({ text, x, y, alpha: ctx.globalAlpha, color: ctx.fillStyle });
          return fill.call(this, text, x, y, ...rest);
        };
        try { return original.call(this, world); } finally { ctx.fillText = fill; }
      };
      try { r.render(w); } finally { r.drawTexts = original; }
      return { rows, same: state === JSON.stringify([w.time, w.player.life, w.player.mana, w.texts]),
        fatal: __game.crash().fatal, png: document.getElementById('game').toDataURL() };
    });
    assert.ok(result.same, 'draw leaves gameplay and receipts unchanged');
    assert.equal(result.fatal, null);
    assert.deepEqual(result.rows.map(r => r.text), expected, name);
    fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(result.png.split(',')[1], 'base64'));
    delete result.png; results.push({ name, ...result }); return result.rows;
  };
  try {
    await win.loadURL(server.url);
    await run(async () => { await __game.hydrated(); __game.hold(true); });
    assert.equal(await run(() => __game.settings().summedDamageText), false);
    const option = await run(() => {
      document.getElementById('sm-keys').click();
      document.querySelector('[data-opttab="visuals"]').click();
      const button = document.getElementById('opt-damagesum'), before = button.textContent;
      button.click();
      return { before, after: document.getElementById('opt-damagesum').textContent,
        saved: JSON.parse(localStorage.getItem('arpg_settings_v1')).summedDamageText };
    });
    assert.deepEqual(option, { before: 'SEPARATE', after: 'SUMMED', saved: true });
    await run(async () => {
      for (let i = 0; i < 100; i++) {
        if ((await (await fetch('/__save/2')).json()).summedDamageText === true) return;
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      throw Error('Settings did not reach the isolated save file');
    });
    await win.loadURL(server.url);
    await run(async () => { await __game.hydrated(); __game.hold(true); });
    assert.equal(await run(() => __game.settings().summedDamageText), true, 'setting survives reload');
    await run(() => {
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('magician'); __game.ui.hideAll();
      const w = __game.world();
      w.zoneMap.qa_damage_text = { id: 'qa_damage_text', name: 'Damage Text Study', level: 1,
        size: { w: 1800, h: 1400 }, seed: 342,
        theme: { floor: '#303a37', grid: '#35433e', border: '#44544c', obstacle: '#444', obstacleEdge: '#555', accent: '#8cbba5' },
        layout: [], objective: { kind: 'safe' }, exits: [], map: { x: 9000, y: 9000 } };
      w.loadZone('qa_damage_text'); w.player.pos = { x: 900, y: 760 }; w.actors = [w.player];
      w.doodads = []; w.markDoodadsChanged(); w.time = 10; w.texts = []; w.flashes = [];
      window.damageTarget = w.createMonster('zombie', 1, 'enemy');
      damageTarget.pos = { x: 1030, y: 730 }; damageTarget.brain = undefined; w.actors.push(damageTarget);
      __game.settings().floatingTextAvoidance = false;
      w.damageText(damageTarget, 12.4, '#ffffff', 13, 'dmg');
    });
    await capture('first', ['12']);
    await run(() => {
      const w = __game.world(); w.time += 0.2; w.texts[0].life -= 0.2; w.texts[0].pos.y -= 28 * 0.2;
      w.damageText(damageTarget, 24.4, '#ffd24a', 18, 'dmg');
      w.time += 0.2; for (const t of w.texts) { t.life -= 0.2; t.pos.y -= 28 * 0.2; }
      w.damageText(damageTarget, 6.4, '#d88a50', 11, 'dmg');
      w.text(w.player.pos, '+5', '#8ae0a8', 12, 'gains');
      __game.settings().summedDamageText = false;
    });
    await capture('separate', ['12', '24', '6', '+5']);
    await run(() => { __game.settings().summedDamageText = true; });
    const summed = await capture('summed', ['43', '+5']);
    assert.equal(summed[0].alpha, 1);
    await run(() => { __game.settings().floatingTextAvoidance = true; });
    const avoided = await capture('avoidance', ['43', '+5']);
    assert.ok(avoided[0].x !== summed[0].x || avoided[0].y !== summed[0].y);
    await run(() => { __game.settings().floatKinds.dmg = false; });
    await capture('muted', ['+5']);
    await run(() => {
      const w = __game.world(); __game.settings().floatKinds.dmg = true; __game.settings().floatingTextAvoidance = false;
      w.time += 0.9; for (const t of w.texts) { t.life -= 0.9; t.pos.y -= 28 * 0.9; } w.texts = w.texts.filter(t => t.life > 0);
    });
    const fading = await capture('fading', ['43', '+5']);
    assert.ok(fading[0].alpha > 0 && fading[0].alpha < 1);
    await run(() => { __game.world().damageText(damageTarget, 10, '#ffffff', 13, 'dmg'); });
    await capture('new-burst', ['43', '+5', '10']);
    fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ option, results }, null, 2));
    console.log('PASS real option clicks and reload, actual canvas first/separate/summed/fade/reset, damage mute and body avoidance');
  } catch (e) { console.error(e.stack || String(e)); process.exitCode = 1; }
  finally { clearTimeout(timer); win.destroy(); server.server.close(); app.exit(process.exitCode || 0); }
});

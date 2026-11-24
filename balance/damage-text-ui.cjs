// Hidden, isolated client walkthrough. Build to balance/reports/damage-text-dist.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const { makeTempDir } = require('../scripts/temp-dir.cjs');
const scratch = makeTempDir('hollow-damage-text-');
const dir = path.join(__dirname, 'reports', 'damage-text');
fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(scratch, 'profile'));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timer = setTimeout(() => app.exit(1), 180000);
  const server = await startGameServer({ root: path.join(__dirname, 'reports', 'damage-text-dist'), savesDir: path.join(scratch, 'saves') });
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
          rows.push({ text, x, y, alpha: ctx.globalAlpha, color: ctx.fillStyle, font: ctx.font, width: ctx.measureText(text).width });
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
      const labels = document.getElementById('opt-damagelabels'), wasLabelled = labels.getAttribute('aria-pressed');
      labels.click();
      const size = document.getElementById('opt-damagesize');
      size.value = '125';
      size.dispatchEvent(new Event('input'));
      size.dispatchEvent(new Event('change'));
      const saved = JSON.parse(localStorage.getItem('arpg_settings_v1'));
      return { before, after: document.getElementById('opt-damagesum').textContent, wasLabelled,
        sizeLabel: document.getElementById('val-damagesize').textContent,
        saved: [saved.summedDamageText, saved.damageEffectLabels, saved.damageNumberSize] };
    });
    assert.deepEqual(option, { before: 'SEPARATE', after: 'SUMMED', wasLabelled: 'false', sizeLabel: '125%', saved: [true, true, 125] });
    await run(async () => {
      for (let i = 0; i < 100; i++) {
        const saved = await (await fetch('/__save/2')).json();
        if (saved.summedDamageText && saved.damageEffectLabels && saved.damageNumberSize === 125) return;
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      throw Error('Settings did not reach the isolated save file');
    });
    await win.loadURL(server.url);
    await run(async () => { await __game.hydrated(); __game.hold(true); });
    assert.deepEqual(await run(() => {
      const s = __game.settings(); return [s.summedDamageText, s.damageEffectLabels, s.damageNumberSize];
    }), [true, true, 125], 'all preferences survive reload');
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
      __game.settings().damageEffectLabels = false;
      w.damageText(damageTarget, 12.4, '#ffffff', 13, 'Strike');
    });
    const first = await capture('first', ['12']);
    assert.match(first[0].font, /15px/, 'summed 12 px font at 125%');
    await run(() => {
      const w = __game.world(); w.time += 0.2; w.texts[0].life -= 0.2; w.texts[0].pos.y -= 28 * 0.2;
      w.damageText(damageTarget, 24.4, '#ffd24a', 18, 'Strike');
      w.time += 0.2; for (const t of w.texts) { t.life -= 0.2; t.pos.y -= 28 * 0.2; }
      w.damageText(damageTarget, 6.4, '#d88a50', 11, 'Impaled');
      w.text(w.player.pos, '+5', '#8ae0a8', 12, 'gains');
      __game.settings().summedDamageText = false;
    });
    const separate = await capture('separate', ['12', '24', '6', '+5']);
    assert.ok(separate[0].alpha > 0 && separate[0].alpha < separate[2].alpha);
    assert.match(separate[0].font, /16.25px/);
    assert.match(separate[3].font, /12px/, 'size applies only to damage');
    await run(() => { __game.settings().damageEffectLabels = true; });
    const labelled = await capture('separate-labelled', ['12 · Strike', '24 · Strike', '6 · Impaled', '+5']);
    for (const [a, b] of [[labelled[0], labelled[1]], [labelled[1], labelled[2]], [labelled[0], labelled[2]]]) {
      const lower = a.y > b.y ? a : b, upper = lower === a ? b : a;
      const height = Number(lower.font.match(/([\d.]+)px/)[1]);
      assert.ok(Math.abs(a.x - b.x) >= (a.width + b.width) / 2 || lower.y - height >= upper.y,
        'near-simultaneous damage labels stay readable');
    }
    await run(() => { __game.settings().summedDamageText = true; });
    const subtotals = await capture('summed-labelled', ['37 · Strike', '6 · Impaled', '+5']);
    assert.ok(subtotals[1].y < subtotals[0].y, 'labels stack');
    await run(() => { __game.settings().damageEffectLabels = false; });
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
    await run(() => { __game.world().damageText(damageTarget, 10, '#ffffff', 13, 'Strike'); });
    const refreshed = await capture('refreshed', ['+5', '53']);
    assert.equal(refreshed[1].alpha, 1, 'a fading total is refreshed in place');
    await run(() => {
      const w = __game.world(), elapsed = w.texts.at(-1).maxLife + 0.01;
      w.time += elapsed; for (const t of w.texts) t.life -= elapsed;
      w.texts = w.texts.filter(t => t.life > 0);
    });
    await capture('expired', []);
    await run(() => { __game.world().damageText(damageTarget, 4, '#ffffff', 13, 'Strike'); });
    await capture('new-burst', ['4']);
    fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ option, results }, null, 2));
    console.log('PASS saved visual controls, canvas sizing and attribution in all four modes, fade/refresh/expiry, mute and body avoidance');
  } catch (e) { console.error(e.stack || String(e)); process.exitCode = 1; }
  finally { clearTimeout(timer); win.destroy(); server.server.close(); app.exit(process.exitCode || 0); }
});

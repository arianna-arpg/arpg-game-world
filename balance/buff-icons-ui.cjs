// Hidden native client and pixel checks. Build to balance/reports/buff-icons-dist first.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports', 'buff-icons');
fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, 'profile-' + process.pid));
app.disableHardwareAcceleration();
const report = { checks: [], errors: [] };
const write = () => fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
const image = (name, url) => fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
app.whenReady().then(async () => {
  const timer = setTimeout(() => { report.errors.push('timeout'); write(); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.join(__dirname, 'reports', 'buff-icons-dist'), savesDir: path.join(dir, 'saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1440, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = (fn, ...args) => win.webContents.executeJavaScript('(' + fn + ')(' + args.map(a => JSON.stringify(a)).join(',') + ')');
  try {
    await win.loadURL(server.url); await run(() => __game.hydrated());
    const helpers = buildSync({ stdin: { contents: "export {SKILLS} from './src/data/skills';export {makeSkillInstance} from './src/engine/skills';export {drawBuffIcon,buffIconRect,buffExpiryFraction} from './src/render/vis/buffIcons';export {configureSkillArtwork} from './src/render/skillIcons';", resolveDir: path.resolve(__dirname, '..'), loader: 'ts' }, bundle: true, write: false, format: 'iife', globalName: 'BuffQA' }).outputFiles[0].text;
    await win.webContents.executeJavaScript(helpers);
    await run(() => {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('warrior'); __game.ui.hideAll(); __game.step(90); __game.hold(true);
      const w = __game.world(), p = w.player; p.invulnerable = true; w.actors = [p]; w.texts = []; p.buffs.clear(); p.charges.clear();
      w.update = () => {}; // Freeze this disposable scene; real casts still own the buffs.
      window.buffInstances = ['war_cry', 'cloak', 'iron_ward'].map(id => BuffQA.makeSkillInstance({ ...BuffQA.SKILLS[id], requirements: undefined, useTime: 0, manaCost: 0 }));
      buffInstances.forEach((inst, i) => { p.skills[i] = inst; p.casting = null; p.useLock = 0; p.cooldowns.clear(); if (!w.useSkill(p, inst, p.pos, true)) throw Error('cast refused ' + inst.def.id); });
      p.cooldowns.clear(); __game.step(1);
      window.buffImage = () => document.getElementById('game').toDataURL('image/png');
      window.buffCrop = () => {
        const canvas = document.getElementById('game'), r = __game.renderer.hudSlotRects[0], k = r.w / 54;
        const scale = canvas.width / canvas.getBoundingClientRect().width;
        const x = Math.round(r.x * scale), y = Math.round((r.y - 52 * k) * scale), size = Math.round(22 * k * scale);
        const crop = document.createElement('canvas'); crop.width = crop.height = size;
        crop.getContext('2d').drawImage(canvas, x, y, size, size, 0, 0, size, size);
        return crop;
      };
    });
    for (const remaining of [6, 5, 2.5, .25]) {
      const result = await run(remaining => {
        const p = __game.world().player, buff = p.buffs.get('war_cry'); buff.remaining = remaining; __game.step(1);
        const crop = buffCrop(), data = crop.getContext('2d').getImageData(0, 0, crop.width, crop.height).data;
        const saturation = (start, end) => {
          let total = 0, n = 0;
          for (let y = Math.ceil(crop.height * start); y < Math.floor(crop.height * end); y++) for (let x = 2; x < crop.width - 2; x++) {
            const i = (y * crop.width + x) * 4; total += Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]); n++;
          }
          return total / n;
        };
        return { remaining, source: buff.def.sourceSkill?.id, top: saturation(.1, .4), bottom: saturation(.6, .9), image: buffImage(), icon: crop.toDataURL(), fatal: __game.crash().fatal };
      }, remaining);
      const { image: full, icon, ...facts } = result; report.checks.push(facts);
      image('buff-' + remaining, full); image('icon-' + remaining, icon);
      assert.equal(result.source, 'war_cry'); assert.equal(result.fatal, null);
      if (remaining >= 5) assert.ok(result.top > 3 && result.bottom > 3, 'full color above threshold');
      if (remaining === 2.5) assert.ok(result.top <= 1 && result.bottom > 3, 'top half gray, bottom half retains color');
      if (remaining === .25) assert.ok(result.top <= 1 && result.bottom <= 1, 'nearly expired icon is nearly all gray');
    }
    const hover = await run(() => {
      const labels = [], original = CanvasRenderingContext2D.prototype.fillText;
      const r = __game.renderer.hudSlotRects[0], k = r.w / 54;
      const canvas = document.getElementById('game'); canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: r.x + 11 * k, clientY: r.y - 41 * k, bubbles: true }));
      CanvasRenderingContext2D.prototype.fillText = function (t, ...args) { labels.push(String(t)); return original.call(this, t, ...args); };
      try { __game.step(1); } finally { CanvasRenderingContext2D.prototype.fillText = original; }
      return { labels, image: buffImage() };
    });
    image('hover', hover.image);
    assert.ok(hover.labels.some(t => t.includes('war cry')), 'original buff title is still hoverable');
    assert.ok(hover.labels.includes('Modifiers'), 'original modifier detail remains');
    report.checks.push('native hover title and modifiers');
    const refreshed = await run(() => {
      const w = __game.world(), p = w.player; p.casting = null; p.useLock = 0; p.cooldowns.clear();
      w.useSkill(p, buffInstances[0], p.pos, true); const reset = p.buffs.get('war_cry').remaining;
      p.updateTimers(7); __game.step(1); return { reset, removed: !p.buffs.has('war_cry') };
    });
    assert.equal(refreshed.reset, 6); assert.ok(refreshed.removed); report.checks.push('real refresh and expiry');
    // Standalone paint uses the same function to pin scaling and classic preference.
    const variants = await run(() => {
      const c = document.createElement('canvas'); c.width = 660; c.height = 180; const ctx = c.getContext('2d');
      ctx.fillStyle = '#181b20'; ctx.fillRect(0, 0, c.width, c.height);
      const source = BuffQA.SKILLS.war_cry, buff = { def: { type: 'buff', id: 'fixture', duration: 6, mods: [], sourceSkill: source }, remaining: 2.5, stacks: 3 };
      for (const [i, size] of [18, 22, 28, 44, 72].entries()) {
        BuffQA.drawBuffIcon(ctx, buff, { x: 15 + i * 110, y: 15, w: size, h: size });
        BuffQA.configureSkillArtwork(() => false);
        BuffQA.drawBuffIcon(ctx, buff, { x: 15 + i * 110, y: 100, w: size, h: size });
        BuffQA.configureSkillArtwork(() => true);
      }
      return c.toDataURL();
    });
    image('scaled-and-classic', variants);
    await win.setSize(960, 720);
    await run(() => new Promise(resolve => setTimeout(resolve, 150)));
    const crowded = await run(() => {
      const p = __game.world().player; p.buffs.clear(); p.charges.clear(); p.skills = p.skills.slice(0, 3);
      for (let i = 0; i < 18; i++) p.addBuff({ type: 'buff', id: 'test-' + i, duration: 10, mods: [], sourceSkill: buffInstances[i % 3].def });
      __game.step(2); return { image: buffImage(), fatal: __game.crash().fatal, width: innerWidth };
    });
    assert.equal(crowded.fatal, null); assert.ok(crowded.width <= 960);
    image('wrapped-small-viewport', crowded.image); report.checks.push('wrapped narrow hotbar');
    write(); console.log('PASS buff icons: native artwork, threshold, grayscale direction, hover, refresh, expiry and wrapped layout');
  } catch (error) { report.errors.push(error.stack || String(error)); write(); console.error(error); app.exitCode = 1; }
  finally { clearTimeout(timer); win.destroy(); server.server.close(); app.exit(report.errors.length ? 1 : 0); }
}).catch(error => { report.errors.push(String(error)); write(); app.exit(1); });

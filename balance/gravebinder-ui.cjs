// Real hidden client: allocation menu, authoritative world cues and native pixels.
const { app, BrowserWindow } = require('electron');
const { makeTempDir } = require('../scripts/temp-dir.cjs');
const { startGameServer } = require('../launcher/server.cjs');
const { buildSync } = require('esbuild');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const scratch = makeTempDir('hollow-gravebinder-');
const output = path.join(__dirname, 'reports', 'gravebinder');
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', path.join(scratch, 'profile'));
app.disableHardwareAcceleration();
const report = { checks: [], errors: [] };
const save = () => fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
app.whenReady().then(async () => {
  const timer = setTimeout(() => { report.errors.push('timeout'); save(); app.exit(1); }, 120000);
  let win, server;
  try {
    server = await startGameServer({ root: path.resolve(process.argv[2] || path.join(__dirname, 'reports', 'gravebinder-dist')), savesDir: path.join(scratch, 'saves') });
    win = new BrowserWindow({ show: false, width: 1440, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
    const run = (fn, ...args) => win.webContents.executeJavaScript('(' + fn + ')(' + args.map(a => JSON.stringify(a)).join(',') + ')');
    const capture = async name => fs.writeFileSync(path.join(output, name + '.png'), (await win.webContents.capturePage()).toPNG());
    await win.loadURL(server.url); await run(() => __game.hydrated());
    const helpers = buildSync({ stdin: { contents: "export {SKILLS} from './src/data/skills';export {makeSkillInstance} from './src/engine/skills';export {STAR_CENTER} from './src/data/passives';export {drawEffectVoice} from './src/render/vis/effectVoice';import './src/render/vis/summonPacts';", resolveDir: path.resolve(__dirname, '..'), loader: 'ts' }, bundle: true, write: false, format: 'iife', globalName: 'GraveQA' }).outputFiles[0].text;
    await win.webContents.executeJavaScript(helpers);
    await run(() => {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('necromancer'); __game.ui.hideAll(); __game.step(60); __game.hold(true);
      const w = __game.world(); w.player.invulnerable = true; w.meta.vocationPoints = 10; w.grantVocation('gravebinder');
      if (!w.allocateNode('voc_gravebinder_s1')) throw Error('Last Breath allocation failed');
      const ui = __game.ui; ui.toggleTree();
      const b = ui.treeBox; ui.treePan = { x: GraveQA.STAR_CENTER.x - (b.minX + b.w / 2), y: GraveQA.STAR_CENTER.y - (b.minY + b.h / 2) };
      ui.treeZoom = 8; ui.refreshTree();
    });
    const point = await run(() => {
      const el = document.querySelector('[data-node="voc_gravebinder_n1"]');
      if (!el) throw Error('missing Wraith choice node');
      const r = el.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    });
    win.webContents.sendInputEvent({ type: 'mouseMove', ...point });
    win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...point });
    win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...point });
    await run(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await run(() => document.querySelectorAll('.choice-popup .choice-opt').length), 3);
    await capture('wraith-choice');
    const choice = await run(() => { document.querySelector('.choice-opt[data-opt="rime"]').click(); return __game.world().meta.choices.voc_gravebinder_n1; });
    assert.deepEqual(choice, ['rime']); report.checks.push('native Wraith choice popup and allocation');
    await capture('gravebinder-tree');
    const facts = await run(() => {
      const w = __game.world(), p = w.player; __game.ui.hideAll();
      w.loadZone('crossroads');
      w.actors = [p]; w.flashes = []; w.texts = [];
      w.zone = { ...w.zone, objective: { kind: 'clear' } };
      for (const node of ['s2', 's3', 'n2', 'k1']) if (!w.allocateNode('voc_gravebinder_' + node)) throw Error('allocation failed ' + node);
      p.skills.fill(null); w.meta.knownSkills.clear();
      const inst = GraveQA.makeSkillInstance({ ...GraveQA.SKILLS.shambler_horde, requirements: undefined, useTime: 0, manaCost: 0,
        delivery: { type: 'summon', monsterId: 'zombie', count: 1, maxActive: 30, duration: 7 } }, 1, 0);
      inst.devGift = true; p.skills[0] = inst; w.meta.knownSkills.set(inst.def.id, inst);
      for (let i = 0; i < 9; i++) {
        const before = new Set(w.actors); w.executeSkill(p, inst, p.pos, { noCooldown: true, noRepeat: true });
        const body = w.actors.find(a => !before.has(a) && a.owner === p && !a.summonPactReward);
        if (!body) throw Error('body not born'); body.pos = { x: p.pos.x + 100, y: p.pos.y + 30 }; w.kill(body);
      }
      // Let actual clocks create collectible parts; do not substitute painted fixtures.
      for (let i = 0; i < 184; i++) w.update(0.1);
      // Rebuild one charging grave at the current time after the first outbreak.
      for (let i = 0; i < 3; i++) {
        const before = new Set(w.actors); w.executeSkill(p, inst, p.pos, { noCooldown: true, noRepeat: true });
        const body = w.actors.find(a => !before.has(a) && a.owner === p && !a.summonPactReward);
        body.pos = { x: p.pos.x + 100, y: p.pos.y + 30 }; w.kill(body);
      }
      // The new Wraith must survive the ordinary off-bar anchor sweep as well.
      for (let i = 0; i < 12; i++) w.update(0.05);
      const state = w.summonPacts.view(p), parts = state.find(s => s.id === 'patchwork').parts;
      if (!parts.length) throw Error('no visible parts generated');
      const cueCount = w.flashes.filter(f => f.summonPactCue && f.life > 0).length;
      w.flashes = w.flashes.filter(f => f.summonPactCue && f.life > 0); w.actors = w.actors.filter(a => !a.dead);
      const baseUpdate = w.update; w.update = () => {}; __game.step(1);
      window.graveAdvance = () => baseUpdate.call(w, 1 / 60);
      return { cueCount, parts: parts.length, wraiths: w.actors.filter(a => !a.dead && a.summonPactReward === 'last_breath').length,
        grave: state.find(s => s.id === 'burial_ground').graves.length, fatal: __game.crash().fatal };
    });
    assert(facts.cueCount >= 4 && facts.parts > 0 && facts.wraiths > 0 && facts.grave > 0); assert.equal(facts.fatal, null);
    await run(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await capture('gravebinder-world'); report.checks.push(facts);
    // Confirm all four silhouettes are nonempty and distinct through the native painter.
    const pixels = await run(() => {
      const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 120; const ctx = canvas.getContext('2d');
      const hashes = [];
      for (const [i, shape] of ['bone', 'claw', 'heart', 'skull'].entries()) {
        GraveQA.drawEffectVoice(ctx, 'summon_pact', { pos: { x: 60 + i * 120, y: 60 }, radius: 28, color: '#d5c8b0', life: 1, maxLife: 1,
          summonPactCue: { kind: 'part', shape, fill: 1, count: 1 } }, 1);
        const data = ctx.getImageData(i * 120, 0, 120, 120).data;
        let hash = 0, painted = 0;
        for (let n = 0; n < data.length; n++) { hash = (hash * 31 + data[n]) | 0; if (n % 4 === 3 && data[n]) painted++; }
        hashes.push({ hash, painted });
      }
      return { hashes, image: canvas.toDataURL() };
    });
    assert(pixels.hashes.every(r => r.painted > 100)); assert.equal(new Set(pixels.hashes.map(r => r.hash)).size, 4);
    fs.writeFileSync(path.join(output, 'part-silhouettes.png'), Buffer.from(pixels.image.split(',')[1], 'base64'));
    report.checks.push('four distinct part silhouettes; native world rendered without a fatal error');
    save(); console.log('PASS Gravebinder UI: choice, allocation, tree and live world cues');
  } catch (error) { report.errors.push(String(error.stack || error)); save(); console.error(error); }
  finally { clearTimeout(timer); win?.destroy(); server?.server.close(); app.exit(report.errors.length ? 1 : 0); }
}).catch(error => { console.error(error); app.exit(1); });

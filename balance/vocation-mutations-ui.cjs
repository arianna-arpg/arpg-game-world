// Hidden real-client course: five native pickers, granted actions and Sylvan bodies.
const { app, BrowserWindow } = require('electron');
const { makeTempDir } = require('../scripts/temp-dir.cjs');
const { startGameServer } = require('../launcher/server.cjs');
const { buildSync } = require('esbuild');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const scratch = makeTempDir('hollow-vocation-mutations-');
const output = path.join(__dirname, 'reports', 'vocation-mutations');
fs.mkdirSync(output, { recursive: true }); app.setPath('userData', path.join(scratch, 'profile')); app.disableHardwareAcceleration();
const report = { checks: [], errors: [] }, save = () => fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
app.whenReady().then(async () => {
  const timer = setTimeout(() => { report.errors.push('timeout'); save(); app.exit(1); }, 120000);
  let win, server;
  try {
    server = await startGameServer({ root: path.resolve(process.argv[2] || path.join(__dirname, 'reports', 'vocation-mutations-dist')), savesDir: path.join(scratch, 'saves') });
    win = new BrowserWindow({ show: false, width: 1440, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
    const run = (fn, ...args) => win.webContents.executeJavaScript('(' + fn + ')(' + args.map(a => JSON.stringify(a)).join(',') + ')');
    const frame = () => run(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const capture = async name => { await frame(); fs.writeFileSync(path.join(output, name + '.png'), (await win.webContents.capturePage()).toPNG()); };
    await win.loadURL(server.url); await run(() => __game.hydrated());
    const helpers = buildSync({ stdin: { contents: "export {SKILLS} from './src/data/skills'; export {makeSkillInstance} from './src/engine/skills'; export {mod} from './src/engine/stats'; export {STAR_CENTER} from './src/data/passives'; export {drawEffectVoice} from './src/render/vis/effectVoice'; export {drawSkillField} from './src/render/vis/skillFlightVoice'; import './src/render/vis/battleDoctrines';", resolveDir: path.resolve(__dirname, '..'), loader: 'ts' }, bundle: true, write: false, format: 'iife', globalName: 'VocationQA' }).outputFiles[0].text;
    await win.webContents.executeJavaScript(helpers);
    for (const [vocation, classId, options] of [['swarmlord', 'hivecaller', 3], ['packwarden', 'tamer', 3], ['warbringer', 'warrior', 3], ['stonewrought', 'juggernaut', 2], ['greenwarden', 'ranger', 3]]) {
      await run((vocation, classId) => {
        Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [] });
        __game.account().ledger.prologue_lived = 1; __game.devStartRun(classId); __game.ui.hideAll(); __game.step(2); __game.hold(true);
        const w = __game.world(); w.player.invulnerable = true; w.meta.vocationPoints = 20; w.grantVocation(vocation);
        if (!w.allocateNode('voc_' + vocation + '_s1')) throw Error('allocation failed');
        const ui = __game.ui; ui.toggleTree(); const b = ui.treeBox;
        ui.treePan = { x: VocationQA.STAR_CENTER.x - (b.minX + b.w / 2), y: VocationQA.STAR_CENTER.y - (b.minY + b.h / 2) };
        ui.treeZoom = 7; ui.refreshTree();
      }, vocation, classId);
      const point = await run(vocation => {
        const el = document.querySelector('[data-node="voc_' + vocation + '_n1"]'); if (!el) throw Error('missing choice node');
        const r = el.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
      }, vocation);
      assert(point.x > 0 && point.x < 1440 && point.y > 0 && point.y < 1000, vocation + ' choice on screen');
      win.webContents.sendInputEvent({ type: 'mouseMove', ...point });
      win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...point });
      win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...point }); await frame();
      assert.equal(await run(() => document.querySelectorAll('.choice-popup .choice-opt').length), options, vocation);
      await capture(vocation + '-choice');
      const facts = await run(vocation => {
        document.querySelector('.choice-opt[data-opt="1"]').click(); const w = __game.world();
        return { choices: w.meta.choices['voc_' + vocation + '_n1'], grants: [...w.localSeat.grantedInsts.values()].map(s => s.def.name), fatal: __game.crash().fatal };
      }, vocation);
      assert.deepEqual(facts.choices, ['1']); assert(facts.grants.length); assert.equal(facts.fatal, null); report.checks.push({ vocation, ...facts });
    }
    const sylvan = await run(() => {
      const w = __game.world(), p = w.player; __game.ui.hideAll(); w.loadZone('crossroads'); w.actors = [p]; w.flashes = []; w.texts = [];
      w.zone = { ...w.zone, objective: { kind: 'clear' } };
      for (const id of ['s3', 'n2', 'n5']) if (!w.allocateNode('voc_greenwarden_' + id)) throw Error('missing Sylvan/grove node');
      p.sheet.setSource('ui:personal', [VocationQA.mod('damage', 'increased', 1)]);
      const bodies = [];
      for (const [i, monster] of ['skeleton_warrior', 'skeleton_archer', 'skeletal_cryomancer'].entries()) {
        const inst = VocationQA.makeSkillInstance({ ...VocationQA.SKILLS.summon_skeleton, requirements: undefined, useTime: 0, cooldown: 0, manaCost: 0,
          delivery: { type: 'summon', monsterId: monster, count: 1, maxActive: 30, duration: 60 } }, 1, 0);
        inst.devGift = true; w.meta.knownSkills.set(inst.def.id, inst); p.skills[0] = inst;
        const before = new Set(w.actors); w.executeSkill(p, inst, p.pos, { noRepeat: true, noCooldown: true });
        const body = w.actors.find(a => !before.has(a) && a.owner === p); if (!body) throw Error('missing birth'); bodies.push(body);
      }
      for (let i = 0; i < 80; i++) w.update(.05);
      bodies.forEach((b, i) => { b.pos = { x: p.pos.x + (i - 1) * 65, y: p.pos.y + 65 }; b.facing = -Math.PI / 2; b.casting = null; });
      const growths = w.doctrineGrowths(p, 'sapling_ring').length;
      const result = { bodies: bodies.map(b => ({ name: b.name, look: b.look, faction: b.faction })), growths, fatal: __game.crash().fatal };
      w.update = () => {}; __game.step(1); return result;
    });
    assert(sylvan.bodies.every(b => b.faction === 'sylvan')); assert.equal(new Set(sylvan.bodies.map(b => b.look)).size, 3); assert(sylvan.growths); assert.equal(sylvan.fatal, null);
    await capture('sylvan-world'); report.checks.push(sylvan);
    const pixels = await run(() => {
      const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 160; const ctx = canvas.getContext('2d'), hashes = [];
      for (const [i, formation] of ['wedge', 'ring', 'scatter'].entries()) {
        VocationQA.drawEffectVoice(ctx, 'battle_doctrine', { pos: { x: i * 200 + 100, y: 80 }, radius: 70, color: '#b5d187', life: .7, maxLife: 1,
          doctrineCue: { kind: 'order', count: 6, max: 6, formation } }, .7);
        const data = ctx.getImageData(i * 200, 0, 200, 160).data; let hash = 0, painted = 0;
        for (let j = 0; j < data.length; j++) { hash = (hash * 31 + data[j]) | 0; if (j % 4 === 3 && data[j]) painted++; } hashes.push({ hash, painted });
      }
      return { hashes, image: canvas.toDataURL() };
    });
    assert(pixels.hashes.every(p => p.painted > 100)); assert.equal(new Set(pixels.hashes.map(p => p.hash)).size, 3);
    fs.writeFileSync(path.join(output, 'formations.png'), Buffer.from(pixels.image.split(',')[1], 'base64')); report.checks.push('distinct native formation silhouettes');
    const fields = await run(() => {
      const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 180; const ctx = canvas.getContext('2d'), hashes = [];
      for (const [i, skillId] of ['doctrine_stoneburst', 'doctrine_rootburst'].entries()) {
        if (!VocationQA.drawSkillField(ctx, { skillId, pos: { x: 100 + i * 200, y: 90 }, radius: 65, color: '#b5d187', facing: 0, shape: 0, delay: 0, exploded: true, linger: 3, tier: 0, telegraph: 0 }, 1)) throw Error('missing field profile');
        const data = ctx.getImageData(i * 200, 0, 200, 180).data; let hash = 0, painted = 0;
        for (let j = 0; j < data.length; j++) { hash = (hash * 31 + data[j]) | 0; if (j % 4 === 3 && data[j]) painted++; } hashes.push({ hash, painted });
      }
      return { hashes, image: canvas.toDataURL() };
    });
    assert(fields.hashes.every(f => f.painted > 100)); assert.notEqual(fields.hashes[0].hash, fields.hashes[1].hash);
    fs.writeFileSync(path.join(output, 'harvest-bursts.png'), Buffer.from(fields.image.split(',')[1], 'base64')); report.checks.push('distinct stone and seedburst ground profiles');
    save(); console.log('PASS five vocation choice menus, granted actions, Sylvan bodies and formation silhouettes');
  } catch (error) { report.errors.push(String(error.stack || error)); save(); console.error(error); }
  finally { clearTimeout(timer); win?.destroy(); server?.server.close(); app.exit(report.errors.length ? 1 : 0); }
}).catch(error => { console.error(error); app.exit(1); });

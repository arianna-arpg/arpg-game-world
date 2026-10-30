// Real game renderer and real spawning paths. Build reports/secondary-visuals/dist first.
// Hidden window, isolated profile/saves. Labels belong only to this acceptance sheet.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports', 'secondary-visuals');
const rows = JSON.parse(fs.readFileSync(path.join(dir, 'catalogue.json'), 'utf8'));
app.disableHardwareAcceleration(); app.setPath('userData', path.join(dir, 'profile-' + process.pid));
app.whenReady().then(async () => {
  const timer = setTimeout(() => app.exit(1), 180000);
  const server = await startGameServer({ root: path.join(dir, 'dist'), savesDir: path.join(dir, 'saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1440, height: 1080, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = []; win.webContents.on('console-message', e => { if (e.level === 'error') errors.push(e.message); });
  const run = fn => win.webContents.executeJavaScript('(' + fn.toString() + ')()');
  try {
    await win.loadURL(server.url);
    await run(async () => {
      for (let i = 0; i < 100 && !window.__game; i++) await new Promise(resolve => setTimeout(resolve, 50));
      if (!window.__game) throw Error('missing game bridge'); await __game.hydrated();
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('necromancer'); __game.ui.hideAll(); __game.hold(true);
      const w = __game.world();
      w.zoneMap.qa_secondary = { id: 'qa_secondary', name: 'Planted Weapons', level: 1, size: { w: 1800, h: 1400 }, seed: 8181,
        theme: { floor: '#303a37', grid: '#35433e', border: '#44544c', obstacle: '#444', obstacleEdge: '#555', accent: '#8cbba5' },
        layout: [], objective: { kind: 'safe' }, exits: [], map: { x: 9000, y: 9000 } };
      w.loadZone('qa_secondary'); w.player.pos = { x: 900, y: 700 }; w.actors = [w.player]; w.doodads = []; w.markDoodadsChanged();
      window.studyBodies = []; window.studyFlights = []; window.studyFacts = [];
      window.tickStudy = seconds => { for (let i = 0; i < Math.ceil(seconds * 60); i++) w.update(1 / 60); };
    });
    await win.webContents.executeJavaScript('window.studyRows=' + JSON.stringify(rows));
    for (let index = 0; index < rows.length; index++) {
      await win.webContents.executeJavaScript('window.studyIndex=' + index);
      await run(() => {
        const w = __game.world(), p = w.player, row = studyRows[studyIndex];
        if (row.path === 'pursuer') {
          const a = studyPursuer;
          if (!a || a.look !== row.look) throw Error('missing pursuer');
          studyBodies.push(a); studyFacts.push({ name: row.name, look: a.look, radius: a.radius, source: a.sourceSkillId });
          return;
        }
        w.actors = [p]; w.projectiles = []; w.zones = []; w.flashes = []; w.texts = [];
        p.pos = { x: 900, y: 700 }; p.casting = null; p.useLock = 0; p.cooldowns.clear();
        __game.devGrantSkill(row.id, 1, 2); const inst = p.skills[2]; p.fillResources();
        const aim = { x: 1180, y: 700 };
        if (row.path === 'landing') {
          w.executeSkill(p, inst, aim);
          studyFlights.push({ ...w.projectiles[0], pos: { ...p.pos }, dir: 0, age: .18 });
          tickStudy(1.1);
        } else if (row.path === 'hanging') {
          w.executeSkill(p, inst, aim);
        } else if (row.support) {
          inst.sockets[0] = { def: row.support, level: 1 };
          if (!w.useSkill(p, inst, aim)) throw Error('conversion refused: ' + row.name);
          tickStudy(1.8);
        } else {
          inst.treeNodes = ['pack_challenge', 'piercing_challenge'];
          w.executeSkill(p, inst, aim); tickStudy(.7);
        }
        if (row.path === 'effigy') window.studyPursuer = w.actors.find(a => a.sourceSkillId?.startsWith('__goad_creeper:'));
        const a = w.actors.find(a => !a.dead && a.look === row.look);
        if (!a) throw Error('real spawn absent: ' + row.name);
        studyFacts.push({ name: row.name, look: a.look, radius: a.radius, kind: a.construct?.kind, source: a.sourceSkillId });
        // Freeze the captured object outside the sim while the next case runs.
        a.casting = null; a.spawnedAt = -100; a.facing = a.facingPrev = -.5;
        studyBodies.push(a);
      });
    }
    await run(() => {
      const w = __game.world(), r = __game.renderer;
      w.actors = [w.player, ...studyBodies]; w.projectiles = []; w.zones = []; w.flashes = []; w.texts = [];
      studyBodies.forEach((a, i) => { a.pos = { x: 650 + i % 4 * 150, y: 580 + Math.floor(i / 4) * 115 }; });
      w.player.pos = { x: 900, y: 760 }; r.render(w);
      window.paintStudyBody = (ctx, a, scale, mono = false, oldLook) => {
        const previous = { ctx: r.ctx, color: a.color, look: a.look, construct: a.construct, badge: a.presenceBadge, source: a.sourceSkillId };
        try {
          r.ctx = ctx; a.construct = undefined; a.presenceBadge = undefined; a.sourceSkillId = undefined;
          if (mono) a.color = '#bac4cd'; if (oldLook) a.look = oldLook;
          ctx.save(); ctx.scale(scale, scale); ctx.translate(-a.pos.x, -a.pos.y); r.drawActor(a, w); ctx.restore();
        } finally { r.ctx = previous.ctx; a.color = previous.color; a.look = previous.look; a.construct = previous.construct;
          a.presenceBadge = previous.badge; a.sourceSkillId = previous.source; }
      };
      window.paintStudyFlight = (ctx, p, scale) => {
        const previous = { ctx: r.ctx, shots: w.projectiles };
        try { r.ctx = ctx; w.projectiles = [p]; ctx.save(); ctx.scale(scale, scale);
          ctx.translate(-p.pos.x, -p.pos.y); r.drawProjectiles(w); ctx.restore();
        } finally { r.ctx = previous.ctx; w.projectiles = previous.shots; }
      };
    });
    const facts = await run(() => {
      const c = document.createElement('canvas'); c.width = c.height = 100; const ctx = c.getContext('2d', { willReadFrequently: true });
      let checked = 0;
      for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const masks = new Set();
        for (const a of studyBodies) {
          a.facing = a.facingPrev = facing; ctx.clearRect(0, 0, 100, 100);
          ctx.save(); ctx.translate(50, 50); paintStudyBody(ctx, a, 1, true); ctx.restore();
          const px = ctx.getImageData(0, 0, 100, 100).data;
          const alpha = Array.from(px).filter((_, i) => i % 4 === 3);
          if (alpha.filter(v => v > 40).length < 25) throw Error('invisible: ' + a.look);
          const key = alpha.map(v => v > 80 ? '1' : '0').join('');
          if (masks.has(key)) throw Error('indistinct: ' + a.look); masks.add(key); checked++;
        }
      }
      // Physical embeds keep solid artwork despite being untargetable;
      // native invisibility still wins over that presentation policy.
      const lance = studyBodies[studyRows.findIndex(row => row.id === 'impale_lance')];
      const sample = () => {
        ctx.clearRect(0, 0, 100, 100); ctx.save(); ctx.translate(50, 50);
        paintStudyBody(ctx, lance, 1, true); ctx.restore();
        return Array.from(ctx.getImageData(0, 0, 100, 100).data).filter((_, i) => i % 4 === 3).reduce((a, b) => a + b, 0);
      };
      const solid = sample(); lance.untargetable = false; const targetable = sample(); lance.untargetable = true;
      if (solid < targetable * .9) throw Error('solid embed ghosted');
      lance.sheet.setSource('qa-invisible', [{ stat: 'invisible', kind: 'override', value: 1 }]);
      const hidden = sample(); lance.sheet.removeSource('qa-invisible');
      if (hidden >= solid * .6) throw Error('appearance overrode invisibility');
      studyBodies.forEach(a => { a.facing = a.facingPrev = -.5; });
      return { checked, solid, hidden, bodies: studyFacts, fatal: __game.crash().fatal };
    });
    assert.equal(facts.checked, 32); assert.equal(facts.fatal, null);
    for (const bright of [false, true]) {
      await win.webContents.executeJavaScript('window.studyBright=' + bright);
      const png = await run(() => {
        const c = document.createElement('canvas'); c.width = 1200; c.height = 820; const ctx = c.getContext('2d');
        const fg = studyBright ? '#233039' : '#e2e8e8';
        ctx.fillStyle = studyBright ? '#d8d6cc' : '#121a20'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = fg; ctx.font = '25px sans-serif'; ctx.fillText('HOLLOW WAKE / LANDED WEAPONS & SECONDARY BODIES', 28, 40);
        ctx.font = '15px sans-serif'; ctx.fillText('Production renderer / enlarged body / native size / same-color native size', 28, 70);
        studyBodies.forEach((a, i) => {
          const x = i % 4 * 300, y = 100 + Math.floor(i / 4) * 220;
          for (const [dx, scale, mono] of [[80, 3.3, false], [194, 1, false], [250, 1, true]]) {
            ctx.save(); ctx.translate(x + dx, y + 75); paintStudyBody(ctx, a, scale, mono); ctx.restore();
          }
          ctx.fillStyle = fg; ctx.font = '17px sans-serif'; ctx.fillText(studyRows[i].name, x + 24, y + 155, 270);
        });
        ctx.fillStyle = fg; ctx.font = '18px sans-serif'; ctx.fillText('Pinning Spear: old wall body → spear body     |     Real airborne weapons', 28, 586);
        const pin = studyBodies[studyRows.findIndex(row => row.id === 'pinning_spear')];
        ctx.save(); ctx.translate(85, 665); paintStudyBody(ctx, pin, 3, false, 'construct_barrier_stone'); ctx.restore();
        ctx.save(); ctx.translate(250, 665); paintStudyBody(ctx, pin, 3); ctx.restore();
        studyFlights.forEach((p, i) => {
          ctx.save(); ctx.translate(520 + i * 240, 665); paintStudyFlight(ctx, p, 3); ctx.restore();
          ctx.fillStyle = fg; ctx.font = '15px sans-serif'; ctx.fillText(p.inst.def.name, 460 + i * 240, 735, 220);
        });
        return c.toDataURL('image/png').split(',')[1];
      });
      fs.writeFileSync(path.join(dir, bright ? 'secondary-bright.png' : 'secondary-dark.png'), Buffer.from(png, 'base64'));
    }
    const worldPng = await run(() => {
      const w = __game.world();
      const gnoll = w.createMonster('gnoll_impaler', 1, 'enemy'); gnoll.pos = { x: 1080, y: 790 }; gnoll.brain = undefined;
      w.actors.push(gnoll); w.projectiles = studyFlights; __game.renderer.render(w);
      return document.querySelector('#game').toDataURL('image/png').split(',')[1];
    });
    fs.writeFileSync(path.join(dir, 'secondary-world.png'), Buffer.from(worldPng, 'base64'));
    const peer = await run(() => { __game.applySnap(__game.snapshot()); __game.renderer.render(__game.world()); return __game.crash().fatal; });
    assert.equal(peer, null); assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(dir, 'checks.json'), JSON.stringify(facts, null, 2));
    console.log('PASS 8 real secondary spawns, 32 native silhouettes, flight/body continuity, dark/bright studies and peer frame');
  } catch (e) { console.error(e, errors); process.exitCode = 1; }
  finally { clearTimeout(timer); win.destroy(); server.server.close(); app.exit(process.exitCode || 0); }
}).catch(e => { console.error(e); app.exit(1); });

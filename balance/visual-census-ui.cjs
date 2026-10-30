// Build reports/visual-census/dist, then run after presencevisuals + skillflights.
// Uses the real renderer and real casts in a hidden client with isolated saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports', 'visual-census');
const actors = JSON.parse(fs.readFileSync(path.join(dir, 'actors.json'), 'utf8'));
const flights = JSON.parse(fs.readFileSync(path.join(dir, 'flights.json'), 'utf8'));
app.disableHardwareAcceleration(); app.setPath('userData', path.join(dir, 'profile-' + process.pid));
app.whenReady().then(async () => {
  const timer = setTimeout(() => app.exit(1), 180000);
  const server = await startGameServer({ root: path.join(dir, 'dist'), savesDir: path.join(dir, 'saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1500, height: 1080, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = []; win.webContents.on('console-message', e => { if (e.level === 'error') errors.push(e.message); });
  const run = fn => win.webContents.executeJavaScript('(' + fn.toString() + ')()');
  const capture = async (name, fn) => fs.writeFileSync(path.join(dir, name), Buffer.from(await run(fn), 'base64'));
  try {
    await win.loadURL(server.url);
    await run(async () => {
      for (let i = 0; i < 100 && !window.__game; i++) await new Promise(resolve => setTimeout(resolve, 50));
      if (!window.__game) throw Error('game bridge missing'); await __game.hydrated();
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('necromancer'); __game.ui.hideAll(); __game.hold(true);
      const w = __game.world();
      w.zoneMap.qa_census = { id: 'qa_census', name: 'Visual census', level: 1, size: { w: 1800, h: 1400 }, seed: 9181,
        theme: { floor: '#303a37', grid: '#35433e', border: '#44544c', obstacle: '#444', obstacleEdge: '#555', accent: '#8cbba5' },
        layout: [], objective: { kind: 'safe' }, exits: [], map: { x: 9000, y: 9000 } };
      w.loadZone('qa_census'); w.player.pos = { x: 900, y: 700 }; w.doodads = []; w.markDoodadsChanged();
      window.censusBodies = []; window.censusFlights = [];
    });
    await win.webContents.executeJavaScript('window.actorRows=' + JSON.stringify(actors) + '; window.flightRows=' + JSON.stringify(flights));
    await run(() => {
      const w = __game.world(), p = w.player;
      censusBodies = actorRows.map(row => {
        const a = w.createMonster(row.id, 1, 'enemy'); a.brain = undefined; a.pos = { x: 900, y: 700 };
        a.spawnedAt = -10; a.facing = -.4; if (a.look !== row.look) throw Error(row.id + ' look');
        return a;
      });
      // Capture armed ambushers after their native reveal has finished.
      w.actors = [p, ...censusBodies];
      censusBodies.forEach(a => w.springAmbush(a));
      for (let i = 0; i < 8; i++) w.update(.25);
      for (const row of flightRows) {
        w.actors = [p]; w.projectiles = []; w.zones = []; p.pos = { x: 900, y: 700 }; p.casting = null;
        __game.devGrantSkill(row.id, 1, 2); const inst = p.skills[2], d = inst.def.delivery;
        if (inst.def.targeting?.target === 'corpse') {
          const dead = w.createMonster('zombie', 1, 'enemy'); dead.pos = { x: 1080, y: 700 };
          w.actors.push(dead); w.kill(dead, false);
        }
        const presses = d.type === 'projectile' && d.caroms ? d.caroms.anchors + (d.caroms.hang ? 1 : 0) : 1;
        for (let i = 0; i < presses; i++) w.executeSkill(p, inst, { x: 1080 + i * 25, y: 700 + i % 2 * 60 });
        const shot = w.projectiles.find(p => p.inst.def.id === row.id);
        if (!shot) throw Error('real flight absent: ' + row.id);
        censusFlights.push({ ...shot, pos: { x: 900, y: 700 }, dir: 0, age: .1 });
      }
      w.actors = [p]; w.projectiles = []; w.flashes = []; w.texts = []; w.zones = [];
      const r = __game.renderer; r.render(w);
      window.paintCensusBody = (ctx, a, scale, mono = false, old = false) => {
        const previous = { ctx: r.ctx, look: a.look, color: a.color };
        try {
          r.ctx = ctx; if (mono) a.color = '#b9c3cf'; if (old) a.look = undefined;
          ctx.save(); ctx.scale(scale, scale); ctx.translate(-a.pos.x, -a.pos.y); r.drawActor(a, w); ctx.restore();
        } finally { r.ctx = previous.ctx; a.look = previous.look; a.color = previous.color; }
      };
      window.paintCensusFlight = (ctx, p, scale, age, mono = false) => {
        const previous = { ctx: r.ctx, shots: w.projectiles, color: p.color, age: p.age };
        try {
          r.ctx = ctx; w.projectiles = [p]; if (mono) p.color = '#b9c3cf'; p.age = age;
          ctx.save(); ctx.scale(scale, scale); ctx.translate(-p.pos.x, -p.pos.y); r.drawProjectiles(w); ctx.restore();
        } finally { r.ctx = previous.ctx; w.projectiles = previous.shots; p.color = previous.color; p.age = previous.age; }
      };
    });
    const facts = await run(() => {
      const c = document.createElement('canvas'); c.width = c.height = 180; const ctx = c.getContext('2d', { willReadFrequently: true });
      let checked = 0, moving = 0;
      const pixels = fn => { ctx.clearRect(0, 0, 180, 180); ctx.save(); ctx.translate(90, 90); fn(); ctx.restore(); return ctx.getImageData(0, 0, 180, 180).data; };
      for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const signatures = new Set();
        for (const a of censusBodies) {
          a.facing = facing;
          const px = pixels(() => paintCensusBody(ctx, a, 1, true));
          const alpha = Array.from(px).filter((_, i) => i % 4 === 3);
          if (alpha.filter(v => v > 80).length < 30) throw Error('invisible: ' + a.look);
          const key = alpha.map(v => v > 80 ? '1' : '0').join('');
          if (signatures.has(key)) throw Error('duplicate: ' + a.look); signatures.add(key);
          const before = pixels(() => paintCensusBody(ctx, a, 1, true, true));
          if (key === Array.from(before).filter((_, i) => i % 4 === 3).map(v => v > 80 ? '1' : '0').join('')) throw Error('unchanged body: ' + a.look);
          checked++;
        }
      }
      for (const p of censusFlights) {
        const first = pixels(() => paintCensusFlight(ctx, p, 1, .1, true));
        const later = pixels(() => paintCensusFlight(ctx, p, 1, .3, true));
        if (Array.from(first).filter((v, i) => i % 4 === 3 && v > 40).length < 5) throw Error('invisible flight: ' + p.inst.def.id);
        if (JSON.stringify(Array.from(first)) !== JSON.stringify(Array.from(later))) moving++;
      }
      if (moving < censusFlights.length * .8) throw Error('lost flight animation');
      censusBodies.forEach(a => { a.facing = -.4; });
      return { bodies: censusBodies.length, checked, flights: censusFlights.length, moving, fatal: __game.crash().fatal };
    });
    assert.equal(facts.bodies, 9); assert.equal(facts.checked, 36); assert.equal(facts.flights, flights.length); assert.equal(facts.fatal, null);
    for (const bright of [false, true]) {
      await win.webContents.executeJavaScript('window.censusBright=' + bright);
      await capture(bright ? 'bodies-bright.png' : 'bodies-dark.png', () => {
        const c = document.createElement('canvas'); c.width = 1320; c.height = 990; const ctx = c.getContext('2d');
        const fg = censusBright ? '#233039' : '#e2e8e8'; ctx.fillStyle = censusBright ? '#d8d6cc' : '#121a20'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = fg; ctx.font = '25px sans-serif'; ctx.fillText('HOLLOW WAKE / REMAINING CATALOGUE BODIES', 28, 40);
        ctx.font = '15px sans-serif'; ctx.fillText('Previous native body / new enlarged body / new native body / same-color native body', 28, 70);
        censusBodies.forEach((a, i) => {
          const x = i % 3 * 440, y = 110 + Math.floor(i / 3) * 280;
          for (const [dx, scale, mono, old] of [[38, 1, false, true], [145, Math.min(3, 64 / a.radius), false, false], [280, 1, false, false], [365, 1, true, false]]) {
            ctx.save(); ctx.translate(x + dx, y + 85); paintCensusBody(ctx, a, scale, mono, old); ctx.restore();
          }
          ctx.fillStyle = fg; ctx.font = '18px sans-serif'; ctx.fillText(actorRows[i].name, x + 24, y + 200, 410);
        });
        return c.toDataURL('image/png').split(',')[1];
      });
      await capture(bright ? 'weapons-bright.png' : 'weapons-dark.png', () => {
        const c = document.createElement('canvas'); c.width = 1500; c.height = 100 + Math.ceil(censusFlights.length / 6) * 165; const ctx = c.getContext('2d');
        const fg = censusBright ? '#233039' : '#e2e8e8'; ctx.fillStyle = censusBright ? '#d8d6cc' : '#121a20'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = fg; ctx.font = '25px sans-serif'; ctx.fillText('HOLLOW WAKE / REUSABLE WEAPON FAMILIES', 28, 40);
        ctx.font = '15px sans-serif'; ctx.fillText('Two enlarged poses / native size / shared color throughout; native collision boundaries retained', 28, 70);
        censusFlights.forEach((p, i) => {
          const x = i % 6 * 250, y = 100 + Math.floor(i / 6) * 165;
          for (const [dx, scale, age] of [[82, Math.min(3, 22 / p.radius), .1], [172, Math.min(3, 22 / p.radius), .3], [225, 1, .1]]) {
            ctx.save(); ctx.translate(x + dx, y + 58); paintCensusFlight(ctx, p, scale, age, true); ctx.restore();
          }
          ctx.fillStyle = fg; ctx.font = '14px sans-serif'; ctx.fillText(p.inst.def.name, x + 16, y + 120, 230);
        });
        return c.toDataURL('image/png').split(',')[1];
      });
    }
    await capture('census-world.png', () => {
      const w = __game.world();
      censusBodies.forEach((a, i) => { a.pos = { x: 650 + i % 3 * 230, y: 510 + Math.floor(i / 3) * 120 }; });
      w.player.pos = { x: 900, y: 800 }; w.actors = [w.player, ...censusBodies]; w.projectiles = [];
      __game.renderer.render(w); return document.querySelector('#game').toDataURL('image/png').split(',')[1];
    });
    assert.equal(await run(() => { __game.applySnap(__game.snapshot()); __game.renderer.render(__game.world()); return __game.crash().fatal; }), null);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(dir, 'checks.json'), JSON.stringify(facts, null, 2));
    console.log(`PASS 9 real actor bodies, 36 distinct native silhouettes, ${facts.flights} real flights, animation, dark/bright studies and peer frame`);
  } catch (e) { console.error(e, errors); process.exitCode = 1; }
  finally { clearTimeout(timer); win.destroy(); server.server.close(); app.exit(process.exitCode || 0); }
}).catch(e => { console.error(e); app.exit(1); });

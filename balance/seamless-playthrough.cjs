// Player-facing acceptance: default build, actual Begin/class/Continue buttons.
// No debug start, no replacement generator and no predecessor source snapshots.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const out = path.join(__dirname, 'reports', 'seamless-playthrough');
fs.mkdirSync(out, { recursive: true });
app.setPath('userData', path.join(out, 'profile-' + process.pid));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const report = { checks: [], errors: [] };
  const record = (name, value) => { report.checks.push({ name, ...value }); console.log(JSON.stringify({ name, ...value })); };
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(out, 'saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1440, height: 900,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.webContents.on('console-message', e => { if (e.level === 'error') report.errors.push(e.message); });
  const run = async (fn, ...args) => {
    const result = await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await (' + fn + ')(' + args.map(a => JSON.stringify(a)).join(',') + ')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
    if (!result.ok) throw Error(result.error); return result.value;
  };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const boot = async () => { await win.loadURL(server.url); await run(async () => {
    while (!window.__game) await new Promise(r => setTimeout(r, 40));
    __game.hold(true); await __game.hydrated();
  }); };
  const ready = async () => {
    for (let i = 0; i < 600; i++) {
      const state = await run(() => {
        // A completed Continue must be inspected before simulating collisions
        // or combat. Only drive ticks while entry still needs its loading gate.
        if (__game.loading.active || !__game.world().massRuntime) __game.step(1, 20);
        const w = __game.world();
        return { fatal: __game.crash().fatal, loading: __game.loading.active,
          mass: !!w.massRuntime, ready: w.massRuntime?.nativeReadiness(w).status };
      });
      if (state.fatal) throw Error(JSON.stringify(state));
      if (state.mass && state.ready === 'ready' && !state.loading) return;
      await pause(30);
    }
    throw Error('Normal entry did not reach a ready continuous world');
  };
  const shot = async name => {
    const png = await run(() => document.getElementById('game').toDataURL('image/png'));
    fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(png.split(',')[1], 'base64'));
  };
  const timer = setTimeout(() => { console.error('Seamless playthrough timed out'); app.exit(1); }, 360000);
  try {
    await boot();
    await run(() => document.getElementById('sm-start').click());
    await pause(100);
    const chosen = await run(() => {
      const card = document.querySelector('#class-select .class-card[data-locked="false"]');
      if (!card) throw Error('Begin did not show playable classes');
      const id = card.dataset.id; card.click(); return id;
    });
    await ready();
    const fresh = await run(() => {
      const w = __game.world(), m = w.massRuntime;
      window.__playtestHero = w.player; window.__playtestLoads = 0;
      const load = w.loadZone;
      w.loadZone = function (...args) { __playtestLoads++; return load.apply(this, args); };
      return { zone: w.zone.id, retained: !!__game.retained(), seed: m.generator.run.seed,
        classId: w.meta.classDef.id, spawn: { ...w.player.pos },
        settlement: m.settlement.zone.size, departures: m.journey.departurePoints,
        trails: m.journey.trails.slice(0, 4), enemies: w.actors.filter(a => a.team === 'enemy' && !a.dead).length };
    });
    assert.equal(fresh.zone, 'worldmass_expedition'); assert.equal(fresh.retained, false); assert.equal(fresh.classId, chosen);
    record('Begin reaches the continuous world', fresh); await shot('lastlight');
    const moved = await run(() => {
      const w = __game.world(), before = { ...w.player.pos };
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', code: 'KeyD', bubbles: true }));
      try { __game.step(25, 20); } finally { window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd', code: 'KeyD', bubbles: true })); }
      return { before, after: { ...w.player.pos }, loads: __playtestLoads, sameHero: w.player === __playtestHero };
    });
    assert(moved.after.x > moved.before.x + 10, 'Normal movement input must move the hero');
    assert.equal(moved.loads, 0); assert(moved.sameHero); record('Keyboard movement', moved);
    // Walk the actual opening road using ordinary movement intents. The hero's
    // position, terrain and opponents are never moved to manufacture a crossing.
    const journey = await run(async () => {
      const w = __game.world(), m = w.massRuntime, trail = m.journey.trails[0];
      const innDoor = w.doodads.filter(d => d.door)
        .sort((a,b) => Math.hypot(a.pos.x-w.player.pos.x,a.pos.y-w.player.pos.y)-Math.hypot(b.pos.x-w.player.pos.x,b.pos.y-w.player.pos.y))[0];
      const cells = new Set(), frames = [], points = [
        ...(innDoor ? [{ x: innDoor.pos.x, y: innDoor.pos.y - 55 }, { x: innDoor.pos.x, y: innDoor.pos.y + 65 }] : []),
        ...trail.points];
      let target = points.shift(), distance = 0, before = { ...w.player.pos }, stalled = 0;
      __game.devInput(() => {
        const step = w.walk.pathStep(w.player.pos, target) ?? target;
        const dx = step.x - w.player.pos.x, dy = step.y - w.player.pos.y, d = Math.hypot(dx, dy);
        return { dx: d ? dx / d : 0, dy: d ? dy / d : 0, aim: target, held: [], edge: [] };
      });
      try {
        for (let i = 0; i < 1800; i++) {
          const t = performance.now(); __game.step(1, 40); frames.push(performance.now() - t);
          if (__game.crash().fatal) throw Error(JSON.stringify(__game.crash().fatal));
          if (w.player.dead || w.gameOver) throw Error('Hero died on the opening road');
          const p = w.player.pos, moved = Math.hypot(p.x - before.x, p.y - before.y);
          distance += moved; stalled = moved < .1 ? stalled + 1 : 0; before = { ...p };
          const at = m.walk.at(p.x, p.y); cells.add(at.cx + ',' + at.cy);
          if (Math.hypot(p.x - target.x, p.y - target.y) < 24) {
            if (!points.length) break;
            target = points.shift();
          }
          if (stalled > 150) throw Error('Opening road blocked at ' + JSON.stringify({ pos: p, target,
            door: innDoor && { pos: innDoor.pos, state: innDoor.door }, loading: __game.loading.active,
            panels: [...document.querySelectorAll('[id]')].filter(e => /menu|dialogue|story|card/.test(e.id) && e.offsetHeight > 0 && !e.classList.contains('hidden')).map(e => e.id) }));
          if (i % 8 === 0) await new Promise(r => setTimeout(r, 0));
        }
      } finally { __game.devInput(null); }
      frames.sort((a,b) => a-b);
      return { distance, cells: [...cells], pos: { ...w.player.pos }, target, remaining: points.length,
        zone: w.zone.id, loads: __playtestLoads, sameHero: w.player === __playtestHero,
        frameMsP50: frames[Math.floor(frames.length * .5)], frameMsP95: frames[Math.floor(frames.length * .95)] };
    });
    assert(journey.cells.length > 1); assert.equal(journey.loads, 0); assert(journey.sameHero);
    assert.equal(journey.remaining, 0); assert(Math.hypot(journey.pos.x - journey.target.x, journey.pos.y - journey.target.y) < 24);
    record('Walk from Lastlight to the western camp', journey); await shot('western-road');
    const combat = await run(async () => {
      const w = __game.world();
      const target = w.actors.filter(a => a.team === 'enemy' && !a.dead && a.skills.some(Boolean))
        .sort((a,b) => Math.hypot(a.pos.x-w.player.pos.x,a.pos.y-w.player.pos.y)-Math.hypot(b.pos.x-w.player.pos.x,b.pos.y-w.player.pos.y))[0];
      if (!target) throw Error('No opponents at the camp');
      const before = target.life;
      __game.devInput(() => {
        const p = w.player.pos, goal = target.pos, d = Math.hypot(goal.x-p.x,goal.y-p.y);
        const step = w.walk.pathStep(p,goal) ?? goal, len = Math.hypot(step.x-p.x,step.y-p.y);
        return { dx: d > 65 && len ? (step.x-p.x)/len : 0, dy: d > 65 && len ? (step.y-p.y)/len : 0,
          aim: { ...goal }, held: [d < 260], edge: [] };
      });
      try {
        for (let i=0;i<300&&!target.dead&&!w.player.dead;i++) {
          __game.step(1,40); if(i%8===0) await new Promise(r=>setTimeout(r,0));
        }
      } finally { __game.devInput(null); }
      return { target: target.name, before, after: target.life, killed: target.dead,
        heroAlive: !w.player.dead, loads: __playtestLoads, fatal: __game.crash().fatal };
    });
    assert(combat.after < combat.before, 'Ordinary attack input must damage an actual camp opponent');
    assert(combat.heroAlive); assert.equal(combat.loads,0); assert.equal(combat.fatal,null);
    record('Combat at the generated camp',combat); await shot('camp-combat');
    const saved = await run(async () => {
      __game.save(); await __game.flushRunSave(); const w = __game.world();
      return { charId: w.meta.charId, seed: w.massRuntime.generator.run.seed, pos: { ...w.player.pos }, zone: w.zone.id };
    });
    await boot();
    await run(async () => {
      for (let i = 0; i < 100 && !document.querySelector('#sm-continue:not([disabled])'); i++) await new Promise(r => setTimeout(r, 40));
      const button = document.querySelector('#sm-continue:not([disabled])');
      if (!button) throw Error('No Continue button after saving'); button.click();
    });
    await ready();
    const resumed = await run(() => { const w = __game.world(); return { charId: w.meta.charId,
      seed: w.massRuntime.generator.run.seed, pos: { ...w.player.pos }, zone: w.zone.id }; });
    assert.deepEqual(resumed, saved); record('Disk save and normal Continue', resumed); await shot('continued');
    assert.deepEqual(report.errors, []); report.status = 'passed';
  } catch (error) {
    try { report.crash = await run(() => __game.crash()); } catch {}
    report.status = 'failed'; report.failure = error.stack || String(error); console.error(report.failure);
    try { await shot('failure'); } catch {}
    process.exitCode = 1;
  } finally {
    clearTimeout(timer); fs.writeFileSync(path.join(out, 'REPORT.json'), JSON.stringify(report, null, 2) + '\n');
    win.destroy(); server.server.close(); app.exit(process.exitCode || 0);
  }
}).catch(error => { console.error(error); app.exit(1); });

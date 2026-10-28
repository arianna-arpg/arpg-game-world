// Player-facing acceptance: one account tutorial, direct Mu handoff and saved resume.
// No debug start, no replacement generator and no predecessor source snapshots.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const out = path.join(__dirname, 'reports', 'seamless-playthrough');
fs.mkdirSync(out, { recursive: true });
app.setPath('userData', path.join(out, 'profile-' + process.pid));
if (!process.env.WORLD_GPU) app.disableHardwareAcceleration();
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
    const png = await win.webContents.capturePage();
    fs.writeFileSync(path.join(out, name + '.png'), png.toPNG());
  };
  const timer = setTimeout(() => { console.error('Seamless playthrough timed out'); app.exit(1); }, 360000);
  try {
    await boot();
    assert.equal(await run(() => document.getElementById('sm-start').textContent), 'Begin');
    await run(() => document.getElementById('sm-start').click());
    for(let i=0;i<300;i++){
      if(await run(()=>!__game.loading.active && __game.world().scene?.def.id==='prologue'))break;
      await pause(30);
    }
    const tutorial=await run(async()=>{
      const w=__game.world(), stages=new Set();let presses=0;
      if(w.scene?.def.id!=='prologue'||w.massRuntime)throw Error('Begin did not start the local tutorial');
      if(w.account!==__game.account()||w.account.roster.length||w.account.lifetimeCredits)throw Error('Tutorial did not use the new account');
      __game.devInput(()=>{
        const target=w.actors.filter(a=>a.team==='enemy'&&!a.dead).sort((a,b)=>Math.hypot(a.pos.x-w.player.pos.x,a.pos.y-w.player.pos.y)-Math.hypot(b.pos.x-w.player.pos.x,b.pos.y-w.player.pos.y))[0];
        const kind=w.scene?.def.stages[w.scene.stageIx].kind, goal=target?.pos??{x:w.player.pos.x+100,y:w.player.pos.y};
        const d=Math.hypot(goal.x-w.player.pos.x,goal.y-w.player.pos.y);
        const press=presses++%16;
        return {dx:kind==='drill'?(w.scene.state.goalIx===0?1:0):target&&d>65?(goal.x-w.player.pos.x)/d:0,
          dy:kind==='drill'?0:target&&d>65?(goal.y-w.player.pos.y)/d:0,aim:goal,held:[press<8],edge:[press===0]};
      });
      try{
        for(let i=0;i<4500;i++){
          const button=document.querySelector('#story-continue:not([disabled])');button?.click();
          if(w.scene)stages.add(w.scene.def.stages[w.scene.stageIx].kind);
          __game.step(1,40);
          if(__game.crash().fatal)throw Error(JSON.stringify(__game.crash().fatal));
          if(w.zone.id==='scene_mu'&&__game.account().ledger.prologue_lived){stages.add('mu');break;}
          if(i%8===0)await new Promise(r=>setTimeout(r,0));
        }
      }finally{__game.devInput(null);}
      return {stages:[...stages],complete:!!__game.account().ledger.prologue_lived,roster:__game.account().roster.length,
        directMu:__game.world()===w&&w.zone.id==='scene_mu'&&document.getElementById('start-menu').classList.contains('hidden'),
        scene:w.scene&&{stage:w.scene.stageIx,goal:w.scene.state.goalIx,casts:w.scene.casts,prompt:w.scene.prompt},time:w.time};
    });
    record('Begin completes the account tutorial directly into Mu',tutorial);
    assert(tutorial.complete);assert(tutorial.directMu);assert.equal(tutorial.roster,0);await shot('tutorial-complete');
    const chosen=await run(async()=>{
      const w=__game.world();__game.step(2,40);
      const apps=w.scene?.state.apps??[],app=apps.find(a=>a.rank==='awake'&&a.classId==='warrior')??apps.find(a=>a.rank==='awake');
      if(!app)throw Error('The tutorial did not reach the in-world Mu vessels');
      const body=w.actors.find(a=>a.id===app.id);
      __game.devInput(()=>{const dx=body.pos.x-w.player.pos.x,dy=body.pos.y-w.player.pos.y,d=Math.hypot(dx,dy);return {dx:d>body.radius+25?dx/d:0,dy:d>body.radius+25?dy/d:0,aim:body.pos,held:[],edge:[]};});
      try{for(let i=0;i<500&&!document.getElementById('mu-wake');i++){__game.step(1,40);if(i%8===0)await new Promise(r=>setTimeout(r,0));}}finally{__game.devInput(null);}
      const wake=document.getElementById('mu-wake');if(!wake)throw Error('Physical approach did not offer the Mu vessel');
      return app.classId;
    });
    await shot('mu');
    await run(seed=>{if(seed){window.__savedRandom=Math.random;Math.random=()=>seed/4294967296;}document.getElementById('mu-wake').click();},Number(process.env.WORLD_SEED)||0);
    await ready();
    await run(()=>{if(window.__savedRandom){Math.random=__savedRandom;delete window.__savedRandom;}});
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
    record('Mu wakes into the continuous world', fresh); await shot('lastlight');
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
    if (process.env.PROFILE_WORLD) {
      await run(()=>{window.__profileWork=true;});
      win.webContents.debugger.attach('1.3');
      await win.webContents.debugger.sendCommand('Profiler.enable');
      await win.webContents.debugger.sendCommand('Profiler.start');
    }
    const journey = await run(async () => {
      __game.perfFrames(true);
      const w = __game.world(), m = w.massRuntime, trail = m.journey.trails[0];
      const work={}, undo=[];
      if(window.__profileWork)for(const [owner,name] of [[m,'update'],[m,'prepareNativeCountry'],[m.stream,'step'],[m.dormancy,'update'],[m.geography,'prepare'],[m,'snapshot']]){
        if(!owner||typeof owner[name]!=='function')continue;
        const original=owner[name],label=owner===m?'mass.'+name:owner.constructor.name+'.'+name;
        owner[name]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{work[label]=Math.max(work[label]??0,performance.now()-t);}};
        undo.push(()=>owner[name]=original);
      }
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
      } finally { __game.devInput(null);for(const restore of undo)restore(); }
      frames.sort((a,b) => a-b);
      const perf = __game.perfFrames();
      const percentiles = rows => { rows.sort((a,b)=>a-b); return { p50: rows[Math.floor(rows.length*.5)], p95: rows[Math.floor(rows.length*.95)], max: rows.at(-1) }; };
      return { distance, cells: [...cells], pos: { ...w.player.pos }, target, remaining: points.length,
        simulation: percentiles(perf.sim), rendering: percentiles(perf.ren),
        frameMax:frames.at(-1),work,phase:perf.phase,
        zone: w.zone.id, loads: __playtestLoads, sameHero: w.player === __playtestHero,
        frameMsP50: frames[Math.floor(frames.length * .5)], frameMsP95: frames[Math.floor(frames.length * .95)] };
    });
    if (process.env.PROFILE_WORLD) {
      const { profile } = await win.webContents.debugger.sendCommand('Profiler.stop');
      fs.writeFileSync(path.join(out, 'opening-road.cpuprofile'), JSON.stringify(profile));
      win.webContents.debugger.detach();
    }
    assert(journey.cells.length > 1); assert.equal(journey.loads, 0); assert(journey.sameHero);
    assert.equal(journey.remaining, 0); assert(Math.hypot(journey.pos.x - journey.target.x, journey.pos.y - journey.target.y) < 24);
    record('Walk from Lastlight to the western camp', journey); await shot('western-road');
    const combat = await run(async () => {
      const w = __game.world();
      const target = w.actors.filter(a => a.team === 'enemy' && !a.dead && a.skills.some(Boolean))
        .sort((a,b) => Math.hypot(a.pos.x-w.player.pos.x,a.pos.y-w.player.pos.y)-Math.hypot(b.pos.x-w.player.pos.x,b.pos.y-w.player.pos.y))[0];
      if (!target) throw Error('No opponents at the camp');
      const primary = w.player.skills[0], delivery = primary?.def.delivery;
      if (delivery?.type !== 'melee') throw Error('Expected the fresh warrior melee primary');
      const tags = new Set(primary.def.tags), extra = primary.def.innateMods ?? [];
      const before = target.life; let lowest = before;
      const initial = { hero: { ...w.player.pos }, target: { ...target.pos }, heroTier: w.player.tier, targetTier: target.tier, targetId: target.defId };
      __game.devInput(() => {
        const p = w.player.pos, goal = target.pos, d = Math.hypot(goal.x-p.x,goal.y-p.y);
        const step = w.walk.pathStep(p,goal) ?? goal, len = Math.hypot(step.x-p.x,step.y-p.y);
        // Close to the fresh primary's real melee reach before committing a swing.
        const engage = (w.player.radius + delivery.range) * w.player.sheet.get('meleeReach', tags, extra) * .8;
        return { dx: d > engage && len ? (step.x-p.x)/len : 0, dy: d > engage && len ? (step.y-p.y)/len : 0,
          aim: { ...goal }, held: [d <= engage], edge: [] };
      });
      try {
        for (let i=0;i<300&&!target.dead&&!w.player.dead;i++) {
          __game.step(1,40); lowest = Math.min(lowest, target.life); if(i%8===0) await new Promise(r=>setTimeout(r,0));
        }
      } finally { __game.devInput(null); }
      return { target: target.name, before, after: target.life, killed: target.dead,
        lowest, initial, final: { hero: { ...w.player.pos }, target: { ...target.pos }, skill: w.player.skills[0]?.def.id, targetTier: target.tier },
        heroAlive: !w.player.dead, loads: __playtestLoads, fatal: __game.crash().fatal };
    });
    record('Combat at the generated camp',combat);
    assert(combat.after < combat.before, 'Ordinary attack input must damage an actual camp opponent: '+JSON.stringify(combat));
    assert(combat.heroAlive); assert.equal(combat.loads,0); assert.equal(combat.fatal,null);
    await shot('camp-combat');
    const saved = await run(async () => {
      __game.save(); await __game.flushRunSave(); const w = __game.world();
      return { charId: w.meta.charId, seed: w.massRuntime.generator.run.seed, pos: { ...w.player.pos }, zone: w.zone.id };
    });
    await boot();
    const menu=await run(()=>({start:document.getElementById('sm-start').textContent,
      complete:!!__game.account().ledger.prologue_lived,
      replayButton:[...document.querySelectorAll('#start-menu button')].some(b=>b.textContent==='Begin')}));
    assert(menu.complete);assert.equal(menu.start,'New Run');assert.equal(menu.replayButton,false);
    record('Completed account has New Run instead of Begin after restart',menu);
    await run(()=>document.getElementById('sm-start').click());
    for(let i=0;i<300;i++){
      if(await run(()=>!__game.loading.active && __game.world().scene?.def.id==='mu'))break;
      await pause(30);
    }
    const veteran=await run(()=>{
      const w=__game.world();
      if(w.scene?.def.id!=='mu'||w.account!==__game.account()||!w.account.ledger.prologue_lived||w.meta.charId)
        throw Error('New Run did not enter Mu on the completed account');
      window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));
      __game.step(1,20);
      window.dispatchEvent(new KeyboardEvent('keyup',{key:'Escape',code:'Escape',bubbles:true}));
      const leave=document.getElementById('esc-end');if(!leave)throw Error('Mu has no Main Menu exit');
      leave.click();__game.step(2,20);
      return {scene:w.scene?.def.id,complete:!!__game.account().ledger.prologue_lived};
    });
    assert(veteran.complete);record('New Run enters Mu without repeating the tutorial',veteran);
    await boot();
    await run(async () => {
      for (let i = 0; i < 100 && !document.querySelector('#sm-continue:not([disabled])'); i++) await new Promise(r => setTimeout(r, 40));
      const button = document.querySelector('#sm-continue:not([disabled])');
      if (!button) throw Error('No Continue button after saving'); button.click();
    });
    await ready();
    const resumed = await run(() => { const w = __game.world(); return { charId: w.meta.charId,
      seed: w.massRuntime.generator.run.seed, pos: { ...w.player.pos }, zone: w.zone.id }; });
    assert.deepEqual(resumed, saved); record('Continue Run preserves the saved life after leaving Mu', resumed); await shot('continued');
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

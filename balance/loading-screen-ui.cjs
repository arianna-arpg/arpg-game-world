// Hidden real-client acceptance. Scoped build, isolated userData, no shared saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const reports = path.join(__dirname, 'reports'); fs.mkdirSync(reports, { recursive: true });
app.setPath('userData', path.join(reports, 'loading-profile-' + process.pid)); app.disableHardwareAcceleration();
app.whenReady().then(async () => {
 const root = path.resolve(__dirname, '..', process.env.HOLLOW_WAKE_QA_DIST || 'dist');
 const report = { checks: [], errors: [], images: [] };
 const server = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname, file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'); fs.createReadStream(file).pipe(res);
 });
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 const win = new BrowserWindow({ show: false, width: 1280, height: 850, webPreferences: { offscreen: true, backgroundThrottling: false } });
 win.webContents.on('console-message', e => { if (e.level === 'error') report.errors.push(e.message); });
 const run = async (fn, ...args) => {
  const result = await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await (' + fn + ')(' + args.map(a => JSON.stringify(a)).join(',') + ')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if (!result.ok) throw Error(result.error); return result.value;
 };
 const pause = ms => new Promise(r => setTimeout(r, ms));
 const shot = async name => { win.webContents.invalidate(); await pause(100); const file = path.join(reports, 'loading-' + name + '.png'); fs.writeFileSync(file, (await win.webContents.capturePage()).toPNG()); report.images.push(file); };
 const save = () => fs.writeFileSync(path.join(reports, 'loading-screen-ui.json'), JSON.stringify(report, null, 2));
 const timer = setTimeout(() => { save(); console.error('Loading acceptance timed out'); app.exit(1); }, 240000);
 try {
  await win.loadURL('http://127.0.0.1:' + server.address().port);
  await run(async () => {
   for (let i = 0; !window.__game && i < 100; i++) await new Promise(r => setTimeout(r, 100));
   if (!window.__game) throw Error('Missing game'); await __game.hydrated();
   Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => window.__qaPads ?? [] });
  });
  for (const direction of ['down', 'right', 'left']) {
   await run(direction => {
    window.__qaLease = __game.loading.begin({ kind: 'entry', direction, label: 'Opening the world', detail: 'Preparing the next area',
     loadout: direction === 'left' ? { slots: { wispSkin: 'wisp_lunar_moth', playerEffect: 'waking_stars' }, skills: {} } : __game.account().cosmetics.loadout });
   }, direction);
   await pause(1600); await shot(direction);
   const moved = await run(async direction => {
    const code = direction === 'down' ? 'ArrowRight' : 'ArrowDown';
    window.dispatchEvent(new KeyboardEvent('keydown', { key: code, code, bubbles: true }));
    await new Promise(r => setTimeout(r, 220));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: code, code, bubbles: true }));
    return __game.loading.snapshot;
   }, direction);
   assert.equal(moved.direction, direction); assert.ok(moved.lane > 35); report.checks.push('keyboard ' + direction);
  }
  const heading = await run(() => {
   const h = document.querySelector('#mu-loading-screen h1');
   return { text: h.textContent, accessible: h.getAttribute('aria-label'), font: getComputedStyle(h).fontFamily };
  });
  assert.match(heading.text, /^[\u16a0-\u16ff ]+$/u);
  assert.equal(heading.accessible, 'The Crossing — Loading');
  assert.ok(heading.font.includes('Segoe UI Symbol'));
  report.checks.push({ runeHeading: heading });
  const leases = await run(async () => {
   const first = window.__qaLease;
   window.__qaLease = __game.loading.begin({ kind: 'travel', direction: 'right', label: 'Measured progress', completed: 3, total: 8 });
   first.finish(); first.update({ label: 'STALE' }); first.fail('STALE');
   const p = document.querySelector('#mu-loading-screen progress');
   const stale = { active: __game.loading.active, label: __game.loading.snapshot.label, value: p.value, max: p.max };
   window.__qaRetry = 0; window.__qaCancel = 0;
   window.__qaLease.finish();
   window.__qaLease = __game.loading.begin({ kind: 'travel', direction: 'right', label: 'Reading pages', cancel: () => { window.__qaCancel++; window.__qaLease.finish(); } });
   window.__qaLease.fail('A test page is unavailable.', () => { window.__qaRetry++; window.__qaLease.update({ label: 'Trying again' }); });
   return stale;
  });
  assert.deepEqual(leases, { active: true, label: 'Measured progress', value: 3, max: 8 });
  await shot('retry');
  await run(() => { document.querySelector('#mu-loading-screen button').click(); if (window.__qaRetry !== 1) throw Error('Retry not invoked'); });
  // Real pointer steering, successful gates, speed progression, then a collision.
  const play = await run(async () => {
   const start = performance.now(); let crash = false;
   while (performance.now() - start < 16000) {
    const snap = __game.loading.snapshot, gate = snap.gates.find(g => !g.resolved && g.u > 210);
    const rect = document.querySelector('#mu-loading-screen canvas').getBoundingClientRect();
    const scale = Math.min(rect.width / 1000, rect.height / 560);
    crash = snap.passed >= 2;
    const lane = crash ? 255 : gate?.openings.reduce((a, b) => Math.abs(a.lane - snap.lane) <= Math.abs(b.lane - snap.lane) ? a : b).lane ?? 0;
    document.querySelector('#mu-loading-screen').dispatchEvent(new PointerEvent('pointermove', { clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2 + lane * scale, bubbles: true }));
    if (snap.hits) return snap;
    await new Promise(r => setTimeout(r, 16));
   }
   throw Error('Gate interaction did not resolve');
  });
  assert.ok(play.passed >= 2); assert.equal(play.hits, 1); assert.equal(play.streak, 0); assert.equal(play.speed, 1); report.checks.push({ pointerGates: play });
  await shot('impact');
  const pad = await run(async () => {
   const before = __game.loading.snapshot.lane;
   window.__qaPads = [{ connected: true, axes: [0, -0.8], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }];
   await new Promise(r => setTimeout(r, 700)); const lane = __game.loading.snapshot.lane;
   document.querySelector('#mu-loading-screen button').click();
   const held = __game.loading.padQuarantined;
   window.__qaPads = []; return { before, lane, held, released: __game.loading.padQuarantined, cancelled: window.__qaCancel, active: __game.loading.active };
  });
  assert.ok(pad.lane <= Math.max(-265, pad.before - 80) + 1); assert.equal(pad.held, true); assert.equal(pad.released, false); assert.equal(pad.cancelled, 1); assert.equal(pad.active, false);
  report.checks.push('controller steering, cancellation and neutral-release quarantine');
  const heldConfirm = await run(async () => {
   window.__qaPads = [{ connected: true, axes: [0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 0, value: i === 0 ? 1 : 0 })) }];
   let cancelled = 0;
   const lease = __game.loading.begin({ kind: 'entry', label: 'Held entry press', cancel: () => { cancelled++; lease.finish(); } });
   await new Promise(r => setTimeout(r, 120));
   const active = __game.loading.active; window.__qaPads = []; lease.finish();
   return { cancelled, active };
  });
  assert.deepEqual(heldConfirm, { cancelled: 0, active: true }); report.checks.push('held confirm cannot immediately cancel entry');
  // Play the generated branching course with real pointer input. Follow optional
  // encounters only when the chosen opening remains reachable; the pure probe
  // separately exhausts calm routes; peak-speed layouts can be deliberately punishing.
  const choices = await run(async () => {
   window.__qaLease = __game.loading.begin({ kind: 'travel', direction: 'right', label: 'Following the wandering souls' });
   const start = performance.now(), counts = new Set(), placements = new Set(), widths = new Map();
   let gateId, lane = 0, births = 0;
   const known = new Set();
   const objects = snap => [...snap.gates.map(g => ({ ...g, key: 'g' + g.id })),
    ...snap.pickups.map(p => ({ ...p, key: 'p' + p.id })), ...snap.currents.map(b => ({ ...b, key: 'b' + b.id }))];
   for (const o of objects(__game.loading.snapshot)) known.add(o.key);
   while (performance.now() - start < 45000) {
    const snap = __game.loading.snapshot;
    for (const o of objects(snap)) if (!known.has(o.key)) {
     known.add(o.key); births++;
     if (o.u <= 1000) throw Error('Loading object spawned inside the visible course: ' + JSON.stringify(o));
    }
    for (const g of snap.gates) { counts.add(g.openings.length); for (let i = 0; i < g.openings.length; i++) widths.set(g.id + ':' + i, g.openings[i].width); }
    for (const b of snap.currents) if (b.taken) placements.add(b.placement);
    const root = document.querySelector('#mu-loading-screen');
    if (/\d|score|points/i.test(root.innerText) || 'score' in snap) throw Error('Crossing exposes a numeric score or count');
    if (counts.size === 3 && placements.size === 2 && snap.passed >= 3 && snap.collected >= 2 && snap.dash > 0 && snap.gates.some(g => !g.resolved && g.openings.length > 1)) {
     return { snap, births, counts: [...counts], placements: [...placements], widths: [...widths.values()] };
    }
    const g = snap.gates.find(g => !g.resolved);
    const reach = distance => Math.max(0, distance) * 490 / (210 * 5.4);
    if (g && gateId !== g.id) {
     gateId = g.id;
     const available = g.openings.filter(o => Math.abs(o.lane - snap.lane) < reach(g.u - 230 - 52));
     const boosted = available.find(o => snap.currents.some(b => b.gate === g.id && b.placement === 'opening' && b.lane === o.lane));
     lane = (boosted ?? g.openings.reduce((a, b) => Math.abs(a.lane - snap.lane) <= Math.abs(b.lane - snap.lane) ? a : b)).lane;
    }
    const events = [...snap.pickups.filter(p => p.state === 'live'), ...snap.currents.filter(b => !b.taken && b.placement === 'between')]
      .filter(p => p.u > 242 && p.u < (g?.u ?? 1000) - 60
        && Math.abs(p.lane - snap.lane) <= reach(p.u - 230 - 12)
        && Math.abs(p.lane - lane) < reach((g?.u ?? 1000) - p.u - 52)).sort((a, b) => a.u - b.u);
    const target = events[0]?.lane ?? lane;
    const rect = document.querySelector('#mu-loading-screen canvas').getBoundingClientRect(), scale = Math.min(rect.width / 1000, rect.height / 560);
    root.dispatchEvent(new PointerEvent('pointermove', { clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2 + target * scale, bubbles: true }));
    await new Promise(r => setTimeout(r, 16));
   }
   throw Error('Branching course timed out: ' + JSON.stringify({ counts: [...counts], placements: [...placements], snap: __game.loading.snapshot }));
  });
  assert.ok(choices.births > 0); assert.ok(choices.snap.passed >= 3); assert.ok(choices.snap.currentsTaken >= 2);
  assert.ok(Math.max(...choices.widths) - Math.min(...choices.widths) > 5);
  report.checks.push({ branchingCurrents: choices }); await shot('choices');
  await run(() => window.__qaLease.finish());

  // A small viewport keeps the same hit/pointer mapping and visible controls.
  win.setContentSize(390, 720);
  await run(() => { window.__qaLease = __game.loading.begin({ kind: 'entry', label: 'Recalling your vessel' }); });
  await pause(1000); await shot('narrow');
  await run(() => { if (document.querySelector('#mu-loading-screen').scrollWidth > innerWidth) throw Error('Loading cover overflows'); if (document.querySelector('#mu-loading-screen canvas').getBoundingClientRect().bottom > document.querySelector('#mu-loading-screen footer').getBoundingClientRect().top) throw Error('Footer overlaps crossing'); window.__qaLease.finish(); });
  win.setContentSize(1280, 850);
  // Exercise the actual async entry wrapper; it must expose down BEFORE construction.
  const entry = await run(async () => {
   __game.account().ledger.prologue_lived = 1; __game.saveAccount();
   document.getElementById('sm-start').click(); __game.step(2);
   const mu = __game.world(), apps = mu.scene?.state.apps?.filter(a => a.rank === 'awake');
   if (!apps?.length) throw Error('Begin did not enter Mu');
   const vessel = mu.actors.find(a => a.id === apps[0].id), target = { ...vessel.pos };
   __game.pilot({ poll: () => { const p = __game.world().player.pos, d = Math.hypot(target.x-p.x, target.y-p.y);
     return { dx: d>45?target.x-p.x:0, dy: d>45?target.y-p.y:0, aim: target, held: [], edge: [] }; } });
   try { for (let i = 0; i < 300 && !document.querySelector('#mu-wake'); i++) __game.step(1); }
   finally { __game.pilot(null); }
   const wake = document.querySelector('#mu-wake'); if (!wake) throw Error('Mu vessel card did not open');
   wake.click(); await Promise.resolve();
   const first = __game.loading.snapshot;
   for (let i = 0; __game.loading.active && i < 200; i++) await new Promise(r => setTimeout(r, 25));
   const w = __game.world(); w.player.invulnerable = true;
   return { first, active: __game.loading.active, mass: !!w.massRuntime, fatal: __game.crash().fatal };
  });
  assert.equal(entry.first.direction, 'down'); assert.equal(entry.active, false); assert.equal(entry.mass, false); assert.equal(entry.fatal, null); report.checks.push('real Mu vessel dwell and Wake paint descent and complete without a score gate');
  // Main has no native-page subsystem. The reusable travel lease still owns
  // the world and held input while an asynchronous caller prepares its work.
  const heldWorld = await run(async () => {
   const w = __game.world(), time = w.time, pos = { ...w.player.pos };
   const lease = __game.loading.begin({ kind: 'travel', label: 'Crossing the veil' });
   window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', bubbles: true }));
   await new Promise(r => setTimeout(r, 400));
   const held = { time: w.time, pos: { ...w.player.pos } };
   lease.finish();
   window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', bubbles: true, repeat: true })); __game.step(2);
   const stayed = Math.hypot(pos.x - w.player.pos.x, pos.y - w.player.pos.y);
   window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w', code: 'KeyW', bubbles: true }));
   __game.save(); return { time, pos, held, stayed, inert: document.getElementById('game').inert };
  });
  assert.equal(heldWorld.time, heldWorld.held.time); assert.deepEqual(heldWorld.pos, heldWorld.held.pos);
  assert.equal(heldWorld.stayed, 0); assert.equal(heldWorld.inert, false);
  report.checks.push('main travel lease holds the world and releases without held-key movement');
  // Cold Continue, then cancellation before its first async phase can publish.
  await win.loadURL('http://127.0.0.1:' + server.address().port);
  const resumed = await run(async () => {
   for (let i = 0; !window.__game && i < 100; i++) await new Promise(r => setTimeout(r, 100)); await __game.hydrated();
   const before = __game.world(); document.getElementById('sm-continue').click(); const first = __game.loading.snapshot;
   document.querySelector('#mu-loading-screen button').click();
   await new Promise(r => setTimeout(r, 150));
   if (__game.world() !== before || __game.loading.active) throw Error('Cancelled Continue published');
   document.getElementById('sm-continue').click();
   for (let i = 0; __game.loading.active && i < 400; i++) await new Promise(r => setTimeout(r, 25));
   return { first, active: __game.loading.active, replaced: __game.world() !== before, mass: !!__game.world().massRuntime, fatal: __game.crash().fatal };
  });
  assert.equal(resumed.first.direction, 'down'); assert.equal(resumed.active, false); assert.equal(resumed.replaced, true); assert.equal(resumed.mass, false); assert.equal(resumed.fatal, null);
  report.checks.push('cold Continue cancellation preserves the old world; subsequent Continue restores main’s saved world');
  // Exercise main's disk-first roster owner with a delayed read, cancellation,
  // a newer cover, and then a real successful restore of the same vessel.
  await win.loadURL('http://127.0.0.1:' + server.address().port);
  const roster = await run(async () => {
   for (let i = 0; !window.__game && i < 100; i++) await new Promise(r => setTimeout(r, 100)); await __game.hydrated();
   const saved = JSON.parse(localStorage.getItem('arpg_character_v1'));
   if (!saved) throw Error('Missing main run save for roster fixture');
   const copy = { ...saved, charId: 'loading-qa-vessel', modeId: 'immortal' };
   const entry = { charId: copy.charId, modeId: copy.modeId, slot: 100, classId: copy.classId, name: 'Loading QA vessel', level: 1, stage: 0, savedAt: Date.now() };
   __game.account().roster.push(entry); __game.saveAccount(); __game.ui.setContinueSave(saved);
   const before = __game.world(), original = window.fetch;
   let release;
   window.fetch = (resource, options) => String(resource) === '/__save/100' && options?.method === 'GET'
     ? new Promise(resolve => { release = () => resolve(new Response(JSON.stringify(copy), { status: 200, headers: { 'content-type': 'application/json' } })); })
     : original(resource, options);
   try {
    document.getElementById('sm-immortals').click(); document.querySelector('.sm-roster-go[data-cid="loading-qa-vessel"]').click();
    const direction = __game.loading.snapshot.direction;
    for (let i = 0; !release && i < 100; i++) await new Promise(r => setTimeout(r, 20));
    if (!release) throw Error('Roster read was never requested');
    document.querySelector('#mu-loading-screen button').click();
    const newer = __game.loading.begin({ kind: 'travel', label: 'Newer preparation' });
    release(); await new Promise(r => setTimeout(r, 150));
    const stale = __game.world() === before && __game.loading.active && __game.loading.snapshot.label === 'Newer preparation';
    newer.finish();
    window.fetch = (resource, options) => String(resource) === '/__save/100' && options?.method === 'GET'
      ? Promise.resolve(new Response(JSON.stringify(copy), { status: 200, headers: { 'content-type': 'application/json' } })) : original(resource, options);
    document.getElementById('sm-immortals').click(); document.querySelector('.sm-roster-go[data-cid="loading-qa-vessel"]').click();
    for (let i = 0; __game.loading.active && i < 400; i++) await new Promise(r => setTimeout(r, 25));
    return { direction, stale, active: __game.loading.active, replaced: __game.world() !== before,
      charId: __game.world().meta.charId, modeId: __game.world().meta.modeId, fatal: __game.crash().fatal };
   } finally { window.fetch = original; }
  });
  assert.deepEqual(roster, { direction: 'down', stale: true, active: false, replaced: true, charId: 'loading-qa-vessel', modeId: 'immortal', fatal: null });
  report.checks.push('main delayed roster cancellation cannot publish or dismiss a newer cover; subsequent roster Continue restores the vessel');
  await win.loadURL('http://127.0.0.1:' + server.address().port + '/?loadingPreview=left');
  const preview = await run(async () => {
   for (let i = 0; !window.__game?.loading.active && i < 100; i++) await new Promise(r => setTimeout(r, 50));
   return { active: __game.loading.active, direction: __game.loading.snapshot.direction, label: __game.loading.snapshot.label };
  });
  assert.deepEqual(preview, { active: true, direction: 'left', label: 'Loading screen preview' }); report.checks.push('playable preview URL');
  assert.deepEqual(report.errors, []); console.log('PASS playable loading UI:', report.checks.length, 'checks,', report.images.length, 'screenshots');
 } catch (error) { report.failure = error.stack || String(error); console.error(report.failure); process.exitCode = 1; }
 finally { save(); clearTimeout(timer); win.destroy(); server.close(); app.exit(process.exitCode || 0); }
});

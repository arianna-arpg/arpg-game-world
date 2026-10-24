// Real browser board actions, native movement, Save/Continue and scenery frames.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, 'exploration-profile-' + process.pid)); app.disableHardwareAcceleration();
app.whenReady().then(async () => {
 const root = path.resolve(__dirname, '..', 'dist-preview');
 const server = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname, file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'); fs.createReadStream(file).pipe(res);
 });
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 const url = 'http://127.0.0.1:' + server.address().port;
 const win = new BrowserWindow({ show: false, width: 1280, height: 850, webPreferences: { offscreen: true, backgroundThrottling: false } });
 const run = async (fn, ...args) => {
  const r = await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await (' + fn + ')(' + args.map(a => JSON.stringify(a)).join(',') + ')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if (!r.ok) throw Error(r.error); return r.value;
 };
 const boot = async () => { await win.loadURL(url); await run(async () => { window.requestAnimationFrame = () => 0; Object.defineProperty(navigator, 'getGamepads', { value: () => [] }); await new Promise(r => setTimeout(r, 250)); }); };
 const shot = async name => { await run(() => __game.renderer.render(__game.world())); win.webContents.invalidate(); await new Promise(r => setTimeout(r, 100)); fs.writeFileSync(path.join(dir, 'exploration-' + name + '.png'), (await win.webContents.capturePage()).toPNG()); };
 const state = () => run(() => { const w = __game.world(); return { hands: w.bountyHands, offers: w.bountyOffers, pos: w.player.pos, quests: w.activeQuests, schema: w.massRuntime.snapshot(w).schema }; });
 const checkpoint = async () => {
  await run(async () => { __game.ui.hideAll(); __game.save(); await new Promise(r => setTimeout(r, 220)); });
  const before = await state(); await boot();
  await run(async () => { for (let i = 0; i < 80 && !document.querySelector('#sm-continue:not([disabled])'); i++) await new Promise(r => setTimeout(r, 100)); document.querySelector('#sm-continue:not([disabled])').click(); __game.ui.hideAll(); });
  assert.deepEqual(JSON.parse(JSON.stringify(await state())), JSON.parse(JSON.stringify(before))); return before;
 };
 const timer = setTimeout(() => app.exit(1), 240000);
 try {
  await boot();
  const offer = await run(() => {
   __game.devStartRun('warrior'); __game.ui.hideAll(); const w = __game.world(); w.account.features.add('bounty_board'); w.startWorldMass(42); w.player.invulnerable = true;
   const b = w.bountyBoardsHere()[0]; if (!b) throw Error('No physical board'); w.landPartyAt({ x: b.pos.x, y: b.pos.y + 55 });
   w.armBountyBoard(); __game.ui.showBounties(); const p = w.bountyOffers.find(p => p.kind === 'country_visit'); if (!p) throw Error('No scouting posting'); return p;
  });
  await shot('board');
  await run(id => { const button = [...document.querySelectorAll('[data-bounty-accept]')].find(b => b.dataset.bountyAccept === id); if (!button) throw Error('No native accept button'); button.click(); __game.step(1); }, offer.id);
  assert.equal((await state()).hands[0].id, offer.id); await checkpoint();
  const walked = await run(() => {
   __game.ui.hideAll(); const w = __game.world(), m = w.massRuntime, p = w.bountyHands[0];
   const place = m.placesInCell(p.massBounty.center).find(x => x.id === p.massBounty.id), s = m.config.terrain.addressSpan;
   const center = { x: (Number(place.center.cx) - Number(m.origin.cx)) * s + place.center.x, y: (Number(place.center.cy) - Number(m.origin.cy)) * s + place.center.y };
   w.landPartyAt({ x: center.x, y: center.y + place.radius + 35 }); m.update(w, true);
   const hero = w.player, load = w.loadZone; let loads = 0; w.loadZone = function (...a) { loads++; return load.apply(this, a); };
   try { __game.devInput(() => ({ dx: center.x - w.player.pos.x, dy: center.y - w.player.pos.y, aim: center, held: [], edge: [] })); for (let i = 0; i < 90 && w.handState(p) !== 'ready'; i++) __game.step(1); }
   finally { __game.devInput(null); w.loadZone = load; }
   return { ready: w.handState(p), sameHero: hero === w.player, loads, crash: __game.crash().fatal };
  });
  assert.deepEqual(walked, { ready: 'ready', sameHero: true, loads: 0, crash: null }); await shot('discovery'); await checkpoint();
  const paid = await run(() => {
   const w = __game.world(), p = w.bountyHands[0], b = w.bountyBoardsHere()[0]; w.landPartyAt({ x: b.pos.x, y: b.pos.y + 55 }); __game.ui.showBounties();
   const button = [...document.querySelectorAll('[data-bounty-turnin]')].find(b => b.dataset.bountyTurnin === p.id); if (!button) throw Error('No native return button'); button.click(); __game.step(1);
   return { hands: w.bountyHands.length, paid: w.ledger.bounty_done, offers: w.bountyOffers.length, duplicate: w.turnInBounty(p.id) };
  });
  assert.equal(paid.hands, 0); assert.equal(paid.paid, 1); assert.equal(paid.duplicate, false); assert.ok(paid.offers); await checkpoint(); await shot('paid-board');
  const collision = await run(() => {
   __game.ui.hideAll(); const w = __game.world(), m = w.massRuntime, s = m.config.terrain.addressSpan; let place;
   for (let ring = 1; ring <= 20 && !place; ring++) for (let y = -ring; y <= ring && !place; y++) for (let x = -ring; x <= ring && !place; x++) {
    if (Math.max(Math.abs(x), Math.abs(y)) === ring) place = m.placesInCell(m.walk.at(x * s, y * s)).find(p => p.content === 'red-cairn');
   }
   if (!place) throw Error('No Red Cairn');
   const center = { x: (Number(place.center.cx) - Number(m.origin.cx)) * s + place.center.x, y: (Number(place.center.cy) - Number(m.origin.cy)) * s + place.center.y };
   w.landPartyAt(center); m.update(w, true); const altar = w.altars.find(a => a.def.id === 'blood_altar');
   w.landPartyAt({ x: altar.pos.x - 80, y: altar.pos.y + 4.5 });
   try { __game.devInput(() => ({ dx: 1, dy: 0, aim: altar.pos, held: [], edge: [] })); __game.step(80); } finally { __game.devInput(null); }
   return { stopped: w.player.pos.x < altar.pos.x - 14, plinth: w.pointInSolid(altar.pos.x, altar.pos.y)?.kind, crash: __game.crash().fatal };
  });
  assert.deepEqual(collision, { stopped: true, plinth: 'altar_plinth', crash: null }); await shot('red-cairn');
  for (const kind of ['fallen-waystation', 'rootbound-court', 'reed-wake', 'sunken-caravan', 'rime-watch']) {
   await run(kind => {
    const w = __game.world(); let place;
    for (const seed of [42, 81, 142]) {
     w.startWorldMass(seed); w.player.invulnerable = true; const m = w.massRuntime;
     for (let y = -16; y <= 16 && !place; y += 2) for (let x = -16; x <= 16 && !place; x += 2)
      place = m.placesInCell({ dimension: 'surface', cx: String(x * 8), cy: String(y * 8) }).find(p => p.content === kind);
     if (!place) continue;
     const span = m.config.terrain.addressSpan, center = { x: (Number(place.center.cx) - Number(m.origin.cx)) * span + place.center.x, y: (Number(place.center.cy) - Number(m.origin.cy)) * span + place.center.y };
     w.landPartyAt(center); m.update(w, true); __game.step(2); break;
    }
    if (!place) throw Error('Missing natural regional site: ' + kind);
    if (!w.chests.some(c => c.rewardSource === JSON.stringify([place.id, 'cache']))) throw Error('Regional cache not admitted');
   }, kind);
   await shot(kind);
  }
  fs.writeFileSync(path.join(dir, 'exploration-ui.json'), JSON.stringify({ walked, paid, collision, checkpoints: 3 }, null, 2));
  console.log('PASS native board UI, continuous discovery walk, three browser Continue checkpoints, once-only return and Red Cairn collision');
  clearTimeout(timer); win.destroy(); server.close(); app.exit(0);
 } catch (error) { fs.writeFileSync(path.join(dir, 'exploration-ui-error.txt'), String(error.stack || error)); console.error(error); clearTimeout(timer); app.exit(1); }
});

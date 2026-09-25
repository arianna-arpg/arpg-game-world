// Build first. Actual body/screen painters, hidden window, disposable saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'impale-cues-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = v => fs.appendFileSync(logfile, JSON.stringify(v) + '\n');
const save = (name, url) => fs.writeFileSync(path.join(dir, 'impale-' + name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
app.setPath('userData', path.join(dir, 'impale-cues-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'impale-cues-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1500, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = code => win.webContents.executeJavaScript(code);
  async function capture(name) {
    const result = await run(`(() => {
      const w = __game.world(), r = __game.renderer; r.render(w);
      const full = document.getElementById('game').toDataURL('image/png');
      const originalCanvas = r.canvas, originalCtx = r.ctx;
      const canvas = document.createElement('canvas'); canvas.width = originalCanvas.width; canvas.height = originalCanvas.height;
      const ctx = canvas.getContext('2d'); const ink = [];
      const fill = ctx.fill.bind(ctx); ctx.fill = (...args) => { if (ctx.globalAlpha > 0) ink.push(ctx.fillStyle); return fill(...args); };
      const measure = () => {
        const bytes = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let energy = 0, hash = 0, center = 0; const edges = [0, 0, 0, 0], margin = Math.min(canvas.width, canvas.height) * 0.1;
        for (let i = 0; i < bytes.length; i++) {
          hash = Math.imul(hash, 31) + bytes[i] | 0;
          if (i % 4 !== 3) continue;
          const a = bytes[i], px = (i - 3) / 4, x = px % canvas.width, y = Math.floor(px / canvas.width);
          energy += a;
          if (x < margin) edges[0] += a; if (x >= canvas.width - margin) edges[1] += a;
          if (y < margin) edges[2] += a; if (y >= canvas.height - margin) edges[3] += a;
          if (x >= margin && x < canvas.width - margin && y >= margin && y < canvas.height - margin) center += a;
        }
        return { energy, hash, center, edges, steel: ink.filter(c => c === '#aebbc9').length };
      };
      r.canvas = canvas; r.ctx = ctx;
      let edge, edgeImage, body, bodyImage;
      try {
        r.drawAfflictionOverlays(w); edge = measure(); edgeImage = canvas.toDataURL('image/png');
        canvas.width = 360; canvas.height = 360; ink.length = 0;
        ctx.translate(180 - w.player.pos.x, 180 - w.player.pos.y);
        r.drawActor(w.player, w); body = measure(); bodyImage = canvas.toDataURL('image/png');
      } finally { r.canvas = originalCanvas; r.ctx = originalCtx; }
      return { full, edgeImage, bodyImage, edge, body, fatal: __game.crash().fatal };
    })()`);
    const { full, edgeImage, bodyImage, ...facts } = result; log({ name, ...facts });
    assert.equal(result.fatal, null); save(name, full); save(name + '-edge', edgeImage); save(name + '-body', bodyImage);
    return result;
  }
  try {
    await win.loadURL(server.url);
    await run("window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.step(360);void 0;");
    await run(`(() => {
      const w = __game.world(); w.zoneMap.qa_impale = { id:'qa_impale', name:'Proving Ground', level:12, tileset:'highland', size:{w:1800,h:1400}, seed:991,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000} };
      w.loadZone('qa_impale'); w.player.pos = {x:900,y:700}; __game.step(240);
      w.actors = [w.player]; w.projectiles = []; w.zones = []; w.texts = []; w.flashes = []; w.doodads = []; w.walk = null; w.markDoodadsChanged();
      w.player.fillResources(); w.player.statuses = []; w.lowLifeHitFlash = 0;
      for (const [i, id] of ['zombie','brute','garden_snail'].entries()) {
        const a = w.createMonster(id, 12, 'enemy'); a.pos = {x:760+i*140,y:590}; a.skills=[]; a.spawnedAt=-1;
        a.facing=a.facingPrev=0.4+i*0.8; w.actors.push(a);
      }
      __game.settings().afflictionOverlays = 'still'; __game.settings().lowLifePulse = false;
      window.impaleTime = 20; Object.defineProperty(performance,'now',{value:()=>impaleTime*1000,configurable:true});
      window.impaleStatus = id => ({id,dps:0,remaining:8,stacks:1,rupture:30,sourceName:'UI probe'});
    })()`);
    const clean = await capture('clean'); assert.equal(clean.edge.energy, 0); assert.equal(clean.body.steel, 0);
    await run("for(const a of __game.world().actors.slice(1))a.statuses=[impaleStatus('impaled')];void 0;");
    const enemyOnly = await capture('enemies-only'); assert.equal(enemyOnly.edge.energy, 0);
    await run("__game.world().player.statuses=[impaleStatus('impaled')];void 0;");
    const active = await capture('active-desktop');
    assert.ok(active.body.steel > 0); assert.ok(active.edge.edges.every(n => n > 0)); assert.equal(active.edge.center, 0);
    await run('impaleTime+=2;void 0;'); const still = await capture('still'); assert.equal(still.edge.hash, active.edge.hash);
    await run("__game.settings().afflictionOverlays='gentle';void 0;"); const moving = await capture('gentle');
    await run('impaleTime+=2;void 0;'); const moved = await capture('gentle-later'); assert.notEqual(moving.edge.hash, moved.edge.hash);
    await run("__game.settings().afflictionOverlays='off';void 0;"); const off = await capture('screen-off');
    assert.equal(off.edge.energy, 0); assert.equal(off.body.steel, active.body.steel);
    await run("__game.settings().afflictionOverlays='still';__game.world().player.statuses=['impaled','impaled_physical','impaled_fire','impaled_cold','impaled_lightning','impaled_chaos'].map(impaleStatus);void 0;");
    const typed = await capture('all-types'); assert.equal(typed.body.steel, active.body.steel); assert.equal(typed.edge.hash, active.edge.hash);
    await run("__game.world().player.statuses.push(...['bleed','burn','poison','doom'].map(id=>({...impaleStatus(id),dps:20})));void 0;");
    const mixed = await capture('mixed'); assert.ok(mixed.body.steel > 0 && mixed.edge.steel > 0);
    await run("__game.world().player.statuses=[impaleStatus('impaled')];void 0;");
    win.setContentSize(960, 640); await new Promise(resolve => setTimeout(resolve, 150));
    await run("window.dispatchEvent(new Event('resize'));void 0;");
    const small = await capture('active-small'); assert.ok(small.body.steel > 0); assert.equal(small.edge.center, 0);
    assert.ok(small.edge.edges.every(n => n > 0));
    await run("__game.world().player.endStatus('impaled');void 0;"); const cured = await capture('cured');
    assert.equal(cured.edge.energy, 0); assert.equal(cured.body.steel, 0);
    await run("__game.world().player.statuses=[{...impaleStatus('impaled'),remaining:0}];void 0;");
    const expired = await capture('expired'); assert.equal(expired.edge.energy, 0); assert.equal(expired.body.steel, 0);
    for (const flag of ['dead','downed']) {
      await run(`__game.world().player.statuses=[impaleStatus('impaled')];__game.world().player.${flag}=true;void 0;`);
      const gone = await capture(flag); assert.equal(gone.edge.energy, 0); assert.equal(gone.body.steel, 0);
      await run(`__game.world().player.${flag}=false;void 0;`);
    }
    log('PASS Impale body attachment, four edges, transparent combat area, shared typed cues, simultaneous ailments, comfort controls, two sizes and lifecycle cleanup');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(e => { log(e.stack ?? String(e)); app.exit(1); });

// Build first. Real renderer and resolved rupture, hidden window, disposable saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'doom-cues-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = v => fs.appendFileSync(logfile, JSON.stringify(v) + '\n');
const save = (name, url) => fs.writeFileSync(path.join(dir, 'doom-' + name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
app.setPath('userData', path.join(dir, 'doom-cues-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'doom-cues-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1500, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = code => win.webContents.executeJavaScript(code);
  async function capture(name, phase) {
    const result = await run(`(() => {
      const w = __game.world(), r = __game.renderer, a = w.actors[1];
      const labels = [], text = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(t, ...args) { labels.push(String(t)); return text.call(this,t,...args); };
      try { r.render(w); } finally { CanvasRenderingContext2D.prototype.fillText = text; }
      const full = document.getElementById('game').toDataURL('image/png');
      const originalCanvas = r.canvas, originalCtx = r.ctx;
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 400;
      const ctx = canvas.getContext('2d'), arcs = [];
      const arc = ctx.arc.bind(ctx); ctx.arc = (...args) => { arcs.push({radius:args[2],transform:ctx.getTransform().toJSON()}); return arc(...args); };
      r.canvas = canvas; r.ctx = ctx;
      try {
        ctx.translate(200 - a.pos.x, 200 - a.pos.y);
        if (${phase === undefined ? 'false' : 'true'}) {
          const f = w.flashes.find(f => f.combatCue?.style === 'doom_rupture');
          if (!f) throw Error('missing real rupture');
          r.drawFlash({...f, life:f.maxLife * (1 - ${phase ?? 0})});
        } else r.drawActor(a, w);
      } finally { r.canvas = originalCanvas; r.ctx = originalCtx; }
      const bytes = ctx.getImageData(0,0,400,400).data; let hash=0,energy=0;
      for(let i=0;i<bytes.length;i++){hash=Math.imul(hash,31)+bytes[i]|0;if(i%4===3)energy+=bytes[i];}
      return {full,body:canvas.toDataURL('image/png'),hash,energy,
        boundary:arcs.filter(v=>v.radius===130),labels,fatal:__game.crash().fatal,
        released:w.flashes.some(f=>f.combatCue?.style==='doom_rupture')};
    })()`);
    const {full,body,...facts}=result; log({name,...facts}); save(name,full); save(name+'-body',body);
    assert.equal(result.fatal,null); assert.ok(!result.labels.includes('DOOM!'));
    return result;
  }
  try {
    await win.loadURL(server.url);
    await run("window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.step(360);void 0;");
    await run(`(() => {
      const w=__game.world(); window.doomBase=w.player.skills.find(Boolean);
      w.zoneMap.qa_doom={id:'qa_doom',name:'Proving Ground',level:12,size:{w:1800,h:1400},seed:991,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_doom');w.player.pos={x:900,y:700};__game.step(240);
      w.actors=[w.player];w.projectiles=[];w.zones=[];w.texts=[];w.flashes=[];w.doodads=[];w.walk=null;w.markDoodadsChanged();
      w.player.statuses=[];
      for(const [i,id] of ['zombie','brute','garden_snail'].entries()){
        const a=w.createMonster(id,12,'enemy');a.pos={x:680+i*220,y:530};a.skills=[];a.anchored=true;a.spawnedAt=-1;a.facing=a.facingPrev=0.4+i*0.8;w.actors.push(a);
      }
      for(const a of w.actors){
        a.sheet.setSource('doom-rig',[{stat:'life',kind:'override',value:1000},
          ...['armor','evasion','blockChance','critChance','lifeRegen','chaosRes','energyShield','doomDot'].map(stat=>({stat,kind:'override',value:0}))]);a.fillResources();
      }
      window.doomArm=(bank=100)=>{for(const a of w.actors){a.endStatus('doom');a.applyStatus('doom',0,1,w.player.name,{rupture:bank,ruptureType:'chaos',ruptureRadius:130,casterId:w.player.id});}};
      __game.settings().afflictionOverlays='still';__game.settings().lowLifePulse=false;
      Object.defineProperty(performance,'now',{value:()=>20000,configurable:true});
    })()`);
    const clean=await capture('clean');assert.equal(clean.boundary.length,0);
    await run('doomArm();void 0;');const low=await capture('low-bank');assert.equal(low.boundary.length,6);
    assert.ok(low.boundary.every(v=>v.transform.a===1&&v.transform.d===1&&v.transform.e===200&&v.transform.f===200),'boundary remains at exact world center/radius');
    await run("for(const a of __game.world().actors)a.statuses.find(s=>s.id==='doom').rupture=850;void 0;");
    const high=await capture('high-bank');assert.notEqual(high.hash,low.hash);
    await run("for(const a of __game.world().actors)a.statuses.find(s=>s.id==='doom').remaining=0.7;void 0;");
    const late=await capture('late-fuse');assert.notEqual(late.hash,high.hash);
    await run("for(const a of __game.world().actors){a.applyStatus('impaled',0,1,'probe',{rupture:100});a.applyStatus('burn',10,1,'probe');}void 0;");
    await capture('mixed');
    // Bright terrain at a compact viewport; same bodies and real blast boundary.
    await run("__game.world().zone.theme.floor='#cbc3af';__game.world().zone.theme.grid='#c4bca8';__game.renderer.ground.zoneRef=null;for(let i=0;i<20;i++)__game.renderer.render(__game.world());void 0;");
    win.setContentSize(960,640);await new Promise(resolve=>setTimeout(resolve,150));
    await run("window.dispatchEvent(new Event('resize'));void 0;");
    const small=await capture('bright-small');assert.equal(small.boundary.length,6);
    await run("for(const a of __game.world().actors)a.statuses=[];void 0;");
    const cured=await capture('cured');assert.equal(cured.boundary.length,0);assert.equal(cured.hash,clean.hash);
    // Resolve actual threshold-triggering damage; bank and worn warning disappear together.
    await run(`(() => {
      const w=__game.world(),a=w.actors[1];doomArm(400);a.life=350;
      const hit={...doomBase,sockets:[],def:{...doomBase.def,innateMods:[],tags:['spell','chaos'],baseDamage:{chaos:[1,1]},effects:[{type:'damage'}]}};
      w.resolveHit(w.player,hit,a);
    })()`);
    const pinch=await capture('release-pinch',0.08),burst=await capture('release-burst',0.48);
    assert.ok(pinch.released&&pinch.energy>0&&burst.energy>0);assert.notEqual(pinch.hash,burst.hash);
    const gone=await capture('released-body');assert.equal(gone.boundary.length,0);
    await run("__game.world().flashes=[];void 0;");const recovered=await capture('recovered');assert.equal(recovered.released,false);
    log('PASS real body/ground geometry, bank/fuse changes, clean removal, mixed ailments, bright compact viewport and attributable rupture phases');
  } finally {clearTimeout(timeout);win.destroy();server.server.close();app.quit();}
}).catch(e=>{log(e.stack??String(e));app.exit(1);});

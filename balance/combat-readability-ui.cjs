// Build first. Hidden real renderer; disposable saves/profile, no live character edits.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname,'reports'); fs.mkdirSync(dir,{recursive:true});
const logfile = path.join(dir,'combat-readability-ui.log'); fs.writeFileSync(logfile,'START\n');
const log = v => fs.appendFileSync(logfile,JSON.stringify(v)+'\n');
const save = (name,url) => fs.writeFileSync(path.join(dir,'threat-'+name+'.png'),Buffer.from(url.split(',')[1],'base64'));
app.setPath('userData',path.join(dir,'combat-readability-profile-'+process.pid));
app.disableHardwareAcceleration();app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{log('TIMEOUT');app.exit(1);},120000);
  const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,'combat-readability-saves-'+process.pid)});
  const win=new BrowserWindow({show:false,width:1500,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const run=code=>win.webContents.executeJavaScript(code);
  async function capture(name){
    const result=await run(`(()=>{
      const w=__game.world(),r=__game.renderer,labels=[],fill=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(t,...args){labels.push(String(t));return fill.call(this,t,...args);};
      try{r.render(w);}finally{CanvasRenderingContext2D.prototype.fillText=fill;}
      const full=document.getElementById('game').toDataURL('image/png');
      const originalCanvas=r.canvas,originalCtx=r.ctx,canvas=document.createElement('canvas');
      canvas.width=originalCanvas.width;canvas.height=originalCanvas.height;
      const ctx=canvas.getContext('2d');let gold=0;const stroke=ctx.stroke.bind(ctx);
      ctx.stroke=(...args)=>{if(ctx.strokeStyle==='#ffd890')gold++;return stroke(...args);};
      r.canvas=canvas;r.ctx=ctx;let hud,hash=0;
      try{r.drawHud(w);hud=canvas.toDataURL('image/png');const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        for(let i=0;i<data.length;i++)hash=Math.imul(hash,31)+data[i]|0;
      }finally{r.canvas=originalCanvas;r.ctx=originalCtx;}
      return {full,hud,hash,gold,labels,fatal:__game.crash().fatal,
        cues:w.flashes.filter(f=>f.combatCue).map(f=>f.combatCue.style),ward:w.actors[1].untargetable,
        life:w.player.life,cd:w.player.lastGaspCd};
    })()`);
    const {full,hud,...facts}=result;log({name,...facts});save(name,full);save(name+'-hud',hud);
    assert.equal(result.fatal,null);
    assert.ok(!result.labels.some(t=>/^(CULLED!|capped!?|volatile!|LAST GASP!)$/.test(t)||t.includes('— WARDED')));
    return result;
  }
  try{
    await win.loadURL(server.url);
    await run("window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.step(360);void 0;");
    await run(`(()=>{
      const w=__game.world();window.threatBase=w.player.skills.find(Boolean);
      w.zoneMap.qa_threat={id:'qa_threat',name:'Proving Ground',level:12,size:{w:1800,h:1400},seed:736,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_threat');w.player.pos={x:900,y:700};__game.step(240);
      w.actors=[w.player];w.projectiles=[];w.flashes=[];w.texts=[];w.zones=[];w.doodads=[];w.walk=null;w.markDoodadsChanged();
      for(const [id,x,y] of [['brute',900,420],['zombie',700,540],['zombie',1100,540],['zombie',680,720],['zombie',1120,720]]){
        const a=w.createMonster(id,1,'enemy');a.pos={x,y};a.skills=[];a.casting=null;a.anchored=true;a.spawnedAt=-1;a.aiCooldown=9999;w.actors.push(a);
      }
      for(const a of w.actors){a.statuses=[];a.sheet.setSource('threat-rig',[
        {stat:'life',kind:'override',value:1000},{stat:'mana',kind:'override',value:10000},{stat:'accuracy',kind:'override',value:100000},{stat:'damage',kind:'override',value:1},{stat:'damageTaken',kind:'override',value:1},
        ...['armor','evasion','blockChance','critChance','lifeRegen','energyShield','endurance','poise','fireRes'].map(stat=>({stat,kind:'override',value:0}))]);a.fillResources();a.tier=w.player.tier;}
      window.threatHit={...threatBase,sockets:[],def:{...threatBase.def,innateMods:[],tags:['spell','fire'],baseDamage:{fire:[40,40]},effects:[{type:'damage'}]}};
      window.threatActors=w.actors.slice();
      threatActors[1].name='Ward Bearer';threatActors[1].netBossBar={pips:0,lit:0,hl:false};threatActors[1].life=600;
      __game.settings().lowLifePulse=false;__game.settings().afflictionOverlays='still';
      Object.defineProperty(performance,'now',{value:()=>20000,configurable:true});
    })()`);
    const clean=await capture('clean');assert.equal(clean.gold,0);
    await run(`(()=>{
      const w=__game.world();w.actors[1].aiWardTag='qa_guard';w.actors[1].untargetable=true;w.actors[1].wardCueProfile='lattice';
      w.actors[2].tag=w.actors[3].tag='qa_guard';
      w.actors[4].sheet.setSource('cap',[{stat:'hitCap',kind:'override',value:10}]);
      w.actors[5].volatile={skillId:'spark_bolt',chance:1,icd:2};
      w.player.sheet.setSource('gasp',[{stat:'lastGasp',kind:'override',value:1},{stat:'lastGaspLife',kind:'override',value:0.2},{stat:'lastGaspCooldown',kind:'override',value:8}]);
    })()`);
    const ready=await capture('ready');assert.ok(ready.ward&&ready.gold>0);
    await run("__game.world().zone.theme.floor='#cbc3af';__game.world().zone.theme.grid='#c4bca8';__game.renderer.ground.zoneRef=null;for(let i=0;i<20;i++)__game.renderer.render(__game.world());void 0;");
    win.setContentSize(960,640);await new Promise(r=>setTimeout(r,150));await run("window.dispatchEvent(new Event('resize'));void 0;");
    const small=await capture('bright-small');assert.ok(small.gold>0&&small.ward);
    await run("__game.world().zone.theme.floor='#30343a';__game.world().zone.theme.grid='#353940';__game.renderer.ground.zoneRef=null;void 0;");
    win.setContentSize(1500,1000);await new Promise(r=>setTimeout(r,150));await run("window.dispatchEvent(new Event('resize'));void 0;");
    await run("threatActors[2].dead=true;__game.step(1);void 0;");assert.ok((await capture('ward-one-source')).ward);
    await run("threatActors[3].dead=true;__game.step(1);void 0;");
    const broken=await capture('ward-broken');assert.ok(!broken.ward&&broken.cues.includes('ward_break'));
    await run("(()=>{const w=__game.world();w.flashes=[];w.resolveHit(w.player,threatHit,threatActors[4]);w.resolveHit(w.player,threatHit,threatActors[5]);for(const f of w.flashes)f.life=f.maxLife*0.65;})()");
    const outcomes=await capture('cap-and-volatile');assert.ok(outcomes.cues.includes('hit_cap')&&outcomes.cues.includes('volatile_release'));
    await run("(()=>{const w=__game.world();w.flashes=[];threatActors[4].sheet.removeSource('cap');threatActors[4].life=80;w.player.sheet.setSource('cull',[{stat:'cullThreshold',kind:'override',value:0.2}]);w.resolveHit(w.player,threatHit,threatActors[4]);for(const f of w.flashes)f.life=f.maxLife*0.6;})()");
    assert.ok((await capture('executed')).cues.includes('culled'));
    await run("(()=>{const w=__game.world();w.flashes=[];w.applyDeedDot(w.player,2000,'fire');w.sweepTalentEvents(w.player);for(const f of w.flashes)f.life=f.maxLife*0.6;})()");
    const gasp=await capture('last-gasp');assert.ok(gasp.cues.includes('last_gasp')&&gasp.life===200&&gasp.cd===8);
    await run("__game.world().flashes=[];__game.world().player.updateTimers(4);void 0;");
    const half=await capture('rescue-recovering');assert.equal(half.cd,4);assert.notEqual(half.hash,gasp.hash);
    await run("__game.world().player.updateTimers(4);void 0;");
    const recovered=await capture('rescue-ready-again');assert.equal(recovered.cd,0);assert.notEqual(recovered.hash,half.hash);assert.ok(!recovered.cues.includes('last_gasp'));
    await run("__game.world().player.downed=true;void 0;");assert.equal((await capture('downed')).gold,0);
    log('PASS distinct outcomes, real rescue and cooldown HUD, live ward source loss, bright/dark terrain and compact viewport');
  }finally{clearTimeout(timeout);win.destroy();server.server.close();app.quit();}
}).catch(e=>{log(e.stack??String(e));app.exit(1);});

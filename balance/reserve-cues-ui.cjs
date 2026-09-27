// Hidden real renderer with disposable saves/profile; build before running.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname,'reports'); fs.mkdirSync(dir,{recursive:true});
const logfile = path.join(dir,'reserve-cues-ui.log'); fs.writeFileSync(logfile,'START\n');
const log = v => fs.appendFileSync(logfile,JSON.stringify(v)+'\n');
const save = (name,url) => fs.writeFileSync(path.join(dir,'reserve-'+name+'.png'),Buffer.from(url.split(',')[1],'base64'));
app.setPath('userData',path.join(dir,'reserve-cues-profile-'+process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{log('TIMEOUT');app.exit(1);},120000);
  const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,'reserve-cues-saves-'+process.pid)});
  const win=new BrowserWindow({show:false,width:1500,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const run=code=>win.webContents.executeJavaScript(code);
  async function capture(name){
    const result=await run(`(()=>{
      const w=__game.world(),r=__game.renderer,labels=[],fill=CanvasRenderingContext2D.prototype.fillText,arc=r.ctx.arc;
      let boundaries=0;
      CanvasRenderingContext2D.prototype.fillText=function(text,...args){labels.push(String(text));return fill.call(this,text,...args);};
      r.ctx.arc=function(x,y,radius,...args){if(Math.abs(radius-170)<0.001)boundaries++;return arc.call(this,x,y,radius,...args);};
      try{r.render(w);}finally{CanvasRenderingContext2D.prototype.fillText=fill;r.ctx.arc=arc;}
      const full=document.getElementById('game').toDataURL('image/png');
      const originalCanvas=r.canvas,originalCtx=r.ctx,canvas=document.createElement('canvas');
      canvas.width=originalCanvas.width;canvas.height=originalCanvas.height;
      r.canvas=canvas;r.ctx=canvas.getContext('2d');let hud;
      try{r.drawHud(w);hud=canvas.toDataURL('image/png');}finally{r.canvas=originalCanvas;r.ctx=originalCtx;}
      return {full,hud,boundaries,labels,fatal:__game.crash().fatal,bank:w.player.pools.get('qa_fuel'),
        venting:w.player.venting.has('qa_fuel'),stage:w.flashes.filter(f=>f.combatCue?.style==='reserve_spent').length,
        reserves:reserveActors.slice(1).map(a=>({id:a.defId,
          pools:[...a.reserves.values()].map(s=>({cur:s.cur,venting:s.ventUntil>w.time})),
          cues:a.tellSpecs.map((s,i)=>({source:s.source,value:a.tells?.[i]??0})).filter(s=>s.source.startsWith('reserveVent:'))}))};
    })()`);
    const {full,hud,...facts}=result; log({name,...facts}); save(name,full); save(name+'-hud',hud);
    assert.equal(result.fatal,null);
    assert.ok(!result.labels.some(t=>/^(venting!|guttering\.\.\.|running dry|bled out!|the furnace gutters\.\.\.)$/.test(t)));
    return result;
  }
  try{
    await win.loadURL(server.url);
    await run("window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.step(360);void 0;");
    await run(`(()=>{
      const w=__game.world();window.reserveBase=w.player.skills.find(Boolean);
      w.zoneMap.qa_reserve={id:'qa_reserve',name:'Proving Ground',level:12,size:{w:1800,h:1400},seed:736,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_reserve');w.player.pos={x:900,y:740};__game.step(240);
      w.actors=[w.player];w.projectiles=[];w.flashes=[];w.texts=[];w.zones=[];w.doodads=[];w.walk=null;w.markDoodadsChanged();
      for(const [id,x] of [['sapbleeder',640],['taperwight',810],['emberwyrm',990],['fumelung',1160]]){
        const a=w.createMonster(id,1,'enemy');a.pos={x,y:500};a.skills=[];a.casting=null;a.anchored=true;a.spawnedAt=-1;a.aiCooldown=9999;a.aggroed=true;a.tier=w.player.tier;w.actors.push(a);
      }
      for(const a of w.actors){a.statuses=[];a.sheet.setSource('reserve-rig',[
        {stat:'life',kind:'override',value:1000},{stat:'mana',kind:'override',value:10000},
        {stat:'damage',kind:'override',value:1},{stat:'aoeRadius',kind:'override',value:1},
        ...['poise','poiseCcAvoid','lifeRegen'].map(stat=>({stat,kind:'override',value:0}))]);a.fillResources();}
      window.reserveActors=w.actors.slice();
      window.reserveInst={...reserveBase,sockets:[],state:{},def:{...reserveBase.def,id:'qa_vent',name:'Venom Reservoir',
        tags:['spell','chaos','aoe','duration'],color:'#8ec850',requirements:undefined,manaCost:0,cooldown:0,useTime:0,innateMods:[],
        pool:{id:'qa_fuel',cap:420,min:20,damageType:'chaos',release:{mode:'vent',dps:55,radius:170}},delivery:{type:'self'},effects:[]}};
      w.player.skills=[reserveInst];w.player.pools.set('qa_fuel',420);
      __game.settings().lowLifePulse=false;
      Object.defineProperty(performance,'now',{value:()=>20000,configurable:true});
    })()`);
    const ready=await capture('ready');assert.equal(ready.boundaries,0);
    await run("(()=>{const w=__game.world();for(const a of reserveActors.slice(1,4)){for(const state of a.reserves.values())state.cur=state.max*0.2;a.reserveNextAt=0;}__game.step(12);})()");
    const low=await capture('depleted');assert.ok(low.stage>=3);
    await run("(()=>{const w=__game.world();for(const a of [reserveActors[1],reserveActors[4]]){for(const state of a.reserves.values()){state.cur=0;state.lastSpendAt=w.time;}a.reserveNextAt=0;}w.player.cooldowns.clear();if(!w.useSkill(w.player,reserveInst,w.player.pos))throw new Error('vent refused');__game.step(12);})()");
    const active=await capture('venting');assert.equal(active.boundaries,1);assert.ok(active.bank<420&&active.bank>0);assert.notEqual(active.hud,ready.hud);
    assert.ok(active.reserves[0].pools[0].venting&&active.reserves[3].pools[0].venting);
    assert.equal(active.reserves[0].cues[0].value,1);
    await run("__game.world().zone.theme.floor='#cbc3af';__game.world().zone.theme.grid='#c4bca8';__game.renderer.ground.zoneRef=null;for(let i=0;i<20;i++)__game.renderer.render(__game.world());void 0;");
    win.setContentSize(960,640);await new Promise(r=>setTimeout(r,150));await run("window.dispatchEvent(new Event('resize'));void 0;");
    assert.equal((await capture('bright-small')).boundaries,1);
    await run("__game.world().player.pools.set('qa_fuel',5);void 0;");assert.equal((await capture('last-fuel')).boundaries,1);
    await run("__game.world().player.downed=true;void 0;");assert.equal((await capture('downed-still-venting')).boundaries,1);
    await run("__game.world().player.downed=false;__game.world().player.pools.set('qa_fuel',0);void 0;");assert.equal((await capture('empty')).boundaries,0);
    await run("__game.world().player.venting.clear();__game.step(210);void 0;");const refilled=await capture('refilled');assert.equal(refilled.boundaries,0);
    for(const i of [0,3])assert.ok(!refilled.reserves[i].pools[0].venting&&refilled.reserves[i].pools[0].cur>0);
    assert.equal(refilled.reserves[0].cues[0].value,0);
    log('PASS: actual depletion and venting, body/HUD cues, real radius, bright/dark compact rendering, low fuel, downed hazard and cleanup');
    clearTimeout(timeout);win.destroy();server.server.close();app.exit(0);
  }catch(error){log(error.stack??String(error));clearTimeout(timeout);win.destroy();server.server.close();app.exit(1);}
});

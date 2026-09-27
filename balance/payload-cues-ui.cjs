// Run probe_payloadcues and build first. Real renderer, disposable saves/profile.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname,'reports'); fs.mkdirSync(dir,{recursive:true});
const catalog=JSON.parse(fs.readFileSync(path.join(dir,'payload-catalog.json'),'utf8'));
const logfile=path.join(dir,'payload-cues-ui.log'); fs.writeFileSync(logfile,'START\n');
const log=v=>fs.appendFileSync(logfile,JSON.stringify(v)+'\n');
const save=(name,url)=>fs.writeFileSync(path.join(dir,'payload-'+name+'.png'),Buffer.from(url.split(',')[1],'base64'));
app.setPath('userData',path.join(dir,'payload-cues-profile-'+process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{log('TIMEOUT');app.exit(1);},120000);
  const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,'payload-cues-saves-'+process.pid)});
  const win=new BrowserWindow({show:false,width:1500,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const run=async code=>{
    const r=await win.webContents.executeJavaScript(`(()=>{try{return{value:eval(${JSON.stringify(code)})}}catch(e){return{error:e.stack??String(e)}}})()`);
    if(r.error)throw Error(r.error);return r.value;
  };
  async function capture(name){
    const r=await run(`(()=>{
      const w=__game.world(),r=__game.renderer,labels=[],original=CanvasRenderingContext2D.prototype.fillText,arc=r.ctx.arc;
      let circles=0;
      CanvasRenderingContext2D.prototype.fillText=function(text,...args){labels.push(String(text));return original.call(this,text,...args)};
      r.ctx.arc=function(x,y,radius,...args){if(radius===90)circles++;return arc.call(this,x,y,radius,...args)};
      try{r.render(w)}finally{CanvasRenderingContext2D.prototype.fillText=original;r.ctx.arc=arc}
      const full=r.canvas.toDataURL('image/png'),canvas=document.createElement('canvas');
      const oldCanvas=r.canvas,oldCtx=r.ctx;canvas.width=oldCanvas.width;canvas.height=oldCanvas.height;
      r.canvas=canvas;r.ctx=canvas.getContext('2d');let hud;
      try{r.drawHud(w);hud=canvas.toDataURL('image/png')}finally{r.canvas=oldCanvas;r.ctx=oldCtx}
      return{full,hud,labels,circles,fatal:__game.crash().fatal,prime:w.player.primedPours.length,
        ammo:w.player.skillChargeState.get('scattergun')?.count,ambushes:w.pendingAmbushes.length,
        projectiles:w.projectiles.length,rows:__game.snapshot().actors.find(a=>a.id===w.player.id).payloadCues};
    })()`);
    const {full,hud,...facts}=r; log({name,...facts}); save(name,full);save(name+'-hud',hud);
    assert.equal(r.fatal,null);assert.ok(!r.labels.some(t=>/^(primed|loaded|armed|drinking\.\.\.|sipping\.\.\.|charging\.\.\.|arrow \d+\/\d+|anchor \d+\/\d+)$/.test(t)));
    return r;
  }
  try{
    await win.loadURL(server.url);
    await run("window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.step(360);void 0;");
    await run(`(()=>{
      const w=__game.world(),p=w.player,base=p.skills.find(Boolean);
      w.zoneMap.qa_payload={id:'qa_payload',name:'Proving Ground',level:12,size:{w:1800,h:1400},seed:736,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_payload');p.pos={x:900,y:760};__game.step(240);
      w.actors=[p];w.projectiles=[];w.flashes=[];w.texts=[];w.zones=[];w.doodads=[];w.walk=null;w.markDoodadsChanged();
      window.payloadSkills=Object.fromEntries(${JSON.stringify(catalog)}.map(def=>[def.id,{...base,sockets:[],state:{},treeNodes:[],def:{...def,requirements:undefined,useTime:0}}]));
      p.skills=['life_flask','scattergun','caroms','hanging_volley'].map(id=>payloadSkills[id]);
      p.statuses=[];p.sheet.setSource('payload-rig',[{stat:'life',kind:'override',value:1000},{stat:'mana',kind:'override',value:10000},
        {stat:'pourPrime',kind:'flat',value:2},{stat:'critChance',kind:'override',value:0}]);p.fillResources();p.charges.set('flask_life',3);
      window.payloadPress=(id,x=900,y=760)=>{p.casting=null;p.useLock=0;p.reflexLock=0;p.cooldowns.clear();if(!w.useSkill(p,payloadSkills[id],{x,y}))throw Error('refused '+id)};
      __game.settings().lowLifePulse=false;Object.defineProperty(performance,'now',{value:()=>20000,configurable:true});
    })()`);
    const idle=await capture('idle');
    await run("payloadPress('life_flask');payloadPress('life_flask');payloadPress('scattergun',1000,760);payloadPress('caroms',640,690);payloadPress('caroms',670,510);for(const [x,y] of [[810,490],[1060,490],[1100,665]])payloadPress('hanging_volley',x,y);void 0;");
    const partial=await capture('prepared');assert.equal(partial.prime,2);assert.equal(partial.ammo,2);assert.equal(partial.circles,0);assert.notEqual(partial.hud,idle.hud);
    await run("payloadPress('hanging_volley',820,665);__game.world().time+=0.6;__game.world().flashes=[];__game.world().texts=[];void 0;");
    const armed=await capture('armed');assert.equal(armed.circles,4);assert.equal(armed.ambushes,1);
    await run("__game.world().zone.theme.floor='#cbc3af';__game.world().zone.theme.grid='#c4bca8';__game.renderer.ground.zoneRef=null;for(let i=0;i<20;i++)__game.renderer.render(__game.world());void 0;");
    win.setContentSize(1000,720);await new Promise(r=>setTimeout(r,150));await run("window.dispatchEvent(new Event('resize'));void 0;");
    assert.equal((await capture('bright-small')).circles,4);
    await run("__game.world().player.skillChargeState.get('scattergun').count=0;payloadSkills.reload_powder.hostSkillId='scattergun';payloadPress('reload_powder');void 0;");
    assert.equal((await capture('reloaded')).ammo,3);
    await run("payloadPress('hanging_volley');__game.world().player.applyStatus('poison',5,1,'qa');__game.step(4);void 0;");
    const released=await capture('released');assert.equal(released.circles,0);assert.equal(released.prime,0);assert.equal(released.ambushes,0);assert.ok(released.projectiles>0);
    await run("__game.world().time+=5;__game.world().flashes=[];__game.world().texts=[];void 0;");
    const expired=await capture('expired');assert.ok(expired.rows.find(r=>r.skillId==='caroms').count===0);
    log('PASS: paid preparations, true arming reach, world/HUD shapes, reload/release/expiry, bright/dark and compact rendering');
    clearTimeout(timeout);win.destroy();server.server.close();app.exit(0);
  }catch(e){log(e.stack??String(e));clearTimeout(timeout);win.destroy();server.server.close();app.exit(1)}
});

// Build first. Actual cast transitions and renderer; hidden window, disposable saves.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {startGameServer}=require('../launcher/server.cjs');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
const logfile=path.join(dir,'casting-cues-ui.log');fs.writeFileSync(logfile,'START\n');
const log=v=>fs.appendFileSync(logfile,JSON.stringify(v)+'\n');
app.setPath('userData',path.join(dir,'casting-cues-profile-'+process.pid));
app.disableHardwareAcceleration();app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{log('TIMEOUT');app.exit(1);},120000);
  const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,'casting-cues-saves-'+process.pid)});
  const win=new BrowserWindow({show:false,width:1500,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const run=code=>win.webContents.executeJavaScript(code);
  async function capture(name) {
    const result=await run(`(()=>{
      const w=__game.world(),r=__game.renderer,labels=[],text=r.ctx.fillText.bind(r.ctx);
      r.ctx.fillText=(s,...args)=>{labels.push(s);return text(s,...args);};
      try{r.render(w);}finally{r.ctx.fillText=text;}
      return {image:document.getElementById('game').toDataURL('image/png'),fatal:__game.crash().fatal,
        labels:labels.filter(s=>/^(interrupted!?|fizzled!?|BRIMMING|refocus!)$|gather broke early|gather is too thin/.test(s)),
        cast:w.player.casting?{mode:w.player.casting.mode,elapsed:w.player.casting.elapsed,focusBroken:w.player.casting.focusBroken}:null,
        cues:w.flashes.filter(f=>f.combatCue?.style.startsWith('cast_')).map(f=>f.combatCue.style)};
    })()`);
    const {image,...facts}=result;log({name,...facts});assert.equal(result.fatal,null);assert.deepEqual(result.labels,[]);
    fs.writeFileSync(path.join(dir,'casting-'+name+'.png'),Buffer.from(image.split(',')[1],'base64'));
    return result;
  }
  try{
    await win.loadURL(server.url);
    await run("window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('guardian');__game.ui.hideAll();__game.step(360);void 0;");
    await run(`(()=>{
      const w=__game.world();w.zoneMap.qa_casting={id:'qa_casting',name:'Proving Ground',level:6,tileset:'highland',size:{w:1800,h:1400},seed:991,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_casting');w.player.pos={x:900,y:700};__game.step(240);
      w.actors=[w.player];w.doodads=[];w.walk=null;w.markDoodadsChanged();
      const p=w.player;p.sheet.setSource('casting-qa',[...['life','mana'].map(stat=>({stat,kind:'override',value:10000})),
        ...['poise','lifeRegen','manaRegen'].map(stat=>({stat,kind:'override',value:0}))]);p.fillResources();
      window.castingBase=p.skills.find(Boolean);
      window.castInst=patch=>({...castingBase,sockets:[],state:undefined,def:{...castingBase.def,id:'qa_casting',name:'Gather',requirements:undefined,
        manaCost:0,cooldown:0,innateMods:[],tags:['spell','fire'],color:'#ffad62',useTime:1,castMode:'cast',
        baseDamage:{fire:[10,10]},effects:[{type:'damage'}],delivery:{type:'projectile',speed:180,range:800,radius:8},
        targeting:undefined,concentration:undefined,guard:undefined,channel:undefined,chargeUp:undefined,...patch}});
      window.resetCast=()=>{p.casting=null;p.useLock=0;p.statuses=[];p.cooldowns.clear();p.buffs.clear();p.brims?.clear();p.poise=0;
        w.flashes=[];w.texts=[];w.projectiles=[];w.zones=[];w.actors=[p];};
      window.castStep=n=>{for(let i=0;i<n;i++)w.updateCasting(p,1/60);};
      window.startCast=patch=>{resetCast();if(!w.useSkill(p,castInst(patch),{x:1100,y:700},true))throw Error('cast did not start');};
    })()`);
    await run("startCast({});castStep(15);void 0;");await capture('preparing');
    await run("__game.world().player.applyStatus('stun',0,1,'UI probe');castStep(1);void 0;");
    assert.deepEqual((await capture('interrupted')).cues,['cast_interrupt']);
    await run("__game.world().flashes.forEach(f=>f.life-=0.2);void 0;");await capture('fracture-outward');
    await run(`(()=>{startCast({castMode:'charge',chargeUp:{maxTime:2,minScale:0.5,maxScale:2}});castStep(55);})()`);
    await capture('charge-partial');
    await run('castStep(100);void 0;');await capture('charge-held-ready');
    await run('__game.world().player.casting.held=false;castStep(1);void 0;');assert.equal((await capture('charge-released')).cast,null);
    await run(`(()=>{
      resetCast();const w=__game.world(),p=w.player,e=w.createMonster('zombie',1,'enemy');e.pos={x:1100,y:700};w.actors.push(e);
      if(!w.useSkill(p,castInst({targeting:{target:'enemy',castRange:400},concentration:{time:2,onBreak:'drain',drainRate:1}}),e.pos,true))throw Error('focus did not start');
      castStep(55);
    })()`);
    await capture('focused');
    await run('__game.world().player.casting.aim={x:1100,y:950};castStep(8);void 0;');
    assert.equal((await capture('focus-lost')).cast.focusBroken,true);
    await run('__game.world().player.casting.aim={x:1100,y:700};castStep(3);void 0;');
    assert.equal((await capture('focus-recovered')).cast.focusBroken,false);
    await run('__game.world().player.casting.held=false;castStep(1);void 0;');
    assert.deepEqual((await capture('fizzled')).cues,['cast_fizzle']);
    await run('__game.world().flashes.forEach(f=>f.life-=0.3);void 0;');await capture('fizzle-falling');
    await run(`startCast({castMode:'channel',channel:{interval:0.5,release:{pulses:false},brim:{fillTime:2,minRelease:0.12}}});castStep(45);void 0;`);
    await capture('brim-partial');
    await run('castStep(100);void 0;');assert.deepEqual((await capture('brim-ready')).cues,['cast_ready']);
    await run('__game.world().flashes=[];castStep(50);void 0;');assert.deepEqual((await capture('brim-held-ready')).cues,[]);
    await run(`startCast({castMode:'channel',channel:{interval:0.5,maxHold:4,release:{pulses:false,requireFull:true}}});castStep(10);
      __game.world().player.casting.held=false;castStep(1);void 0;`);
    assert.deepEqual((await capture('gather-abandoned')).cues,['cast_fizzle']);
    await run(`startCast({castingCue:false,castMode:'charge',chargeUp:{maxTime:2,minScale:0.5,maxScale:2}});castStep(155);void 0;`);
    await capture('body-optout-bar-retained');
    await run('resetCast();void 0;');await capture('cleared');
    log('PASS actual cast interruption, charge/gather readiness, lost/recovered focus, failed release, opt-out and cleanup render without captions');
  }finally{clearTimeout(timeout);win.destroy();server.server.close();app.quit();}
}).catch(e=>{log(e.stack??String(e));app.exit(1);});

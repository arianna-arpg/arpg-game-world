// Build first. Actual game renderer, hidden window, disposable saves/profile.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {startGameServer}=require('../launcher/server.cjs');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
const logfile=path.join(dir,'warning-cues-ui.log');fs.writeFileSync(logfile,'START\n');
const log=v=>fs.appendFileSync(logfile,JSON.stringify(v)+'\n');
app.setPath('userData',path.join(dir,'warning-cues-profile-'+process.pid));
app.disableHardwareAcceleration();app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{log('TIMEOUT');app.exit(1);},120000);
  const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,'warning-cues-saves-'+process.pid)});
  const win=new BrowserWindow({show:false,width:1500,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const run=code=>win.webContents.executeJavaScript(code);
  async function capture(name,expect={}) {
    const result=await run(`(()=>{
      const w=__game.world(),labels=[],original=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(t,...r){labels.push(String(t));return original.call(this,t,...r);};
      try{__game.renderer.render(w);}finally{CanvasRenderingContext2D.prototype.fillText=original;}
      return {fatal:__game.crash().fatal,labels,phase:w.actors.find(a=>a.encounterOrder)?.encounterOrder?.phase,
        plan:w.actors.find(a=>a.encounterOrder)?.encounterOrder?.plan,
        guard:window.warnGuard?.casting?{deadline:warnGuard.casting.aiGuardReleaseAt,shield:warnGuard.casting.shield}:null,
        image:document.getElementById('game').toDataURL('image/png')};
    })()`);
    const {image,...facts}=result;log({name,...facts});assert.equal(result.fatal,null);
    assert.ok(!result.labels.some(t=>/Bash incoming!|Regrouping|Protect the back line!|Take the flanks!|Split the firing line!|Fall back—cover them!|The roots draw taut|Their hands are occupied/.test(t)));
    for(const [key,value]of Object.entries(expect))assert.equal(result[key],value,name+' '+key);
    fs.writeFileSync(path.join(dir,'warning-'+name+'.png'),Buffer.from(image.split(',')[1],'base64'));
  }
  try{
    await win.loadURL(server.url);
    await run("window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('guardian');__game.ui.hideAll();__game.step(360);void 0;");
    await run(`(()=>{
      const w=__game.world();w.player.invulnerable=true;
      w.zoneMap.qa_warning={id:'qa_warning',name:'Proving Ground',level:18,tileset:'highland',size:{w:1800,h:1400},seed:991,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_warning');w.player.pos={x:900,y:850};__game.step(240);
      window.advanceWarning=(n,ai=false)=>{for(let i=0;i<n;i++){
        if(ai)for(const a of w.actors)if(a!==w.player)__game.ai(a,w,1/60);
        w.update(1/60);
      }};
      window.clearWarning=()=>{w.actors=[w.player];w.projectiles=[];w.zones=[];w.texts=[];w.flashes=[];w.doodads=[];w.walk=null;w.markDoodadsChanged();w.player.casting=null;};
      clearWarning();
      const a=w.createMonster('sylvan_warden',1,'enemy');a.pos={x:830,y:650};a.facing=a.facingPrev=Math.PI/2;
      a.spawnedAt=-1;w.actors.push(a);window.warnGuard=a;
      const inst=a.skills.find(s=>s?.def.id==='shield_up');w.useSkill(a,inst,{x:830,y:800},true);
      if(!a.casting)throw Error('guard failed');a.casting.aiHold=2;a.casting.aiGuardWindup=0.55;
      for(let i=0;i<180&&a.casting?.aiGuardReleaseAt===undefined;i++)advanceWarning(1);
    })()`);
    await capture('bash-early');
    await run('advanceWarning(23);void 0;');await capture('bash-late');
    await run('warnGuard.casting.shield=warnGuard.casting.maxShield*0.05;void 0;');await capture('bash-disarmed');
    await run('advanceWarning(20);void 0;');await capture('bash-cleared',{guard:null});
    for(const [plan,recipe,tileset]of [
      ['protect_support','wayward_expedition','highland'],['crossfire','wayward_expedition','highland'],
      ['pincer','pipers_ambush','metropolis'],['covered_withdrawal','wayward_expedition','highland'],
      ['root_barrage','snare_nursery','forest'],['countercast','rift_observatory','abyssal_rift']]){
      await run(`(()=>{
        const w=__game.world();clearWarning();window.warnGuard=null;
        w.zone={...w.zone,tileset:'${tileset}'};
        const members=w.spawnEncounterGroup('${recipe}',18,{x:900,y:550},{facing:Math.PI/2});
        const leader=members.find(a=>a.encounterGroup?.leader);if(!leader)throw Error('missing leader');
        window.warnLeader=leader;window.warnMembers=members;
        w.player.pos={x:leader.pos.x+350,y:leader.pos.y};
        for(const a of members){a.emergeUntil=undefined;a.aiTargetId=w.player.id;a.aggroed=true;a.spawnedAt=-1;}
        if('${plan}'==='protect_support'){const support=members.find(a=>a.defId==='wayward_mender');w.player.pos={x:support.pos.x+100,y:support.pos.y};support.life*=0.4;}
        if('${plan}'==='covered_withdrawal')leader.life*=0.3;
        if('${plan}'==='pincer')w.player.pos={x:leader.pos.x+300,y:leader.pos.y};
        if('${plan}'==='countercast')w.player.casting={inst:w.player.skills.find(Boolean),mode:'cast',aim:leader.pos,elapsed:0,total:20,held:true,baseMult:1};
        for(let i=0;i<120&&!members.some(a=>a.encounterOrder?.phase==='warning');i++)advanceWarning(1);
        advanceWarning(30);
      })()`);
      await capture(plan+'-warning',{plan,phase:'warning'});
      if(plan==='crossfire') {
        await run("for(let i=0;i<120&&!warnMembers.some(a=>a.encounterOrder?.phase==='commit');i++)advanceWarning(1);advanceWarning(15,true);void 0;");
        await capture('crossfire-commit',{plan,phase:'commit'});
        await run("warnLeader.poise=0;warnLeader.applyStatus('stun',0,2,'probe');advanceWarning(1);void 0;");
        await capture('crossfire-interrupted',{plan,phase:'recover'});
        await run('advanceWarning(110);void 0;');await capture('crossfire-cleared',{phase:undefined});
      }
    }
    log('PASS live bash loading/disarm and all six plans; commitment, interruption and cleanup without captions');
  }finally{clearTimeout(timeout);win.destroy();server.server.close();app.quit();}
}).catch(e=>{log(e.stack??String(e));app.exit(1);});

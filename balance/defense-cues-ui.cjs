// Hidden real-renderer QA. Build first; profiles and saves are disposable.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'),path = require('node:path'),assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
const logFile=path.join(dir,'defense-cues-ui.log');fs.writeFileSync(logFile,'START\n');
const log=v=>fs.appendFileSync(logFile,JSON.stringify(v)+'\n');
app.setPath('userData',path.join(dir,'defense-cues-profile-'+process.pid));
app.disableHardwareAcceleration();app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{log('TIMEOUT');app.exit(1);},120000);
  const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,'defense-cues-saves-'+process.pid)});
  const win=new BrowserWindow({show:false,width:1500,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});
  try{
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.step(360);void 0;");
    await win.webContents.executeJavaScript(`(()=>{
      const w=__game.world();w.player.invulnerable=true;
      w.zoneMap.qa_defense={id:'qa_defense',name:'Proving Ground',level:6,size:{w:1600,h:1200},seed:23456,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_defense');w.player.pos={x:800,y:700};__game.step(300);w.actors=[w.player];w.projectiles=[];
      const ids=['rockgrub','garden_snail','shore_crab','brute','sylvan_warden'];
      for(const [i,id] of ids.entries()){
        const a=w.createMonster(id,6,'enemy');a.pos=i<3?{x:600+i*200,y:490}:{x:680+(i-3)*240,y:640};
        a.anchored=true;a.brain={type:'basic',skillUse:{mode:'priority',order:[]},tempo:null};
        a.facing=a.facingPrev=Math.PI/2;a.spawnedAt=-1;a.invulnerable=true;w.actors.push(a);
        if(id==='brute'){a.sheet.setSource('cue-rig',[{stat:'poise',kind:'override',value:50}]);a.poise=a.maxPoise();}
      }
      const guard=w.actors[5],inst=guard.skills.find(s=>s?.def.guard);if(!inst)throw Error('guard fixture missing skill');
      guard.useLock=0;guard.cooldowns.clear();w.useSkill(guard,inst,{x:guard.pos.x,y:guard.pos.y+100},true);
      if(!guard.casting)throw Error('guard failed to raise');guard.casting.elapsed=2;
      __game.step(1);w.flashes=[];w.texts=[];
    })()`);
    for(const phase of ['intact','impact','break','exposed','regrowing','reformed']){
      const result=await win.webContents.executeJavaScript(`(()=>{
        const w=__game.world(),shells=w.actors.slice(1,4),braced=w.actors[4],guard=w.actors[5];
        const packet=n=>({amounts:{physical:n},crit:false,tags:new Set(['attack']),sourceName:'probe'});
        const strike=a=>({x:a.pos.x+Math.cos(a.facing)*100,y:a.pos.y+Math.sin(a.facing)*100});
        if('${phase}'==='impact'){
          for(const a of shells)w.tryShellPool(a,strike(a),packet(5),a.shellGuard);
          w.tryGuardBlock(guard,w.player,strike(guard),1);__game.step(3);
        }
        if('${phase}'==='break'){
          for(const a of shells)w.tryShellPool(a,strike(a),packet(a.shellGuard.pool+10),a.shellGuard);
          braced.damagePoise(braced.maxPoise()+1);w.sweepDefenseEvents(braced);
          if(!guard.casting)throw Error('guard unexpectedly ended');
          w.tryGuardBlock(guard,w.player,strike(guard),guard.casting.shield+1);
          w.player.applyStatus('winded',0,2/1.4,'probe');__game.step(8);
        }
        if('${phase}'==='exposed')__game.step(40);
        if('${phase}'==='regrowing'){
          for(const a of shells){a.shellGuard.lastHitAt=w.time-10;a.shellGuard.regenRate=a.shellGuard.max*0.5;}
          __game.step(24);
        }
        if('${phase}'==='reformed'){
          __game.step(27);braced.gainPoise(braced.maxPoise());w.player.endStatus('winded');__game.step(2);
        }
        const labels=[],original=CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText=function(t,...rest){labels.push(String(t));return original.call(this,t,...rest);};
        try{__game.step(1);}finally{CanvasRenderingContext2D.prototype.fillText=original;}
        return {phase:'${phase}',labels,fatal:__game.crash().fatal,
          shells:shells.map(a=>({id:a.defId,pool:a.shellGuard.pool,max:a.shellGuard.max,broken:a.shellGuard.broken,style:a.shellGuard.shellVisual??'shell'})),
          poiseBroken:braced.poiseBroken,guarding:!!guard.casting,winded:w.player.statuses.some(s=>s.id==='winded'),
          cues:w.flashes.filter(f=>f.defenseCue).map(f=>f.defenseCue),image:document.getElementById('game').toDataURL('image/png')};
      })()`);
      const {image,...facts}=result;log(facts);assert.equal(result.fatal,null);
      assert.ok(!result.labels.some(t=>/^(BROKEN!|POISED|guard broken!|blocked|block!|shield bash!|SHELL BREAKS!|shell|shell regrows)$/.test(t)));
      if(phase==='intact')assert.ok(result.shells.every(s=>!s.broken)&&result.guarding);
      if(phase==='break')assert.ok(result.shells.every(s=>s.broken)&&result.poiseBroken&&!result.guarding&&result.winded);
      if(phase==='regrowing')assert.ok(result.shells.every(s=>s.broken&&s.pool>0&&s.pool<s.max*0.4));
      if(phase==='reformed')assert.ok(result.shells.every(s=>!s.broken)&&!result.poiseBroken&&!result.winded);
      fs.writeFileSync(path.join(dir,'defense-'+phase+'.png'),Buffer.from(image.split(',')[1],'base64'));
    }
    log('PASS fallback, spiral, carapace, poise, guard and brief Winded rendered without migrated captions');
  }finally{clearTimeout(timeout);win.destroy();server.server.close();app.quit();}
}).catch(error=>{log(error.stack??String(error));app.exit(1);});

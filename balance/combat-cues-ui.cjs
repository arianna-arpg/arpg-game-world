// Hidden real-renderer QA; build first. Saves/profile are disposable.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, {recursive:true});
const logfile = path.join(dir, 'combat-cues-ui.log'); fs.writeFileSync(logfile,'START\n');
const log = v => fs.appendFileSync(logfile, JSON.stringify(v)+'\n');
app.setPath('userData',path.join(dir,'combat-cues-profile-'+process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{log('TIMEOUT');app.exit(1);},120000);
  const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,'combat-cues-saves-'+process.pid)});
  const win=new BrowserWindow({show:false,width:1500,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.step(360);void 0;");
    await win.webContents.executeJavaScript(`(()=>{
      const w=__game.world(); window.cueBase=w.player.skills.find(Boolean);
      w.zoneMap.qa_combat={id:'qa_combat',name:'Proving Ground',level:6,size:{w:1600,h:1200},seed:23456,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_combat');w.player.pos={x:800,y:660};__game.step(300);
      window.cueInst=patch=>({...cueBase,sockets:[],def:{...cueBase.def,requirements:undefined,manaCost:0,cooldown:0,
        innateMods:[],tags:['spell','fire'],baseDamage:{fire:[40,40]},effects:[{type:'damage'}],
        delivery:{type:'projectile',speed:180,range:800,radius:8},...patch}});
      window.cueSetup=()=>{
        w.actors=[w.player];w.projectiles=[];w.zones=[];w.flashes=[];w.texts=[];w.player.casting=null;
        w.player.invulnerable=true;w.player.useLock=0;w.player.cooldowns.clear();w.player.statuses=[];
        w.player.pos={x:800,y:660};w.player.facing=0;
        w.player.sheet.setSource('cue-rig',[{stat:'life',kind:'override',value:10000},{stat:'mana',kind:'override',value:10000},
          {stat:'critChance',kind:'override',value:0},{stat:'lifeRegen',kind:'override',value:0}]);w.player.fillResources();
        for(let i=0;i<3;i++){
          const a=w.createMonster('zombie',1,'enemy');a.pos={x:600+i*200,y:490};a.anchored=true;a.skills=[];
          a.brain={type:'basic',skillUse:{mode:'priority',order:[]},tempo:null};a.spawnedAt=-1;
          a.sheet.setSource('cue-rig',[{stat:'life',kind:'override',value:10000},{stat:'armor',kind:'override',value:0},
            {stat:'evasion',kind:'override',value:0},{stat:'blockChance',kind:'override',value:0}]);a.fillResources();w.actors.push(a);
        }
      };
    })()`);
    for(const phase of ['avoidance','timing','critical','parry-ready','parry-impact','reflected','recovered']) {
      const result=await win.webContents.executeJavaScript(`(()=>{
        const w=__game.world(),p=w.player;
        if(!['parry-impact','reflected','recovered'].includes('${phase}'))cueSetup();
        const [a,b,c]=w.actors.slice(1);
        if('${phase}'==='avoidance'){
          a.sheet.setSource('avoid',[{stat:'hitImmune',kind:'override',value:1}]);b.invulnerable=true;
          c.sheet.setSource('resist',[{stat:'ailmentResist',kind:'override',value:1}]);
          const inst=cueInst({effects:[{type:'damage'},{type:'status',status:'burn',chance:1,magnitude:0.5}]});
          for(const target of [a,b])w.resolveHit(p,inst,target);
          for(let i=0;i<8&&!w.flashes.some(f=>f.combatCue?.style==='resist');i++)w.resolveHit(p,inst,c);__game.step(5);
        }
        if('${phase}'==='timing'){
          for(const [i,target] of [a,b,c].entries()){
            const mode=i===1?'timed':'perfect',inst=cueInst({castMode:mode,overcharge:{stages:3,time:1,perStage:0.2},effects:[]});
            target.casting={inst,mode:i===2?'overcharge':mode,aim:{x:target.pos.x,y:target.pos.y-100},
              elapsed:i===1?0.5:i===2?0.1:0.8,total:1,baseMult:1,held:i!==2,indicatorAt:0.5,stage:1,sinceStage:0,sparkWindow:0.2,aiHold:0};
            if(i<2)w.castPress(target);else w.updateCasting(target,0);
            target.casting=null;
          }__game.step(3);
        }
        if('${phase}'==='critical'){
          p.sheet.setSource('crit',[{stat:'critChance',kind:'override',value:1},{stat:'critMulti',kind:'override',value:2},{stat:'dotCrit',kind:'override',value:1}]);
          const inst=cueInst({effects:[{type:'damage'},{type:'status',status:'burn',chance:1,magnitude:0.5}]});
          a.life-=1000;for(let i=0;i<8&&!w.flashes.some(f=>f.combatCue?.style==='mend');i++)w.applyHeal(p,inst,a,{amount:10});
          for(let i=0;i<8&&!w.flashes.some(f=>f.combatCue?.style==='affliction');i++)w.resolveHit(p,inst,b);
          const z={caster:c,inst,pos:{...c.pos},radius:70,shape:0,facing:0,color:'#dab47a',dmgMult:1,depth:0,flatBonus:0,struck:new Set()};
          w.detonateFissureSegment(z,1,1);__game.step(5);p.sheet.removeSource('crit');
        }
        if('${phase}'==='parry-ready'){
          w.actors=[p,c];c.pos={x:1080,y:660};
          const guard=cueInst({castMode:'guard',guard:{arcDeg:160,shield:100,parry:{window:2,counterMult:1},endOnParry:true}});
          c.facing=c.facingPrev=Math.PI;c.casting={inst:guard,mode:'guard',aim:{...p.pos},elapsed:0,total:3,held:true,baseMult:1,channelTime:0,shield:100,maxShield:100,aiHold:10};
          __game.step(1);
        }
        if('${phase}'==='parry-impact'){
          w.spawnProjectile(p,cueInst({}),{...p.pos},0);
          for(let i=0;i<120&&!w.projectiles.some(s=>s.parryDamage);i++){w.time+=1/60;w.updateProjectiles(1/60);}
          __game.step(3);
        }
        if('${phase}'==='reflected')__game.step(25);
        if('${phase}'==='recovered')__game.step(160);
        const labels=[],original=CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText=function(t,...rest){labels.push(String(t));return original.call(this,t,...rest);};
        try{__game.step(1);}finally{CanvasRenderingContext2D.prototype.fillText=original;}
        return {phase:'${phase}',labels,fatal:__game.crash().fatal,guarding:!!w.actors[1]?.casting,
          cues:w.flashes.filter(f=>f.combatCue).map(f=>f.combatCue.style),
          reflected:w.projectiles.filter(s=>s.parryDamage).map(s=>({x:s.pos.x,y:s.pos.y,dir:s.dir})),
          image:document.getElementById('game').toDataURL('image/png')};
      })()`);
      const {image,...facts}=result;log(facts);assert.equal(result.fatal,null);
      assert.ok(!result.labels.some(t=>/^(PARRY!|evade|immune|resisted|Perfect!|Flawless!|Perfect release!|Flawless release!|On the spark!|crit mend!|crit affliction!|aftershock!)$/.test(t)));
      const expected={avoidance:['evade','immune','resist'],timing:['perfect','flawless','spark'],critical:['mend','affliction','aftershock'],'parry-impact':['parry']}[phase];
      if(expected)assert.ok(expected.every(s=>result.cues.includes(s)),phase+' emitted expected live cues');
      if(phase==='parry-ready')assert.ok(result.guarding);
      if(phase==='reflected')assert.ok(result.reflected.length&&!result.guarding);
      if(phase==='recovered')assert.ok(!result.reflected.length&&!result.cues.length&&!result.guarding);
      fs.writeFileSync(path.join(dir,'combat-'+phase+'.png'),Buffer.from(image.split(',')[1],'base64'));
    }
    log('PASS actual outcomes, opening, reflection and recovery render without migrated captions');
  } finally {clearTimeout(timeout);win.destroy();server.server.close();app.quit();}
}).catch(e=>{log(e.stack??String(e));app.exit(1);});

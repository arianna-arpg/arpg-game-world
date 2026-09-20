// Build first. Offscreen client, disposable profile and saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'guardians-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = value => fs.appendFileSync(logfile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'guardians-ui-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'guardians-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]}); __game.account().ledger.prologue_lived=1; __game.devStartRun('warrior'); __game.ui.hideAll(); __game.step(360); void 0;");
    for (const phase of ['rime-aim', 'rime-flight', 'guardian-ready', 'guardian-catch', 'guardian-rebuild']) {
      const result = await win.webContents.executeJavaScript(`(() => {
        const w=__game.world(); w.player.invulnerable=true;
        w.zoneMap.qa_guardians={ id:'qa_guardians',name:'Wake Proving Ground',level:20,size:{w:1600,h:1200},
          theme:{floor:'#22252a',grid:'#282c32',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
          seed:23456,layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000} };
        w.loadZone('qa_guardians'); w.player.pos={x:800,y:600}; __game.step(300);
        w.actors=[w.player]; w.projectiles=[]; w.satellites.clear(); w.auroras.clear(); w.guardians.clear();
        w.player.sheet.removeSource('qa-carried');
        const foe=(x,y)=>{
          const a=w.createMonster('skeleton_warrior',20,'enemy'); a.pos={x,y};
          a.anchored=true; a.skills=[]; a.spawnedAt=-1;
          a.sheet.setSource('qa-still',[{stat:'moveSpeed',kind:'more',value:-1},{stat:'life',kind:'flat',value:100000}]);
          a.fillResources(); w.actors.push(a); return a;
        };
        if('${phase}'.startsWith('rime')){
          w.player.sheet.setSource('qa-carried',[{stat:'satelliteCount_rime_wake',kind:'flat',value:1}]);
          foe(920,700); foe(1170,570);
          for(let i=0;i<${phase === 'rime-aim' ? 62 : 72};i++)w.refreshSatellites(1/60);
          __game.step(${phase === 'rime-flight' ? 9 : 1});
        } else {
          w.player.sheet.setSource('qa-carried',[{stat:'guardianCount_graveglass',kind:'flat',value:1}]);
          for(let i=0;i<300;i++)w.refreshGuardians(1/60);
          const e=foe(1000,600);
          if('${phase}'!=='guardian-ready'){
            const inst={level:1,sockets:[],def:{id:'qa_guard_shot',name:'Ember',color:'#ed9355',noDrop:true,
              tags:['fire','projectile'],manaCost:0,cooldown:0,useTime:0,baseDamage:{fire:[10,10]},
              delivery:{type:'projectile',speed:300,radius:5,range:900},effects:[{type:'damage'}]}};
            w.spawnProjectile(e,inst,e.pos,Math.PI); __game.step(${phase === 'guardian-catch' ? 31 : 181});
          }
        }
        const canvas=document.getElementById('game'), labels=[], original=CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText=function(text,...rest){labels.push(String(text));return original.call(this,text,...rest);};
        try{__game.step(1);}finally{CanvasRenderingContext2D.prototype.fillText=original;}
        return {phase:'${phase}',labels,orbs:w.satellites.visuals,panes:w.guardians.visuals,
          shots:w.projectiles.map(p=>({x:p.pos.x,y:p.pos.y,shape:p.shape,skill:p.inst.def.id})),
          fatal:__game.crash().fatal,image:canvas.toDataURL('image/png')};
      })()`);
      const { image, ...facts }=result; log(facts); assert.equal(result.fatal,null);
      assert.ok(!result.labels.some(t=>/satellite|guardian|recharg|rime wake|graveglass/i.test(t)), 'the effect needs no combat caption');
      if(phase==='rime-aim') assert.ok(result.orbs.some(v=>v.aimX!==undefined && v.aimProgress>0));
      if(phase==='rime-flight') assert.ok(result.shots.some(p=>p.skill==='satellite_rime_wake'&&p.shape==='line'));
      if(phase==='guardian-ready') assert.ok(result.panes.some(p=>p.kind==='reserve'&&p.progress===1));
      if(phase==='guardian-catch'){ assert.ok(result.panes.some(p=>p.kind==='catch')); assert.equal(result.shots.length,0); }
      if(phase==='guardian-rebuild') assert.ok(result.panes.some(p=>p.kind==='reserve'&&p.progress>0.3&&p.progress<0.8));
      fs.writeFileSync(path.join(dir,`guardians-${phase}.png`),Buffer.from(image.split(',')[1],'base64'));
    }
    log('PASS cold aim/flight and guardian reserve/catch/rebuild; no combat captions');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error=>{ log(error.stack??String(error)); app.exit(1); });

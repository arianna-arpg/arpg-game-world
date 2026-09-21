// Build first. Hidden client, isolated profile and saves; no player save writes.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'creepers-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = value => fs.appendFileSync(logfile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'creepers-ui-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'creepers-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]}); __game.account().ledger.prologue_lived=1; __game.devStartRun('warrior'); __game.ui.hideAll(); __game.step(360); void 0;");
    for (const phase of ['roam', 'hunt', 'windup', 'strike', 'return', 'brood']) {
      const result = await win.webContents.executeJavaScript(`(() => {
        const w=__game.world(); w.player.invulnerable=true;
        w.zoneMap.qa_creepers={ id:'qa_creepers',name:'Barrow Proving Ground',level:14,size:{w:1600,h:1200},
          theme:{floor:'#22252a',grid:'#282c32',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
          seed:23456,layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000} };
        w.loadZone('qa_creepers'); w.player.pos={x:800,y:600}; __game.step(300);
        w.actors=[w.player]; w.projectiles=[]; w.satellites.clear(); w.auroras.clear(); w.guardians.clear(); w.creepers.clear();
        w.player.sheet.setSource('qa-carried',[{stat:'creeperCount_barrow',kind:'flat',value:${phase === 'brood' ? 3 : 1}}]);
        const foe=(x,y)=>{
          const a=w.createMonster('skeleton_warrior',14,'enemy'); a.pos={x,y}; a.anchored=true; a.skills=[]; a.spawnedAt=-1;
          a.sheet.setSource('qa-still',[{stat:'moveSpeed',kind:'more',value:-1},{stat:'life',kind:'flat',value:100000}]);
          a.fillResources(); w.actors.push(a); return a;
        };
        let prey;
        if(!['roam','brood'].includes('${phase}'))prey=foe(1000,620);
        const before=prey?.life;
        const until=test=>{for(let i=0;i<500;i++){__game.step(1);if(test())return;}throw Error('phase never reached: ${phase}');};
        if(['roam','brood'].includes('${phase}')) __game.step(145);
        else if('${phase}'==='hunt') until(()=>w.creepers.visuals.some(v=>v.phase==='hunt'&&v.x>850));
        else {
          until(()=>w.creepers.visuals.some(v=>v.phase==='windup'));
          if('${phase}'==='windup') __game.step(9);
          if('${phase}'==='strike') until(()=>w.creepers.visuals.some(v=>v.phase==='strike'));
          if('${phase}'==='return'){prey.pos.x=1400;__game.step(8);}
        }
        const canvas=document.getElementById('game'), labels=[], original=CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText=function(text,...rest){labels.push(String(text));return original.call(this,text,...rest);};
        try{__game.step(1);}finally{CanvasRenderingContext2D.prototype.fillText=original;}
        return {phase:'${phase}',labels,creepers:w.creepers.visuals,actors:w.actors.length,
          hurt:prey?prey.life<before:false,fatal:__game.crash().fatal,image:canvas.toDataURL('image/png')};
      })()`);
      const { image, ...facts }=result; log(facts); assert.equal(result.fatal,null);
      assert.ok(!result.labels.some(t=>/creeper|pursu|leash|return|eruption|burrow/i.test(t)), 'no explanatory combat captions');
      assert.equal(result.creepers.length,phase==='brood'?3:1);
      assert.ok(result.creepers.some(v=>v.phase===(phase==='brood'?'roam':phase)));
      if(phase==='strike') assert.ok(result.hurt);
      else assert.ok(!result.hurt);
      assert.equal(result.actors,['roam','brood'].includes(phase)?1:2);
      fs.writeFileSync(path.join(dir,`creepers-${phase}.png`),Buffer.from(image.split(',')[1],'base64'));
    }
    log('PASS roaming brood, pursuit, warned eruption, impact and return; no combat captions or extra actors');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error=>{log(error.stack??String(error));app.exit(1);});

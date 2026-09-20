// Build first. Offscreen client, disposable profile and saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'auroras-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = value => fs.appendFileSync(logfile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'auroras-ui-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'auroras-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]}); __game.account().ledger.prologue_lived=1; __game.devStartRun('warrior'); __game.ui.hideAll(); __game.step(360); void 0;");
    for (const phase of ['storm', 'gathering', 'full', 'cascade', 'replenish']) {
      const result = await win.webContents.executeJavaScript(`(() => {
        const w=__game.world(); w.player.invulnerable=true;
        w.zoneMap.qa_auroras={ id:'qa_auroras',name:'Wake Proving Ground',level:18,size:{w:1600,h:1200},
          theme:{floor:'#22252a',grid:'#282c32',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
          seed:23456,layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000} };
        w.loadZone('qa_auroras'); w.player.pos={x:800,y:600}; __game.step(300);
        w.actors=[w.player]; w.projectiles=[]; w.satellites.clear(); w.auroras.clear();
        w.player.sheet.removeSource('qa-carried');
        w.player.sheet.setSource('qa-carried',[{stat:'${phase === 'storm' ? 'satelliteCount_storm_wake' : 'auroraCapacity_pall'}',kind:'flat',value:${phase === 'storm' ? 3 : 16}}]);
        const foes = Array.from({length:8},(_,i)=>{
          const a=w.createMonster('skeleton_warrior',18,'enemy');
          a.pos={x:800+Math.cos(i*Math.PI/4)*230,y:600+Math.sin(i*Math.PI/4)*230};
          a.anchored=true; a.skills=[]; a.spawnedAt=-1;
          a.sheet.setSource('qa-still',[{stat:'moveSpeed',kind:'more',value:-1},{stat:'life',kind:'flat',value:100000}]); a.fillResources(); return a;
        });
        if('${phase}'==='storm'){
          w.actors.push(...foes); for(let i=0;i<61;i++)w.refreshSatellites(1/60);
          __game.step(16);
        } else {
          for(let i=0;i<${phase === 'gathering' ? 240 : 660};i++)w.refreshAuroras(1/60);
          if(['cascade','replenish'].includes('${phase}')){
            w.actors.push(...foes); __game.step(${phase === 'cascade' ? 51 : 144});
          } else __game.step(1);
        }
        const canvas=document.getElementById('game'), labels=[], original=CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText=function(text,...rest){labels.push(String(text));return original.call(this,text,...rest);};
        try{__game.step(1);}finally{CanvasRenderingContext2D.prototype.fillText=original;}
        return {phase:'${phase}',labels,orbs:w.satellites.visuals,bubbles:w.auroras.visuals,
          shots:w.projectiles.map(p=>({x:p.pos.x,y:p.pos.y,paint:p.orbPaint,skill:p.inst.def.id})),
          fatal:__game.crash().fatal,image:canvas.toDataURL('image/png')};
      })()`);
      const { image, ...facts }=result; log(facts); assert.equal(result.fatal,null);
      assert.ok(!result.labels.some(t=>/aurora|satellite|recharg|cascade|storm wake/i.test(t)), 'the effect needs no combat caption');
      if(phase==='storm'){ assert.equal(result.orbs.length,3); assert.ok(result.shots.some(p=>p.paint?.spark)); }
      if(phase==='gathering') assert.ok(result.bubbles.length>0&&result.bubbles.length<16);
      if(phase==='full'){ assert.equal(result.bubbles.length,16); assert.ok(result.bubbles.every(b=>b.charge===1)); assert.equal(result.shots.length,0); }
      if(phase==='cascade'){ assert.ok(result.bubbles.some(b=>b.releasing)); assert.ok(result.shots.length>0); }
      if(phase==='replenish'){ assert.ok(result.bubbles.length>0&&result.bubbles.length<16); assert.ok(result.bubbles.every(b=>!b.releasing)); }
      fs.writeFileSync(path.join(dir,`auroras-${phase}.png`),Buffer.from(image.split(',')[1],'base64'));
    }
    log('PASS lightning, gathering, full reservoir, outward cascade and refill; no combat captions');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error=>{ log(error.stack??String(error)); app.exit(1); });

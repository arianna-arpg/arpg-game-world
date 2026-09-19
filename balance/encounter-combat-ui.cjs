// Build first. Real client with a hidden window and isolated disposable saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
const logFile=path.join(dir,'encounter-combat-ui.log');fs.writeFileSync(logFile,'START\n');
const log=x=>fs.appendFileSync(logFile,JSON.stringify(x)+'\n');
app.setPath('userData',path.join(dir,'encounter-combat-profile-'+process.pid));
app.disableHardwareAcceleration();app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{log('TIMEOUT');app.exit(1);},55000);
  const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,'encounter-combat-saves-'+process.pid)});
  const win=new BrowserWindow({show:false,width:1200,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
  try {
    await win.loadURL(server.url);
    const warning=await win.webContents.executeJavaScript(`(()=>{
      Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
      __game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.step(360);
      const w=__game.world();
      w.zoneMap.tactical_showcase={id:'tactical_showcase',name:'Wayward Expedition',level:18,tileset:'highland',
        size:{w:1800,h:1400},seed:991,layout:[],exits:[],map:{x:9000,y:9000},objective:{kind:'safe'},
        theme:{floor:'#242c29',grid:'#303832',border:'#465040',obstacle:'#444c3c',obstacleEdge:'#70765a',accent:'#98ab72'}};
      w.loadZone('tactical_showcase');w.actors=[w.player];w.doodads=[];w.walk=null;w.markDoodadsChanged();
      w.player.invulnerable=true;w.player.pos={x:900,y:900};
      const members=w.spawnEncounterGroup('wayward_expedition',18,{x:900,y:630},{facing:Math.PI/2});
      for(const a of members){a.emergeUntil=undefined;a.aiTargetId=w.player.id;a.aggroed=true;}
      for(let i=0;i<360&&!members.some(a=>a.encounterOrder?.phase==='warning');i++)__game.step(1);
      return {fatal:__game.crash().fatal,phase:members.find(a=>a.encounterOrder)?.encounterOrder?.phase,
        plan:members.find(a=>a.encounterOrder)?.encounterOrder?.plan,text:w.texts.map(t=>t.text),
        image:document.getElementById('game').toDataURL('image/png')};
    })()`);
    const {image,...facts}=warning;log(facts);assert.equal(warning.fatal,null);assert.equal(warning.phase,'warning');
    fs.writeFileSync(path.join(dir,'encounter-combat-warning.png'),Buffer.from(image.split(',')[1],'base64'));
    const active=await win.webContents.executeJavaScript(`(()=>{
      const w=__game.world();
      for(let i=0;i<150&&!w.actors.some(a=>a.encounterOrder?.phase==='commit');i++)__game.step(1);
      return {fatal:__game.crash().fatal,phase:w.actors.find(a=>a.encounterOrder)?.encounterOrder?.phase,
        image:document.getElementById('game').toDataURL('image/png')};
    })()`);
    const {image:activeImage,...activeFacts}=active;log(activeFacts);assert.equal(active.fatal,null);assert.equal(active.phase,'commit');
    fs.writeFileSync(path.join(dir,'encounter-combat-active.png'),Buffer.from(activeImage.split(',')[1],'base64'));
    const broken=await win.webContents.executeJavaScript(`(()=>{
      const w=__game.world(),leader=w.actors.find(a=>a.encounterGroup?.leader);
      w.kill(leader,false,w.player);__game.step(1);
      return {fatal:__game.crash().fatal,committed:w.actors.filter(a=>a.encounterOrder?.phase==='commit').length};
    })()`);
    log(broken);assert.equal(broken.fatal,null);assert.equal(broken.committed,0);
    log('PASS: visible warning, live commitment and player-caused disruption in the real client');
  } finally {clearTimeout(timeout);win.destroy();server.server.close();app.quit();}
}).catch(e=>{log(e.stack??String(e));app.exit(1);});

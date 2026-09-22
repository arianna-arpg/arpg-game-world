// Hidden real-renderer check; build first. Uses disposable saves and profile.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logPath = path.join(dir, 'companion-recovery-ui.log'); fs.writeFileSync(logPath, 'START\n');
const log = value => fs.appendFileSync(logPath, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'companion-recovery-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'companion-recovery-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1500, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('tamer');__game.ui.hideAll();__game.step(120);void 0;");
    await win.webContents.executeJavaScript(`(()=>{
      const w=__game.world();w.player.invulnerable=true;
      w.zoneMap.qa_recovery={id:'qa_recovery',name:'Proving Ground',level:1,size:{w:1600,h:1200},seed:92126,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_recovery');w.player.pos={x:800,y:650};__game.step(120);
      window.recoveryPet=w.actors.find(a=>a.companion);if(!recoveryPet)throw Error('Missing Tamer companion');
      w.actors=[w.player,recoveryPet];w.projectiles=[];w.zones=[];
      recoveryPet.pos={x:800,y:540};recoveryPet.anchored=true;
      recoveryPet.applyStatus('poison',100,1,'probe');w.kill(recoveryPet);w.reviveCompanion(recoveryPet);
      w.flashes=[];w.texts=[];__game.step(1);
    })()`);
    for (const phase of ['protected', 'expired']) {
      const result = await win.webContents.executeJavaScript(`(()=>{
        if('${phase}'==='expired')__game.step(200);
        const a=recoveryPet;__game.step(1);
        return {phase:'${phase}',immune:a.invulnerable,status:a.statuses.some(s=>s.id==='companion_recovery'),
          downed:a.downed,fatal:__game.crash().fatal,image:document.getElementById('game').toDataURL('image/png')};
      })()`);
      const { image, ...facts } = result; log(facts);
      assert.equal(result.fatal, null); assert.equal(result.downed, false);
      assert.equal(result.immune, phase === 'protected'); assert.equal(result.status, phase === 'protected');
      fs.writeFileSync(path.join(dir, `companion-recovery-${phase}.png`), Buffer.from(image.split(',')[1], 'base64'));
    }
    log('PASS recovery glow/rim present during protection and absent after expiry');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });

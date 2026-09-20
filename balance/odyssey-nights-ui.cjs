// Build first. Hidden real renderer; isolated profile and disposable saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logFile = path.join(dir, 'odyssey-nights-ui.log'); fs.writeFileSync(logFile, 'START\n');
const log = value => fs.appendFileSync(logFile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'odyssey-nights-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'odyssey-nights-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    const warned = await win.webContents.executeJavaScript(`(() => {
      Object.defineProperty(navigator, 'getGamepads', {value: () => []});
      __game.account().ledger.prologue_lived = 1;
      __game.devStartRun('warrior'); __game.ui.hideAll();
      const w = __game.world(); w.player.invulnerable = true;
      __game.step(360);
      w.zoneMap.odyssey_night_showcase = {id:'odyssey_night_showcase',name:'The Restless Road',level:8,
        size:{w:1600,h:1200},seed:1234,layout:[],exits:[],map:{x:9000,y:9000},
        objective:{kind:'safe'},theme:{floor:'#252d25',grid:'#30382d',border:'#465040',
          obstacle:'#444c3c',obstacleEdge:'#70765a',accent:'#98ab72'}};
      w.loadZone('odyssey_night_showcase'); w.zone.objective={kind:'none'};
      w.actors=[w.player]; w.walk=null; w.player.pos={x:800,y:600}; w.time=150;
      w.doodads=[{kind:'tombstone',pos:{x:1080,y:600},radius:26},
        {kind:'bone_pile',pos:{x:1090,y:625},radius:18}]; w.markDoodadsChanged();
      w.odyssey.restore({version:1,roster:['goblin','bandit','undead','beastkin'],defeated:[],
        prepared:[],leads:[],kills:{},surveyDone:false,nextScoutAt:0,nextSiegeAt:0,
        defenses:0,raids:0,initialized:true});
      w.texts=[]; w.notices=[]; w.odyssey.update(); w.odyssey.state.risings.undead_nights.nextAt=w.time; w.odyssey.update();
      __game.step(36);
      return {fatal:__game.crash().fatal,pressure:w.odyssey.pressureText(),
        cues:w.flashes.filter(f=>f.fx==='earth_rising' && f.life>0).map(f=>({pos:f.pos,life:f.life,maxLife:f.maxLife})),
        texts:w.texts.map(t=>t.text),
        bodies:w.actors.filter(a=>a.tag==='odyssey_rising:undead_nights').length,
        image:document.getElementById('game').toDataURL('image/png')};
    })()`);
    assert.equal(warned.fatal, null); assert.equal(warned.bodies, 0); assert.equal(warned.pressure,null); assert.equal(warned.cues.length,2); assert.deepEqual(warned.texts,[]);
    const {image:warningImage,...warningFacts}=warned; log(warningFacts);
    fs.writeFileSync(path.join(dir,'odyssey-night-early.png'),Buffer.from(warningImage.split(',')[1],'base64'));
    for (const [stage, frames] of [['middle', 84], ['late', 96]]) {
      const shot = await win.webContents.executeJavaScript(`(() => {
        __game.step(${frames}); const w=__game.world();
        return {fatal:__game.crash().fatal, texts:w.texts.map(t=>t.text), pressure:w.odyssey.pressureText(),
          cues:w.flashes.filter(f=>f.fx==='earth_rising' && f.life>0).map(f=>({pos:f.pos,life:f.life,maxLife:f.maxLife})),
          bodies:w.actors.filter(a=>a.tag==='odyssey_rising:undead_nights').length,
          image:document.getElementById('game').toDataURL('image/png')};
      })()`);
      assert.equal(shot.fatal,null); assert.equal(shot.bodies,0); assert.equal(shot.cues.length,2);
      assert.deepEqual(shot.texts,[]); assert.equal(shot.pressure,null);
      const {image,...facts}=shot; log({stage,...facts});
      fs.writeFileSync(path.join(dir,`odyssey-night-${stage}.png`),Buffer.from(image.split(',')[1],'base64'));
    }
    const risen = await win.webContents.executeJavaScript(`(() => {
      __game.step(48); const w=__game.world();
      return {fatal:__game.crash().fatal,
        cues:w.flashes.filter(f=>f.fx==='earth_rising' && f.life>0).map(f=>({pos:f.pos,life:f.life,maxLife:f.maxLife})),
        texts:w.texts.map(t=>t.text),
        bodies:w.actors.filter(a=>a.tag==='odyssey_rising:undead_nights').map(a=>({name:a.name,faction:a.faction})),
        image:document.getElementById('game').toDataURL('image/png')};
    })()`);
    assert.equal(risen.fatal,null); assert.equal(risen.bodies.length,2);
    assert(risen.bodies.every(a=>a.faction==='undead'));
    const {image:risenImage,...risenFacts}=risen; log(risenFacts);
    fs.writeFileSync(path.join(dir,'odyssey-night-risen.png'),Buffer.from(risenImage.split(',')[1],'base64'));
    log('PASS: wordless early/middle/late emergence and two attributed Undead births');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });

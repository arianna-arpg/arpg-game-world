// Build first. Hidden real renderer, isolated profile and disposable saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logFile = path.join(dir, 'encounter-groups-ui.log'); fs.writeFileSync(logFile, 'START\n');
const log = value => fs.appendFileSync(logFile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'encounter-groups-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'encounter-groups-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1200, height: 850,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript(`(() => {
      Object.defineProperty(navigator, 'getGamepads', {value: () => []});
      __game.account().ledger.prologue_lived = 1;
      __game.devStartRun('warrior'); __game.ui.hideAll(); __game.step(360);
    })()`);
    for (const [recipe,tileset,level,count] of [
      ['wayward_expedition','highland',8,4], ['ashen_posts','hell_steppes',8,3],
      ['seedbed_wardens','jungle',16,5], ['graveside_watch','crypt',6,4],
    ]) {
      const result = await win.webContents.executeJavaScript(`(() => {
        const w = __game.world();
        w.zoneMap.encounter_showcase = {id:'encounter_showcase',name:'Encounter Groups',level:${level},tileset:${JSON.stringify(tileset)},
          size:{w:1800,h:1400},seed:1234,layout:[],exits:[],map:{x:9000,y:9000},objective:{kind:'safe'},
          theme:{floor:'#252c28',grid:'#303832',border:'#465040',obstacle:'#444c3c',obstacleEdge:'#70765a',accent:'#98ab72'}};
        w.loadZone('encounter_showcase');
        w.actors=[w.player]; w.doodads=[]; w.markDoodadsChanged(); w.walk=null;
        w.player.invulnerable=true; w.player.pos={x:900,y:780};
        const members=w.spawnEncounterGroup(${JSON.stringify(recipe)},${level},{x:900,y:600},{facing:Math.PI/2});
        members.forEach(a=>a.passive=true); __game.step(180);
        members.filter(a=>a.movementTether).forEach(a=>a.pos.y+=85); __game.step(1);
        return {fatal:__game.crash().fatal,members:members.map(a=>({name:a.name,slot:a.encounterGroup?.slot,bond:a.bondHeld})),
          image:document.getElementById('game').toDataURL('image/png')};
      })()`);
      const { image, ...facts } = result; log({recipe,...facts});
      assert.equal(result.fatal,null); assert.equal(result.members.length,count);
      assert.ok(result.members.every(a=>a.slot));
      fs.writeFileSync(path.join(dir,`encounter-${recipe}.png`),Buffer.from(image.split(',')[1],'base64'));
    }
    log('PASS: expedition, kennel, mature seedbed and graveside patrol render in the real client');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });

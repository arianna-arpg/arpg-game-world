// Build first. Hidden renderer with an isolated profile and disposable saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logFile = path.join(dir, 'movement-tethers-ui.log'); fs.writeFileSync(logFile, 'START\n');
const log = value => fs.appendFileSync(logFile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'movement-tethers-profile-' + process.pid));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'movement-tethers-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    const result = await win.webContents.executeJavaScript(`(() => {
      Object.defineProperty(navigator, 'getGamepads', {value: () => []});
      __game.account().ledger.prologue_lived = 1;
      __game.devStartRun('warrior'); __game.ui.hideAll();
      const w = __game.world(); w.player.invulnerable = true;
      __game.step(360);
      w.zoneMap.tether_showcase = {id:'tether_showcase',name:'Tether Showcase',level:6,
        size:{w:1600,h:1200},seed:1234,layout:[],exits:[],map:{x:9000,y:9000},
        objective:{kind:'safe'},theme:{floor:'#252d25',grid:'#30382d',border:'#465040',
          obstacle:'#444c3c',obstacleEdge:'#70765a',accent:'#98ab72'}};
      w.loadZone('tether_showcase');
      w.actors = [w.player]; w.doodads = []; w.markDoodadsChanged(); w.walk = null;
      w.player.pos = {x:w.arena.w/2, y:w.arena.h/2};
      const p = w.player.pos;
      const bodies = ['rootlash_snapper', 'gravebound_shade', 'stakebound_hound'].map((id,i) => {
        const a = w.createMonster(id, 6, 'enemy');
        a.pos = {x:p.x-220+i*220, y:p.y-100}; a.passive = true;
        w.actors.push(a); return a;
      });
      __game.step(180);
      bodies.forEach(a => { a.pos = {x:a.pos.x+90, y:a.pos.y+100}; });
      __game.step(1);
      return { fatal: __game.crash().fatal,
        cords: bodies.map(a => ({name:a.name, point:a.movementTether?.point, head:a.pos})),
        image: document.getElementById('game').toDataURL('image/png') };
    })()`);
    const { image, ...facts } = result; log(facts);
    assert.equal(result.fatal, null); assert.ok(result.cords.every(c => c.point));
    fs.writeFileSync(path.join(dir, 'movement-tethers.png'), Buffer.from(image.split(',')[1], 'base64'));
    log('PASS: three tether variants render in the real client');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });

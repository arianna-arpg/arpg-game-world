// Build first, then run: npx electron balance/arena-bosses-ui.cjs
// Hidden renderer with isolated profile and saves; never touches a real run.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logFile = path.join(dir, 'arena-bosses-ui.log'); fs.writeFileSync(logFile, 'START\n');
const log = value => fs.appendFileSync(logFile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'arena-bosses-ui-profile-' + process.pid));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'arena-bosses-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]}); void 0;");
    await wait(700);
    for (const [id, bossId, frames] of [
      ['ossuary', 'organ', 140], ['kiln', 'crucible', 60], ['sump', 'mireheart', 70],
    ]) {
      const result = await win.webContents.executeJavaScript(`(() => {
        __game.account().ledger.prologue_lived = 1;
        __game.devStartRun('warrior'); __game.ui.hideAll();
        const w = __game.world();
        w.player.invulnerable = true;
        __game.step(360); // let fresh-run quest announcements expire
        w.enterSidezone({pos:{x:400,y:400},seed:1234,kind:'arena_boss_${id}_gate'});
        const b = w.actors.find(a => a.defId === 'arena_boss_${bossId}');
        w.player.pos = {x:b.pos.x,y:b.pos.y+260};
        __game.step(${frames});
        return {id:'${id}',boss:b.name,position:b.pos,stationary:b.stationary,
          phase:b.aiScriptIdx,patterns:w.zones.filter(z=>z.attackPattern).length,
          fatal:__game.crash().fatal,
          image:document.getElementById('game').toDataURL('image/png')};
      })()`);
      const { image, ...facts } = result;
      log(facts); assert.ok(result.stationary); assert.ok(result.phase >= 0); assert.equal(result.fatal, null);
      // Read the rendered canvas itself. Offscreen capturePage can return
      // the previous compositor frame after a synchronous QA frame batch.
      fs.writeFileSync(path.join(dir, `arena-boss-${id}.png`), Buffer.from(image.split(',')[1], 'base64'));
    }
    log('PASS: three arena bosses render in the real client');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });

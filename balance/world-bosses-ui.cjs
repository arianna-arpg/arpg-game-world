// npm run build && npx electron balance/world-bosses-ui.cjs
// Isolated saves/profile; render the actual actors and warning fields.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logFile = path.join(dir, 'world-bosses-ui.log'); fs.writeFileSync(logFile, 'START\n');
const log = value => fs.appendFileSync(logFile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'world-bosses-ui-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'),
    savesDir: path.join(dir, 'world-bosses-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]}); void 0;");
    for (const id of ['primeval_cragmaw', 'primeval_wyrm_head']) {
      const result = await win.webContents.executeJavaScript(`(() => {
        __game.account().ledger.prologue_lived = 1;
        __game.devStartRun('warrior'); __game.ui.hideAll();
        const w = __game.world(); w.player.invulnerable = true;
        __game.step(360);
        // A real generated open-air zone, with the encounter isolated from
        // unrelated enemies so the image reads the boss's actual footprint.
        const zone = w.devOverlayView().nodes.find(z => z.objective.kind !== 'safe' && !z.special && z.id !== w.zone.id && z.size.w >= 1200);
        if (zone) w.loadZone(zone.id);
        w.actors = [w.player]; w.zones.length = 0;
        const b = w.createMonster('${id}', 1, 'enemy');
        b.pos = w.clearTransitSpot({x:w.arena.w/2,y:w.arena.h/2}, 230);
        b.aiAnchor = {...b.pos}; b.facing = Math.PI / 2;
        w.actors.push(b);
        w.player.pos = {x:b.pos.x,y:b.pos.y+230};
        // Let proximity trigger the real emergence hold before capturing
        // the first attack. Never clear only the armed bit of an ambusher.
        for (let i = 0; i < 18 && b.aiScriptIdx < 0; i++) __game.step(10);
        __game.step(30);
        return {id:'${id}',boss:b.name,radius:b.radius,playerRadius:w.player.radius,
          phase:b.aiScriptIdx,parts:b.partActors?.length,untargetable:b.untargetable,patterns:w.zones.filter(z=>z.attackPattern).length,
          fatal:__game.crash().fatal,
          image:document.getElementById('game').toDataURL('image/png')};
      })()`);
      const { image, ...facts } = result; log(facts);
      assert.ok(result.phase >= 0); assert.ok(result.patterns > 0);
      assert.ok(result.parts >= 2); assert.equal(result.fatal, null);
      assert.ok(!result.untargetable);
      fs.writeFileSync(path.join(dir, `world-boss-${id}.png`), Buffer.from(image.split(',')[1], 'base64'));
    }
    log('PASS: colossi render with live anatomy and warnings');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });

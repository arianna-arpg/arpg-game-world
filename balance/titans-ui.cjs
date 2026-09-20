const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logFile = path.join(dir, 'titans-ui.log'); fs.writeFileSync(logFile, 'START\n');
const log = x => fs.appendFileSync(logFile, JSON.stringify(x) + '\n');
app.setPath('userData', path.join(dir, 'titans-ui-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 180000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'titans-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]}); void 0;");
    for (const mode of process.argv.length > 2 ? process.argv.slice(2) : ['body', 'vhorun', 'cindergait', 'istral', 'rimeheart', 'stormcrown', 'map']) {
      const result = await win.webContents.executeJavaScript(`(() => {
        __game.account().ledger.prologue_lived = 1;
        __game.devStartRun('warrior'); __game.ui.hideAll();
        const w = __game.world(); w.player.invulnerable = true; __game.step(360);
        const v = w.devOverlayView(), f = w.titans.field();
        let boss;
        if ('${mode}' === 'rimeheart' || '${mode}' === 'stormcrown') {
          const z = v.nodes.find(z => z.objective.kind !== 'safe' && !z.special && z.size.w >= 1400);
          w.loadZone(z.id); w.actors = [w.player];
          const b = boss = w.createMonster('sovereign_${mode}', 1, 'enemy');
          b.pos = w.clearTransitSpot({x:w.arena.w/2,y:w.arena.h/2},230); b.facing = Math.PI / 2;
          w.actors.push(b); w.player.pos = {x:b.pos.x,y:b.pos.y+270}; __game.step(60);
        } else {
          let j;
          for (const z of v.nodes) {
            if (f.devIgnite(v,z.id,['body','map'].includes('${mode}') ? 'vhorun' : '${mode}')) { j=f.journeys.at(-1); break; }
          }
          if (!j) throw Error('no Titan route');
          j.head = '${mode}' === 'body' ? 2.6 : j.path.length - .4;
          j.tail = '${mode}' === 'body' ? .7 : j.head - .35;
          w.loadZone(j.path[1]); w.actors = [w.player];
          w.player.pos = w.clampPos({x:w.arena.w/2+250,y:w.arena.h/2+180}, w.player.radius);
          __game.step(200);
          const pieces = w.titans.scene() || [];
          const middle = pieces.filter(p=>p.kind !== 'titan_warning').sort((a,b)=>Math.hypot(a.x-w.arena.w/2,a.y-w.arena.h/2)-Math.hypot(b.x-w.arena.w/2,b.y-w.arena.h/2))[0];
          if (middle) w.player.pos = w.clampPos({x:middle.x+190,y:middle.y+160},w.player.radius);
          __game.step(2);
          if ('${mode}' === 'map') {
            for (const id of j.path.slice(0,3)) {
              w.visited.add(id); w.zoneMap[id].veiled = false; f.discover(j.id,id);
            }
            __game.ui.toggleMap();
          }
        }
        return {mode:'${mode}', fatal:__game.crash().fatal,
          pieces:w.titans.scene()?.length ?? 0, kinds:[...new Set(w.doodads.filter(d=>w.titans.owns(d)).map(d=>d.kind))],
          patterns:w.zones.filter(z=>z.attackPattern).length, phase:boss?.aiScriptIdx,
          mapOpen:__game.ui.mapOpen,
          image:document.getElementById('game').toDataURL('image/png')};
      })()`);
      const { image, ...facts } = result; log(facts); assert.equal(result.fatal, null);
      if (mode === 'body') assert.ok(result.kinds.includes('titan_sunder_body'));
      else if (mode === 'rimeheart' || mode === 'stormcrown') assert.ok(result.patterns > 0);
      else assert.ok(result.pieces > 0);
      fs.writeFileSync(path.join(dir, `titan-${mode}.png`), Buffer.from(image.split(',')[1], 'base64'));
      if (mode === 'map') {
        assert.ok(result.mapOpen);
        await win.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
        fs.writeFileSync(path.join(dir, 'titan-map.png'), (await win.webContents.capturePage()).toPNG());
      }
    }
    log('PASS: Titan terrain and new sovereigns render');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });

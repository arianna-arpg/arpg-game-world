// Build first. Hidden client with isolated saves; never touches a personal run.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'satellites-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = value => fs.appendFileSync(logfile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'satellites-ui-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'satellites-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]}); __game.account().ledger.prologue_lived=1; __game.devStartRun('warrior'); __game.ui.hideAll(); __game.step(360); void 0;");
    for (const scene of [
      { phase: 'warning', family: 'iron_wake', steps: 20 },
      { phase: 'active', family: 'iron_wake', steps: 90 },
      { phase: 'fire-flight', family: 'cinder_wake', steps: 90 },
      { phase: 'fire-impact', family: 'cinder_wake', steps: 116 },
    ]) {
      const { phase, family, steps } = scene;
      const result = await win.webContents.executeJavaScript(`(() => {
        const w = __game.world(); w.player.invulnerable = true;
        w.zoneMap.qa_satellites = {
          id:'qa_satellites', name:'Wake Proving Ground', level:12, size:{w:1600,h:1200},
          theme:{floor:'#22252a',grid:'#282c32',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
          seed:23456,layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}
        };
        w.loadZone('qa_satellites'); w.player.pos={x:800,y:600}; __game.step(300);
        w.actors=[w.player]; w.satellites.clear();
        const pack = [-170, 0, 170].map(dx => {
          const a = w.createMonster('skeleton_warrior',12,'enemy');
          a.pos={x:800+dx,y:420}; a.anchored=true; a.skills=[];
          a.sheet.setSource('qa-still',[{stat:'moveSpeed',kind:'more',value:-1}]);
          a.spawnedAt=-1; w.actors.push(a); return a;
        });
        if (!w.promoteMagicPack(pack,'${family}')) throw new Error('Satellite promotion failed');
        w.player.sheet.setSource('qa-satellites',[{stat:'satelliteCount_${family}',kind:'flat',value:3}]);
        for(let i=0;i<${steps};i++) w.refreshSatellites(1/60);
        const r=__game.renderer, canvas=document.getElementById('game');
        const p=r.toScreen(pack[1].pos), rect=canvas.getBoundingClientRect();
        canvas.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:rect.left+p.x*rect.width/canvas.width,clientY:rect.top+p.y*rect.height/canvas.height}));
        const labels=[], original=CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText=function(text,...rest){labels.push(String(text));return original.call(this,text,...rest);};
        try { __game.step(1); } finally { CanvasRenderingContext2D.prototype.fillText=original; }
        return {phase:'${phase}', names:pack.map(a=>a.name), rows:w.satellites.visuals,
          labels, flights:w.satellites.flights.visuals, fatal:__game.crash().fatal, image:canvas.toDataURL('image/png')};
      })()`);
      const { image, ...facts } = result; log(facts);
      assert.equal(result.fatal, null); assert.equal(result.rows.length, 6);
      assert.ok(result.rows.every(v => v.armed === (phase !== 'warning')));
      assert.ok(result.rows.every(v => !v.blocked));
      assert.ok(result.labels.some(t => t.includes(family === 'iron_wake' ? 'Iron Wake' : 'Cinder Wake')), 'the pack name remains visible');
      assert.ok(!result.labels.some(t => /contact|orbiting|lob mortars|satellite/i.test(t)), 'combat contains no explanatory pack subtitle');
      if (phase === 'fire-flight') assert.ok(result.flights.some(v => v.phase === 'flight' && v.progress > 0));
      if (phase === 'fire-impact') assert.ok(result.flights.some(v => v.phase === 'impact'));
      fs.writeFileSync(path.join(dir, `satellites-${phase}.png`), Buffer.from(image.split(',')[1], 'base64'));
    }
    log('PASS satellites: warning, live iron, fire arcs, marked impacts and names without combat prose');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });

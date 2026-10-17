// Build first. Real rendering and input, hidden window, isolated profile/saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logFile = path.join(dir, 'worldmass-ui.log'); fs.writeFileSync(logFile, 'START\n');
const log = value => fs.appendFileSync(logFile, JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'worldmass-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'worldmass-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1280, height: 850,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url + '?worldmass');
    const boot = await win.webContents.executeJavaScript(`(() => {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      __game.devStartRun('warrior'); __game.ui.hideAll();
      const w = __game.world();
      w.startWorldMass(84623); w.player.invulnerable = true;
      __game.step(12);
      return {fatal:__game.crash().fatal,worldmass:!!w.massRuntime,walk:w.walk.constructor.name,seed:w.massRuntime.generator.run.seed};
    })()`);
    log(boot); assert.equal(boot.fatal, null); assert.equal(boot.worldmass, true);
    for (const [name,x,y] of [['clearing',12,12],['crossing',800,-500],['page-corner',750,750],['country',3200,1800],['return',12,12]]) {
      const result = await win.webContents.executeJavaScript(`(() => {
        const w=__game.world(), mass=w.massRuntime, hero=w.player, skills=[...hero.skills];
        let loads=0; const load=w.loadZone; w.loadZone=function(...a){loads++; return load.apply(this,a)};
        const tick=performance.now();
        hero.pos=mass.walk.snapToWalkable({x:${x},y:${y}}); __game.step(8);
        const elapsed=performance.now()-tick; w.loadZone=load;
        const renderer=__game.renderer, draws=[], draw=renderer.ctx.drawImage;
        renderer.ctx.drawImage=function(img,dx,dy,dw,dh){draws.push({dx,dy,dw,dh}); return draw.apply(this,arguments)};
        __game.step(1); renderer.ctx.drawImage=draw;
        const cam=renderer.cam, width=renderer.canvas.width/renderer.zoom, height=renderer.canvas.height/renderer.zoom;
        const coverage=[[cam.x+1,cam.y+1],[cam.x+width-1,cam.y+1],[cam.x+1,cam.y+height-1],[cam.x+width-1,cam.y+height-1]]
          .every(([px,py])=>draws.some(d=>d.dw===mass.config.terrain.addressSpan&&d.dh===d.dw&&px>=d.dx&&px<d.dx+d.dw&&py>=d.dy&&py<d.dy+d.dh));
        return {fatal:__game.crash().fatal,loads,elapsed,unchangedHero:w.player===hero,
          unchangedSkills:skills.every((s,i)=>s===hero.skills[i]),pos:hero.pos,coverage,
          region:w.walk.regionAt(hero.pos.x,hero.pos.y),population:mass.population,stats:mass.stream.stats,
          image:document.getElementById('game').toDataURL('image/png')};
      })()`);
      const {image,...facts}=result; log({name,...facts});
      assert.equal(result.fatal,null); assert.equal(result.loads,0); assert.ok(result.unchangedHero&&result.unchangedSkills);
      assert.ok(result.coverage,'terrain must cover all four viewport corners at every page offset');
      assert.ok(result.stats.resident+result.stats.pending<=25); assert.ok(result.stats.samples<=32768);
      fs.writeFileSync(path.join(dir,`worldmass-${name}.png`),Buffer.from(image.split(',')[1],'base64'));
    }
    const map = await win.webContents.executeJavaScript(`(() => {__game.ui.toggleMap(); return {text:document.getElementById('world-map').textContent,svg:!!document.querySelector('#world-map svg')}})()`);
    assert.ok(map.svg && map.text.includes('Unbroken Wilds')); log(map);
    const checkpoint = await win.webContents.executeJavaScript(`(async () => {
      const w=__game.world(),m=w.massRuntime;
      const victim=w.actors.find(a=>a.team==='enemy'&&!a.dead); if(victim) w.kill(victim,true);
      m.state.paint({address:m.walk.at(-48,-48),region:'wall',color:'#667788',cause:'ui-check'});
      __game.save(); await new Promise(r=>setTimeout(r,500));
      return {seed:m.generator.run.seed,fallen:m.state.snapshot().claims.filter(r=>r[0]==='fallen').length,pos:{...w.player.pos}};
    })()`);
    await win.loadURL(server.url + '?worldmass');
    const reload = await win.webContents.executeJavaScript(`(async () => {
      for(let i=0;i<60&&!document.querySelector('#sm-continue:not([disabled])');i++) await new Promise(r=>setTimeout(r,100));
      document.querySelector('#sm-continue:not([disabled])')?.click();
      for(let i=0;i<60&&!__game.world().massRuntime;i++) await new Promise(r=>setTimeout(r,100));
      const w=__game.world(),m=w.massRuntime;
      return {fatal:__game.crash().fatal,seed:m?.generator.run.seed,region:w.walk?.regionAt(-45,-45),
        fallen:m?.state.snapshot().claims.filter(r=>r[0]==='fallen').length,pos:{...w.player.pos}};
    })()`);
    log({checkpoint,reload}); assert.equal(reload.fatal,null); assert.equal(reload.seed,checkpoint.seed);
    assert.equal(reload.region,'wall'); assert.equal(reload.fallen,checkpoint.fallen); assert.deepEqual(reload.pos,checkpoint.pos);
    log('PASS: native worldmass mode, negative coordinates, crossings, bounded terrain and truthful map render in the real client');
  } catch (error) {
    log(error.stack ?? String(error)); process.exitCode = 1;
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.exit(process.exitCode || 0); }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });

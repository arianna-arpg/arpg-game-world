// Build dist-preview with the isolated worldmass profile first.
// Optional URL exercises the published preview without touching user saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const reports = path.join(__dirname, 'reports'); fs.mkdirSync(reports, { recursive: true });
const logFile = path.join(reports, 'worldmass-sites-ui.log');
const log = v => fs.appendFileSync(logFile, JSON.stringify(v) + '\n'); fs.writeFileSync(logFile, 'START\n');
app.setPath('userData', path.join(reports, 'sites-profile-' + process.pid));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 90000);
  const root = path.resolve(__dirname, '../dist-preview');
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = process.argv[2] || 'http://127.0.0.1:' + server.address().port + '/';
  const win = new BrowserWindow({ show: false, width: 1280, height: 850,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = (fn, ...args) => win.webContents.executeJavaScript('(' + fn + ')(' + args.map(a=>JSON.stringify(a)).join(',') + ')');
  try {
    await win.loadURL(url);
    const boot = await run(() => {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      __game.devStartRun('warrior'); __game.ui.hideAll();
      const w=__game.world(); w.startWorldMass(42); w.player.invulnerable=true; __game.step(2);
      const m=w.massRuntime, places=new Map(), started=performance.now();
      for(let y=-4;y<=4;y++) for(let x=-4;x<=4;x++)
        for(const p of m.generator.placesInCell({dimension:'surface',cx:String(x),cy:String(y)})) {
          const row=m.config.content.find(c=>c.id===p.content);
          if(!row?.site) continue;
          const q={x:Number(p.center.cx)*m.config.terrain.addressSpan+p.center.x,y:Number(p.center.cy)*m.config.terrain.addressSpan+p.center.y};
          if(m.settlement ? m.settlement.reserves(q.x,q.y,p.radius) : Math.hypot(q.x,q.y)<m.config.startRadius+p.radius) continue;
          places.set(p.id,{id:p.id,content:p.content,center:q,name:row.site.name});
        }
      window.__siteChecks=['wayside-camp','pillaged-ruin'].map(kind=>[...places.values()]
        .filter(p=>p.content===kind).sort((a,b)=>Math.hypot(a.center.x,a.center.y)-Math.hypot(b.center.x,b.center.y))[0]);
      return {fatal:__game.crash().fatal,version:m.generator.run.version,places:window.__siteChecks,
        planningMs:performance.now()-started,population:m.population};
    });
    log({boot}); assert.equal(boot.fatal,null); assert.equal(boot.version,4); assert.ok(boot.places.every(Boolean));
    for (const content of ['wayside-camp','pillaged-ruin']) {
      const result = await run(content => {
        const w=__game.world(), m=w.massRuntime, site=__siteChecks.find(p=>p.content===content);
        const began=performance.now(); w.player.pos={...site.center}; m.update(w,true);
        const cache=w.chests.find(c=>c.rewardSource===JSON.stringify([site.id,'cache']));
        w.player.pos=m.walk.snapToWalkable(cache?{x:cache.pos.x,y:cache.pos.y+85}:site.center);
        w.actors.forEach(a=>{if(a!==w.player)a.passive=true});
        __game.ui.hideAll(); __game.step(3);
        const props=w.doodads.filter(d=>Math.hypot(d.pos.x-site.center.x,d.pos.y-site.center.y)<350);
        return {fatal:__game.crash().fatal,name:site.name,props:props.length,cache:!!cache,
          known:m.sites.discovered.some(p=>p.id===site.id),elapsed:performance.now()-began,
          image:document.getElementById('game').toDataURL('image/png')};
      }, content);
      const { image, ...facts } = result; log(facts); assert.equal(facts.fatal,null);
      assert.ok(facts.props>0 && facts.cache && facts.known,'default site must be visible, discoverable and playable');
      fs.writeFileSync(path.join(reports,'worldmass-site-'+content+'.png'),Buffer.from(image.split(',')[1],'base64'));
    }
    const map = await run(async () => {
      __game.ui.toggleMap(); __game.step(1);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const e=document.getElementById('world-map');
      return {text:e.textContent,svg:!!e.querySelector('svg'),visible:e.getBoundingClientRect().height>0 && getComputedStyle(e).visibility!=='hidden'};
    });
    log({map}); assert.ok(map.svg && map.visible && map.text.includes('Pillaged Ruin'));
    fs.writeFileSync(path.join(reports,'worldmass-sites-map.png'),(await win.webContents.capturePage()).toPNG());
    const checkpoint = await run(async () => {
      __game.ui.hideAll(); const w=__game.world(),m=w.massRuntime,site=__siteChecks[1];
      const c=w.chests.find(c=>c.rewardSource===JSON.stringify([site.id,'cache']));
      w.player.pos={...c.pos}; c.lockTime=0; __game.step(2); __game.save();
      await new Promise(r=>setTimeout(r,150));
      return {seed:m.generator.run.seed,known:m.sites.discovered.map(p=>p.id).sort(),source:c.rewardSource,opened:c.opened};
    });
    assert.ok(checkpoint.opened);
    await win.loadURL(url);
    const restored = await run(async source => {
      for(let i=0;i<60&&!document.querySelector('#sm-continue:not([disabled])');i++) await new Promise(r=>setTimeout(r,100));
      document.querySelector('#sm-continue:not([disabled])')?.click();
      for(let i=0;i<60&&!__game.world().massRuntime;i++) await new Promise(r=>setTimeout(r,100));
      const w=__game.world(),m=w.massRuntime; w.player.invulnerable=true;
      return {fatal:__game.crash().fatal,seed:m?.generator.run.seed,known:m?.sites.discovered.map(p=>p.id).sort(),
        caches:w.chests.filter(c=>c.rewardSource===source).map(c=>c.opened)};
    },checkpoint.source);
    log({checkpoint,restored}); assert.equal(restored.fatal,null); assert.equal(restored.seed,checkpoint.seed);
    assert.deepEqual(restored.known,checkpoint.known); assert.deepEqual(restored.caches,[true]);
    log('PASS native default camps/ruins, map discovery, cache interaction and browser Continue');
  } catch(error) { log(error.stack??String(error)); process.exitCode=1; }
  finally { clearTimeout(timeout); win.destroy(); server.close(); app.exit(process.exitCode||0); }
}).catch(error=>{log(error.stack??String(error));app.exit(1)});

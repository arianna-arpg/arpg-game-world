// Natural localized terrain acceptance in the actual frozen browser client.
// Controlled arrivals are labelled. All crossings and bypasses use native input.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const dir = path.join(__dirname, 'reports');
const tag = process.env.PATCH_TAG || new Date().toISOString().replace(/[:.]/g, '-');
const prefix = 'native-terrain-patches-' + tag;
const root = path.resolve(__dirname, '..', process.env.PATCH_DIST || 'dist-preview');
const seeds = (process.env.PATCH_SEEDS || '991,713,42').split(',').map(Number);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, prefix + '-profile-' + process.pid));
app.disableHardwareAcceleration();
const report = { run: prefix, seeds, methodology: 'Unchanged natural terrain8 patch selection, full native runtime/ecology/features. Controlled initial arrival at each selected natural patch, followed only by native devInput walking across both complete bypasses and into/out of wet cells. The actual hero radius determines capsule clearance. Native grantXp may match local difficulty; no terrain/scenery/source/status replacement, actor removal, invulnerability, noclip or combat suppression. RAF is disabled before boot for manual deterministic frame delivery. Each wet save is flushed, then Continue runs in a fresh renderer. Transient hero statuses reset on Continue and reapply through ordinary terrain ticks. This is a selected natural course, not global navigability or performance proof.',
  harnessSha256: sha(fs.readFileSync(__filename)), consoleErrors: [], screenshots: [], courses: [], searches: [], performance: [] };
fs.copyFileSync(__filename, path.join(dir, prefix + '.cjs'));
const save = () => fs.writeFileSync(path.join(dir, prefix + '.json'), JSON.stringify(report, null, 2));
app.whenReady().then(async () => {
  let win;
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
    const ext = path.extname(file);
    res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' })[ext] || 'text/html');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  report.url = url;
  const timer = setTimeout(() => { report.error = 'Browser course exceeded 15 minute wall-clock budget'; save(); app.exit(1); }, 900000);
  const run = async (fn, ...args) => {
    const result = await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await (' + fn + ')(' + args.map(x => JSON.stringify(x)).join(',') + ')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
    if (!result.ok) throw Error(result.error); return result.value;
  };
  const timed = async (label, fn) => { const t = Date.now(); try { return await fn(); } finally { report.performance.push({ label, ms: Date.now() - t }); save(); } };
  const boot = async () => {
    const previous = win;
    win = new BrowserWindow({ show: false, width: 1280, height: 850, webPreferences: { offscreen: true, backgroundThrottling: false } });
    win.webContents.on('console-message', e => { if (e.level === 'error') report.consoleErrors.push(e.message); else if (e.message.startsWith('PATCH_')) console.log(e.message); });
    await win.loadURL('about:blank'); if (previous && !previous.isDestroyed()) previous.destroy();
    win.webContents.debugger.attach('1.3'); await win.webContents.debugger.sendCommand('Page.enable');
    await win.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument', { source: "window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});" });
    await win.loadURL(url);
    await run(async () => { for (let i = 0; i < 200 && !window.__game; i++) await new Promise(r => setTimeout(r, 50)); if (!window.__game) throw Error('Game unavailable'); await __game.hydrated(); });
  };
  const shot = async label => {
    await run(() => __game.renderer.render(__game.world())); win.webContents.invalidate();
    await new Promise(r => setTimeout(r, 100));
    const file = path.join(dir, prefix + '-' + label + '.png'); fs.writeFileSync(file, (await win.webContents.capturePage()).toPNG());
    report.screenshots.push(file); save(); return file;
  };
  const install = course => {
    const w = __game.world(), m = w.massRuntime;
    window.__patchWorld = w; window.__patchMass = m; window.__patchWalk = m.walk; window.__patchStream = m.stream;
    window.__patchCourse = course; window.__patchFrames = [];
    window.__patchRead = () => {
      const a = w.player, at = m.walk.at(a.pos.x, a.pos.y), terrain = m.stream.sample(at);
      return { charId: w.meta.charId, time: w.time, xp: w.meta.xp, pos: { ...a.pos }, level: a.level,
        radius: a.radius, life: a.life, dead: a.dead, invulnerable: a.invulnerable, noclip: !!w.devNoclip,
        speed: a.sheet.get('moveSpeed'), statuses: a.statuses.map(s => ({ id: s.id, remaining: s.remaining, stacks: s.stacks })),
        gridRegion: a.gridRegion, region: m.walk.regionAt(a.pos.x, a.pos.y), terrain,
        ground: w.groundAt(a.pos, a.tier), sameWorld: __game.world() === window.__patchWorld,
        sameRuntime: w.massRuntime === window.__patchMass, sameWalk: w.walk === window.__patchWalk,
        sameStream: m.walk.stream === window.__patchStream, warm: m.nativeWarm?.stats ?? null,
        actorCount: w.actors.length, doodadCount: w.doodads.length, nativeFeatures: m.nativeFeatures.stats,
        terrainChangeCount: m.state.snapshot().terrain.length, fatal: __game.crash().fatal };
    };
    window.__patchReceipt = () => {
      const p = window.__patchCourse, plan = m.generator.patches.at(m.walk.at(p.probe.x, p.probe.y));
      if (!plan || plan.id !== p.plan.id) throw Error('Original natural patch no longer resolves');
      const span = m.config.terrain.addressSpan, cell = m.config.terrain.terrainCell;
      const ox = Number(BigInt(plan.origin.cx) - BigInt(m.origin.cx)) * span + plan.origin.x;
      const oy = Number(BigInt(plan.origin.cy) - BigInt(m.origin.cy)) * span + plan.origin.y;
      const box = p.outer, samples = [];
      for (let y = box.minY; y < box.maxY; y += cell) for (let x = box.minX; x < box.maxX; x += cell) {
        const q = { x: ox + x + cell / 2, y: oy + y + cell / 2 }, at = m.walk.at(q.x, q.y);
        const generated = m.generator.terrainAt(at), physical = m.stream.sample(at), region = m.walk.regionAt(q.x, q.y);
        samples.push({ x:q.x,y:q.y,generated,physical,region });
      }
      return { plan, config: m.config.terrain, configHash: m.configHash, run: m.generator.run, samples,
        state: window.__patchRead() };
    };
    window.__patchStep = async frames => {
      for (let n = 0; n < frames; n++) {
        const before = { ...w.player.pos }, t = performance.now(); __game.step(1, 1000 / 30);
        const r = window.__patchRead();
        window.__patchFrames.push({ time:r.time,ms:performance.now()-t,pos:r.pos,region:r.region,speed:r.speed,
          statuses:r.statuses.map(s=>s.id),life:r.life,displacement:Math.hypot(r.pos.x-before.x,r.pos.y-before.y) });
        if (r.dead || r.fatal || r.invulnerable || r.noclip || !r.sameWorld || !r.sameRuntime || !r.sameWalk || !r.sameStream) throw Error('Natural course invariant failed '+JSON.stringify(r));
        if (n % 10 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      }
      return window.__patchRead();
    };
    window.__patchWalkTo = async (target, neutral = false) => {
      const before = window.__patchRead(), start = window.__patchFrames.length;
      __game.devInput(() => {
        const dx=target.x-w.player.pos.x,dy=target.y-w.player.pos.y,d=Math.hypot(dx,dy);
        return { dx:d>4?dx/d:0,dy:d>4?dy/d:0,aim:target,held:[],edge:[] };
      });
      try {
        for (let n=0;n<900;n++) {
          if (Math.hypot(w.player.pos.x-target.x,w.player.pos.y-target.y)<=4) return {before,after:window.__patchRead(),frames:window.__patchFrames.slice(start)};
          await window.__patchStep(1);
          if (neutral && window.__patchRead().region!=='ground') throw Error('Bypass crossed non-neutral terrain');
        }
        throw Error('Natural walk blocked '+JSON.stringify({target,state:window.__patchRead()}));
      } finally { __game.devInput(null); }
    };
  };
  try {
    await timed('initial browser boot', boot);
    report.bundle = await run(() => [...document.scripts].map(s=>s.src).find(s=>/\/assets\/index-/.test(s)));
    assert.ok(report.bundle); if (process.env.PATCH_EXPECT_BUNDLE) assert.ok(report.bundle.endsWith('/'+process.env.PATCH_EXPECT_BUNDLE));
    report.bundleSha256 = sha(fs.readFileSync(path.join(root,new URL(report.bundle).pathname)));
    for (const seed of seeds) {
      if (['mud','swamp'].every(region=>report.courses.some(c=>c.region===region&&c.acceptance))) break;
      await timed('start seed '+seed, () => run(seed => {
        __game.devStartRun('warrior'); __game.ui.hideAll(); const w=__game.world(); w.startWorldMass(seed); __game.step(1);
        for(const b of document.querySelectorAll('button')) if(b.textContent.trim()==='Walk on')b.click(); __game.ui.hideAll();
        if(w.massRuntime.config.terrain.version!==8||!w.massRuntime.generator.patches)throw Error('Expected unchanged fresh terrain8 policy');
      },seed));
      const discovered = await timed('natural patch discovery '+seed, () => run(async () => {
        const w=__game.world(),m=w.massRuntime,found=[],seen=new Set(),spacing=m.config.terrain.patches.spacing;
        let queries=0;
        for(let ring=1;ring<=25;ring++) {
          for(let gy=-ring;gy<=ring;gy++)for(let gx=-ring;gx<=ring;gx++) {
            if(Math.max(Math.abs(gx),Math.abs(gy))!==ring)continue;
            const q={x:gx*spacing+spacing/2,y:gy*spacing+spacing/2},p=m.generator.patches.at(m.walk.at(q.x,q.y));queries++;
            if(!p||seen.has(p.id)||!['mud','swamp'].includes(p.choice.region))continue;
            seen.add(p.id); found.push({probe:q,plan:p});
          }
          if(['mud','swamp'].every(r=>found.filter(p=>p.plan.choice.region===r).length>=4))break;
          await new Promise(r=>setTimeout(r,0));
        }
        return {queries,found:found.sort((a,b)=>Math.hypot(a.probe.x,a.probe.y)-Math.hypot(b.probe.x,b.probe.y))};
      }));
      report.searches.push({seed,...discovered});save();
      for(const region of ['mud','swamp']) {
        if(report.courses.some(c=>c.region===region&&c.acceptance))continue;
        const candidates=discovered.found.filter(p=>p.plan.choice.region===region).slice(0,8),tried=[];
        let selected;
        for(const candidate of candidates) {
          const arrival=await timed('controlled arrival '+seed+' '+region,()=>run(async c=>{
            const w=__game.world(),m=w.massRuntime,p=c.plan,f=p.footprint,b=p.bypasses,span=m.config.terrain.addressSpan;
            const offset={x:Number(BigInt(p.origin.cx)-BigInt(m.origin.cx))*span+p.origin.x,y:Number(BigInt(p.origin.cy)-BigInt(m.origin.cy))*span+p.origin.y};
            const outer={minX:Math.min(...b.map(q=>q.minX)),minY:Math.min(...b.map(q=>q.minY)),maxX:Math.max(...b.map(q=>q.maxX)),maxY:Math.max(...b.map(q=>q.maxY))};
            const left=(outer.minX+f.minX)/2,right=(outer.maxX+f.maxX)/2,top=(outer.minY+f.minY)/2,bottom=(outer.maxY+f.maxY)/2;
            const point=(x,y)=>({x:offset.x+x,y:offset.y+y});
            const start=point(left,(f.minY+f.maxY)/2);w.landPartyAt(start);m.update(w,true);
            const sourceLevel=w.levelAt(start),beforeLevel=w.player.level,beforeXp=w.meta.xp;
            while(w.player.level<sourceLevel)w.grantXp(1000);
            for(let i=0;i<30;i++){__game.step(1,1000/30);if(w.player.dead)throw Error('Vulnerable controlled arrival died');if(i%10===0)await new Promise(r=>setTimeout(r,0));}
            const radius=w.player.radius,cell=m.walk.cellSize;
            const capsule=(a,b,neutral)=>{
              const x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y);let cells=0;
              for(let y=Math.floor((y0-radius)/cell);y<=Math.floor((y1+radius)/cell);y++)for(let x=Math.floor((x0-radius)/cell);x<=Math.floor((x1+radius)/cell);x++){
                const dx=Math.max(x*cell-x1,x0-(x+1)*cell,0),dy=Math.max(y*cell-y1,y0-(y+1)*cell,0);
                if(dx*dx+dy*dy>radius*radius)continue;cells++;
                const px=(x+.5)*cell,py=(y+.5)*cell;if(!m.walk.isWalkable(px,py)||neutral&&m.walk.regionAt(px,py)!=='ground')return {ok:false,reason:'physical cell',point:{x:px,y:py},region:m.walk.regionAt(px,py)};
              }
              const steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/3);
              for(let i=0;i<=steps;i++){const t=steps?i/steps:0,q={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
                if(w.pointInSolid(q.x,q.y,radius))return {ok:false,reason:'native/scenery solid',point:q};
                if(neutral&&w.groundAt(q)?.kind)return {ok:false,reason:'doodad ground',point:q,ground:w.groundAt(q)};
              }
              return {ok:true,cells,radius};
            };
            const rows=[];
            for(let y=f.minY+15;y<f.maxY;y+=30){const wet=[];for(let x=f.minX+15;x<f.maxX;x+=30)if(m.walk.regionAt(offset.x+x,offset.y+y)===p.choice.region)wet.push(x);if(wet.length>=3)rows.push({y,wet});}
            rows.sort((a,b)=>b.wet.length-a.wet.length);
            for(const row of rows){
              const a=point(left,row.y),z=point(right,row.y),wet=point(row.wet[Math.floor(row.wet.length/2)],row.y);
              const upper=[a,point(left,top),point(right,top),z],lower=[z,point(right,bottom),point(left,bottom),a];
              const proofs=[...upper.slice(1).map((q,i)=>capsule(upper[i],q,true)),...lower.slice(1).map((q,i)=>capsule(lower[i],q,true))];
              const crossing=capsule(a,z,false);if(!proofs.every(p=>p.ok)||!crossing.ok)continue;
              if(w.groundAt(wet))continue;
              // Final placement is still labelled controlled initial arrival;
              // all proof segments following it use ordinary movement.
              w.landPartyAt(a);m.update(w,true);
              return {ok:true,probe:c.probe,plan:p,outer,offset,upper,lower,start:a,exit:z,wet,proofs,crossing,
                arrival:{method:'controlled initial arrival',pos:{...w.player.pos},beforeLevel,heroLevel:w.player.level,sourceLevel,beforeXp,afterXp:w.meta.xp},radius,
                actors:w.actors.length,doodads:w.doodads.length,warm:m.nativeWarm?.stats??null};
            }
            return {ok:false,probe:c.probe,planId:p.id,reason:'No complete naturally body-clear crossing and both bypasses',radius,actors:w.actors.length,doodads:w.doodads.length};
          },candidate));
          tried.push(arrival);save();if(arrival.ok){selected=arrival;break;}
        }
        if(!selected){report.courses.push({seed,region,tried,skipped:true});save();continue;}
        const course={seed,region,tried,selection:selected};report.courses.push(course);await run(install,selected);
        course.baseline=await run(async()=>window.__patchStep(30));
        assert.equal(course.baseline.region,'ground');assert.ok(!course.baseline.statuses.some(s=>['mired','sodden'].includes(s.id)));
        assert.equal(course.baseline.invulnerable,false);assert.equal(course.baseline.noclip,false);
        await shot(region+'-arrival');
        course.upper=await timed(region+' ordinary upper bypass',()=>run(async points=>{const out=[];for(const p of points.slice(1))out.push(await window.__patchWalkTo(p,true));return out;},selected.upper));
        await shot(region+'-upper-bypass');
        course.lower=await timed(region+' ordinary lower bypass',()=>run(async points=>{const out=[];for(const p of points.slice(1))out.push(await window.__patchWalkTo(p,true));return out;},selected.lower));
        await shot(region+'-lower-bypass');
        course.enter=await timed(region+' ordinary wet entry',()=>run(async p=>{const walk=await window.__patchWalkTo(p);return{walk,active:await window.__patchStep(5)};},selected.wet));
        const status=region==='mud'?'mired':'sodden',factor=region==='mud'?.6:.45;
        assert.equal(course.enter.active.region,region);assert.equal(course.enter.active.gridRegion,region);assert.equal(course.enter.active.ground,null);
        assert.ok(course.enter.active.statuses.some(s=>s.id===status));assert.ok(Math.abs(course.enter.active.speed/course.baseline.speed-factor)<1e-9);
        await shot(region+'-active');
        course.saved=await timed(region+' durable save',()=>run(async()=>{const receipt=window.__patchReceipt();__game.save();await __game.flushRunSave();return receipt;}));
        for(const sample of course.saved.samples){assert.deepEqual(sample.physical,sample.generated,'physical stream must retain generated patch truth');assert.equal(sample.region,sample.physical.region,'live walk must sample the same terrain');}
        save();await timed(region+' fresh renderer boot',boot);
        await timed(region+' Continue',()=>run(async charId=>{
          for(let i=0;i<200&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,50));
          const button=document.querySelector('#sm-continue:not([disabled])');if(!button)throw Error('Continue unavailable');
          const old=__game.world();button.click();for(let i=0;i<400&&(__game.world()===old||__game.world().meta.charId!==charId||__game.world().massRuntime?.resumePending);i++)await new Promise(r=>setTimeout(r,50));
          if(__game.world()===old||__game.world().meta.charId!==charId||!__game.world().massRuntime||__game.world().massRuntime.resumePending)throw Error('Native Continue did not publish saved run');
          __game.ui.hideAll();
        },course.saved.state.charId));
        await run(install,selected);course.continued=await run(()=>window.__patchReceipt());
        for(const key of ['plan','config','configHash','run','samples'])assert.deepEqual(course.continued[key],course.saved[key],region+' saved '+key);
        for(const key of ['charId','time','xp','pos'])assert.deepEqual(course.continued.state[key],course.saved.state[key],region+' saved '+key);
        assert.ok(!course.continued.state.statuses.some(s=>s.id===status));await shot(region+'-continue-before-tick');
        course.reapplied=await run(async()=>window.__patchStep(2));assert.ok(course.reapplied.statuses.some(s=>s.id===status));assert.equal(course.reapplied.speed,course.enter.active.speed);
        course.exit=await timed(region+' ordinary dry exit',()=>run(async p=>{const walk=await window.__patchWalkTo(p);return{walk,recovered:await window.__patchStep(35)};},selected.exit));
        assert.equal(course.exit.recovered.region,'ground');assert.ok(!course.exit.recovered.statuses.some(s=>s.id===status));assert.equal(course.exit.recovered.speed,course.baseline.speed);
        await shot(region+'-recovered');
        course.postContinueFrames=await run(()=>window.__patchFrames);
        for(const bypass of [...course.upper,...course.lower])assert.ok(bypass.frames.every(f=>f.region==='ground'&&!f.statuses.some(s=>['mired','sodden'].includes(s))));
        const measured=[...course.upper.flatMap(p=>p.frames),...course.lower.flatMap(p=>p.frames),...course.enter.walk.frames,...course.postContinueFrames].map(f=>f.ms).sort((a,b)=>a-b);
        course.frameSummary={frames:measured.length,medianMs:measured[Math.floor(measured.length*.5)],p95Ms:measured[Math.floor(measured.length*.95)],maxMs:measured.at(-1),over100ms:measured.filter(t=>t>100).length,scope:'Instrumented manual frames in software/offscreen browser; not normal interactive FPS'};console.log('PATCH_PERF '+JSON.stringify({region,...course.frameSummary}));
        course.acceptance={naturalSource:true,realEcologyAndNativeFeatures:true,actualRadiusCapsules:true,twoFullOrdinaryBypasses:true,nativeWetStatusAndSpeed:true,ordinaryEntryExit:true,exactSourceTerrainContinue:true,nativeTransientResetAndReapply:true,noHarnessTerrainEdits:true};save();
      }
    }
    for(const region of ['mud','swamp'])assert.ok(report.courses.some(c=>c.region===region&&c.acceptance),'No accepted natural '+region+' course');
    assert.deepEqual(report.consoleErrors,[]);
    report.acceptance={naturalMudAndSwamp:true,twoSidedBodyClearBypasses:true,ordinaryNativeMovement:true,nativeStatusSpeedAndRecovery:true,exactFreshRendererContinue:true,noConsoleErrors:true};
    report.error=null;save();console.log('PATCH_PASS '+path.join(dir,prefix+'.json'));
  } catch(error) {
    report.error=error.stack||String(error);try{report.failureState=await run(()=>window.__patchRead?.());}catch{}
    try{await shot('failure');}catch{}save();console.error(report.error);console.error('PATCH_REPORT '+path.join(dir,prefix+'.json'));process.exitCode=1;
  } finally { clearTimeout(timer);if(win&&!win.isDestroyed())win.destroy();server.close();app.exit(process.exitCode||0); }
}).catch(error=>{console.error(error);app.exit(1);});

// Real Chromium UI work, isolated from personal saves. Build first.
// --label=before/after names reports; --cpu=4 approximates a slower CPU.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const limits = require('./ui-perf.config.json');
const flag = (name, fallback) => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const label = flag('label', 'current').replace(/[^a-z0-9_-]/gi, ''), cpu = Number(flag('cpu', '1'));
const dir = path.join(__dirname, 'reports');
app.setPath('userData', path.join(dir, `ui-perf-profile-${process.pid}`));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
 const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, `ui-perf-saves-${process.pid}`) });
 const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
 try {
  await win.loadURL(server.url); await wait(1200);
  const grown = await win.webContents.executeJavaScript(`(()=>{__game.account().ledger.prologue_lived=1;const saved=Math.random;let seed=0x71a51;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};try{__game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();for(let r=0;r<8;r++)for(const z of Object.values(w.zoneMap).filter(z=>!z.dimension&&z.caveDepth==null&&!z.pocket&&!z.floating&&z.exits.some(e=>e.to==='?')))w.chartNeighborsOf(z);for(const z of Object.values(w.zoneMap)){if(!z.dimension&&z.caveDepth==null){w.surveyed.add(z.id);z.veiled=false;}}return Object.keys(w.zoneMap).length;}finally{Math.random=saved}})()`);
  win.webContents.debugger.attach('1.3');
  await win.webContents.debugger.sendCommand('Emulation.setCPUThrottlingRate', { rate: cpu });
  await win.webContents.executeJavaScript(`window.__uiTimes={};for(const name of ['refreshMap','atlasInputs','syncAtlas','zoneBoxHtml']){const old=__game.ui[name];if(!old)continue;__game.ui[name]=function(...args){const t=performance.now();try{return old.apply(this,args)}finally{(__uiTimes[name]??=[]).push(performance.now()-t)}}}void 0;`);
  const out = { label, cpu, grown, scenarios: [] };
  for (const [width, height] of [[1400,1000],[390,844],[844,390]]) {
   win.setContentSize(width,height); await wait(100);
   const row = await win.webContents.executeJavaScript(`(async()=>{
    const ui=__game.ui;ui.hideAll();window.__uiTimes={};
    const t=performance.now();ui.toggleMap();const openMs=performance.now()-t;
    const readyStart=performance.now();
    while(!document.querySelector('#atlas-base')?.getAttribute('href')&&performance.now()-readyStart<${limits.maxReadyMs})await new Promise(r=>setTimeout(r,25));
    const readyMs=performance.now()-readyStart;
    const ready=!!document.querySelector('#atlas-base')?.getAttribute('href');
    const svg=document.querySelector('#world-map-svg'), events=[];
    const original=svg;
    // A live overlay changes on every refresh even while the hero stands still.
    // Inspect immediately AND on animation frames: handler timing alone missed
    // the empty terrain between a DOM rebuild and the deferred painter tick.
    const world=__game.world(), oldHud=world.sim.hudLine, oldLayers=world.sim.mapLayers;
    const originalBase=document.querySelector('#atlas-base');
    const originalNode=svg.querySelector('[data-zone]'), originalZoom=document.querySelector('[data-mz="reset"]');
    let blankFrames=0, replacedCharts=0, staleOverlays=0;
    try {
     for(let n=0;n<8;n++){
      world.sim.hudLine=()=> 'Visual stability '+n;
      world.sim.mapLayers=function(...args){return [...oldLayers.apply(this,args),{id:'qa-live',label:'QA',under:'<circle id="qa-live" cx="'+n+'" cy="0" r="1"/>',over:''}]};
      ui.refreshMap();
      const check=()=>{const b=document.querySelector('#atlas-base');if(!b?.getAttribute('href')||b.getAttribute('display')==='none')blankFrames++;if(document.querySelector('#world-map-svg')!==original||b!==originalBase)replacedCharts++;};
      if(document.querySelector('#qa-live')?.getAttribute('cx')!==String(n))staleOverlays++;
      check();await new Promise(requestAnimationFrame);check();await new Promise(r=>setTimeout(r,60));
     }
    } finally {world.sim.hudLine=oldHud;world.sim.mapLayers=oldLayers;}
    const stableControls=originalNode===svg.querySelector('[data-zone]')&&originalZoom===document.querySelector('[data-mz="reset"]');
    // A changing chip list must not duplicate listeners on surviving controls.
    let togglesOnce=true;
    for(let n=0;n<4;n++){ui.refreshMap();document.querySelector('[data-mlayer="atlas:relief"]').click();togglesOnce&&=ui.mapLayersOff.has('atlas:relief')===(n%2===0);}
    for(let i=0;i<24;i++){const t=performance.now();document.querySelector('#world-map-svg').dispatchEvent(new WheelEvent('wheel',{deltaY:i%8<4?100:-100,bubbles:true,cancelable:true}));events.push(performance.now()-t);await new Promise(r=>setTimeout(r,20));}
    await new Promise(r=>setTimeout(r,800));
    const bounds=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};
    const timings=Object.fromEntries(Object.entries(__uiTimes).map(([k,v])=>{v.sort((a,b)=>a-b);return[k,{calls:v.length,total:+v.reduce((a,b)=>a+b,0).toFixed(1),p95:+v[Math.floor((v.length-1)*.95)].toFixed(1),max:+v.at(-1).toFixed(1)}]}));
    events.sort((a,b)=>a-b);
    const dragSvg=document.querySelector('#world-map-svg'),beforeDrag=dragSvg.getAttribute('viewBox');
    dragSvg.dispatchEvent(new PointerEvent('pointerdown',{pointerId:71,pointerType:'touch',button:0,buttons:1,clientX:180,clientY:180,bubbles:true}));
    dragSvg.dispatchEvent(new PointerEvent('pointermove',{pointerId:71,pointerType:'touch',buttons:1,clientX:220,clientY:210,bubbles:true}));
    const dragMoved=beforeDrag!==dragSvg.getAttribute('viewBox');
    dragSvg.dispatchEvent(new PointerEvent('pointercancel',{pointerId:71,pointerType:'touch',buttons:0,bubbles:true}));
    const dragReleased=!ui.mapDragging;
    const picture=new Image();if(ready){picture.src=document.querySelector('#atlas-base').getAttribute('href');await picture.decode();}
    const result={width:innerWidth,height:innerHeight,openMs:+openMs.toFixed(1),readyMs:+readyMs.toFixed(1),eventP95:+events[22].toFixed(1),ready,blankFrames,replacedCharts,staleOverlays,stableControls,togglesOnce,dragMoved,dragReleased,image:[picture.width,picture.height],stableSvg:original===document.querySelector('#world-map-svg'),panel:bounds(document.querySelector('#world-map')),chart:bounds(document.querySelector('#world-map-svg')),timings};
    const style=__game.settings().mapChart;__game.settings().mapChart='classic';ui.refreshMap();
    result.styleCleared=!document.querySelector('#atlas-base').getAttribute('href')&&!document.querySelector('#atlas-labels').childElementCount;
    __game.settings().mapChart=style;ui.refreshMap();
    const dimension=ui.mapDimension,hadHell=world.discoveredDimensions.has('hell');world.discoveredDimensions.add('hell');ui.mapDimension='hell';ui.refreshMap();
    result.dimensionCleared=!document.querySelector('#atlas-base').getAttribute('href')&&!document.querySelector('#atlas-labels').childElementCount;
    ui.mapDimension=dimension;if(!hadHell)world.discoveredDimensions.delete('hell');ui.refreshMap();
    const restoreStart=performance.now();while(!document.querySelector('#atlas-base')?.getAttribute('href')&&performance.now()-restoreStart<${limits.maxReadyMs})await new Promise(r=>setTimeout(r,25));
    result.restored=!!document.querySelector('#atlas-base')?.getAttribute('href');return result;
   })()`);
   out.scenarios.push(row); console.log(JSON.stringify(row));
   fs.writeFileSync(path.join(dir,`ui-map-${label}-${width}.png`),(await win.webContents.capturePage()).toPNG());
   const menus=await win.webContents.executeJavaScript(`(async()=>{const ui=__game.ui,rows=[];for(const method of ['toggleInventory','toggleCharSheet','toggleTree']){ui.hideAll();const t=performance.now();ui[method]();const ms=performance.now()-t;const roots=[...document.querySelectorAll('.panel:not(.hidden)')],anchors=roots.map(el=>el.querySelector('h2'));let unstableFrames=0;const end=performance.now()+650;while(performance.now()<end){await new Promise(requestAnimationFrame);if(roots.some((el,i)=>!el.isConnected||el.classList.contains('hidden')||el.querySelector('h2')!==anchors[i]))unstableFrames++;}const panels=roots.map(el=>{const r=el.getBoundingClientRect();return{id:el.id,width:r.width,height:r.height,left:r.left,top:r.top}});rows.push({method,ms,unstableFrames,panels})}ui.hideAll();return rows})()`);
   row.menus=menus;
  }
  fs.writeFileSync(path.join(dir, `ui-perf-${label}.json`), JSON.stringify(out,null,2));
  assert.ok(out.scenarios.every(s=>s.ready), 'base chart finishes');
  assert.ok(out.scenarios.every(s=>s.blankFrames===0&&s.replacedCharts===0&&s.stableSvg), 'live refreshes keep the visible chart mounted without blank frames');
  assert.ok(out.scenarios.every(s=>s.staleOverlays===0&&s.stableControls&&s.togglesOnce), 'live overlays update while controls stay mounted and fire once');
  assert.ok(out.scenarios.every(s=>s.styleCleared&&s.dimensionCleared&&s.restored), 'incompatible views clear immediately and the surface chart restores');
  assert.ok(out.scenarios.every(s=>s.eventP95<limits.maxInputP95Ms*cpu), 'map input meets the main-thread allowance');
  assert.ok(out.scenarios.every(s=>s.dragMoved&&s.dragReleased), 'touch pan and cancel stay usable');
  assert.ok(out.scenarios.every(s=>Math.max(...s.image)<=limits.maxRasterPx), 'decoded images respect the memory cap');
  assert.ok(out.scenarios.every(s=>Math.min(s.chart.w,s.chart.h)>=limits.minChartSide), 'small-screen chart remains useful');
  assert.ok(out.scenarios.every(s=>s.panel.x>=-1&&s.panel.y>=-1&&s.panel.x+s.panel.w<=s.width+1&&s.panel.y+s.panel.h<=s.height+1), 'map panel stays on screen');
  assert.ok(out.scenarios.every(s=>s.menus.every(m=>m.panels.every(p=>p.left>=-1&&p.top>=-1&&p.left+p.width<=s.width+1&&p.top+p.height<=s.height+1))), 'inventory, character and passive panels stay on screen');
  assert.ok(out.scenarios.every(s=>s.menus.every(m=>m.unstableFrames===0)), 'idle inventory, character and passive panels remain mounted through auto-refresh');
 } finally { win.destroy(); server.server.close(); app.quit(); }
}).catch(e=>{console.error(e?.stack??String(e));app.exit(1)});

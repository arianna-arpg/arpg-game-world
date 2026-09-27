// Run probe_anatomycues and build first. Hidden renderer; disposable saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const catalog = JSON.parse(fs.readFileSync(path.join(dir, 'anatomy-catalog.json'), 'utf8'));
const logfile = path.join(dir, 'anatomy-cues-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = v => fs.appendFileSync(logfile, JSON.stringify(v) + '\n');
const save = (name, url) => fs.writeFileSync(path.join(dir, 'anatomy-' + name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
app.setPath('userData', path.join(dir, 'anatomy-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'anatomy-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1500, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = async code => {
    const r = await win.webContents.executeJavaScript(`(()=>{try{return{value:eval(${JSON.stringify(code)})}}catch(e){return{error:e.stack??String(e)}}})()`);
    if (r.error) throw Error(r.error); return r.value;
  };
  async function capture(name) {
    const r = await run(`(()=>{
      const w=__game.world(),r=__game.renderer,labels=[],original=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(text,...args){labels.push(String(text));return original.call(this,text,...args)};
      try{r.render(w)}finally{CanvasRenderingContext2D.prototype.fillText=original}
      const full=r.canvas.toDataURL('image/png'),canvas=document.createElement('canvas');
      const oldCanvas=r.canvas,oldCtx=r.ctx;canvas.width=oldCanvas.width;canvas.height=oldCanvas.height;
      r.canvas=canvas;r.ctx=canvas.getContext('2d');let hud;
      try{r.drawHud(w);hud=canvas.toDataURL('image/png')}finally{r.canvas=oldCanvas;r.ctx=oldCtx}
      return{full,hud,labels,fatal:__game.crash().fatal,rows:__game.snapshot().actors.filter(a=>a.anatomyCues).map(a=>({id:a.id,def:a.defId,cues:a.anatomyCues})),
        flashes:w.flashes.map(f=>f.combatCue?.style).filter(Boolean)};
    })()`);
    const { full, hud, ...facts } = r; log({ name, ...facts }); save(name, full); save(name + '-hud', hud);
    assert.equal(r.fatal, null); assert.ok(!r.labels.some(t => /^(spot shattered!|SUNDERED|TORN|SCALE TORN|COIL TORN)$/.test(t)));
    return r;
  }
  try {
    await win.loadURL(server.url);
    await run("window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('warrior');__game.ui.hideAll();__game.step(360);void 0;");
    await run(`(()=>{
      const w=__game.world(),p=w.player,base=p.skills.find(Boolean);
      w.zoneMap.qa_anatomy={id:'qa_anatomy',name:'Proving Ground',level:12,size:{w:1800,h:1400},seed:747,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_anatomy');p.pos={x:900,y:760};__game.step(240);
      w.actors=[p];w.projectiles=[];w.flashes=[];w.texts=[];w.zones=[];w.doodads=[];w.walk=null;w.markDoodadsChanged();
      window.markSkill={...base,sockets:[],state:{},treeNodes:[],def:{...${JSON.stringify(catalog.skill)},requirements:undefined,useTime:0}};
      p.skills=[markSkill];p.buffs.clear();p.runes=[];p.statuses=[];
      p.sheet.setSource('anatomy-rig',[{stat:'life',kind:'override',value:1000},{stat:'mana',kind:'override',value:10000}]);p.fillResources();
      window.spawnAnatomy=(id,x,y)=>{const a=w.createMonster(id,1,'enemy');a.pos={x,y};a.spawnedAt=-1;a.ambushArmed=false;a.untargetable=false;a.brain=undefined;a.anchored=true;a.bossBarLive=true;w.actors.push(a);return a};
      window.target=spawnAnatomy('zombie',730,610);window.boss=spawnAnatomy('primeval_ironbell',1030,600);boss.facing=-Math.PI/2;
      w.updateParts();for(const a of w.actors){a.spawnedAt=-1;a.aiCooldown=99999}
      window.anatomyMark=a=>a.applyStatus('exposed',1,1,'qa');
      __game.settings().lowLifePulse=false;Object.defineProperty(performance,'now',{value:()=>20000,configurable:true});
    })()`);
    const pristine = await capture('pristine');
    await run("anatomyMark(target);anatomyMark(boss);anatomyMark(__game.world().player);void 0;");
    const marked = await capture('marked');
    assert.equal(marked.rows.filter(r=>r.cues.weakpoints.length).length,3); assert.notEqual(pristine.hud,marked.hud);
    await run("target.life=target.maxLife()*.86;boss.life=boss.maxLife()*.86;__game.world().player.life=860;void 0;");
    const active = await capture('active'); assert.equal(active.rows.filter(r=>r.cues.weakpoints.some(s=>s.active)).length,3);
    assert.notEqual(active.hud,marked.hud);
    await run("boss.partActors[0].life*=.3;boss.partActors[1].life*=.6;void 0;");
    await capture('damaged-parts');
    await run("const w=__game.world(),part=boss.partActors.find(a=>a.defId==='primeval_ironbell_bell');window.brokenPos={...part.pos};part.life=0;w.kill(part,false,w.player);void 0;");
    const broken = await capture('broken-part'); assert.ok(broken.rows.some(r=>r.cues.parts.some(p=>p.broken)));
    assert.ok(broken.flashes.includes('anatomy_part_break')); assert.equal(await run("boss.aiSkillBans.has('ironbell_toll')"),true);
    await run("target.life=target.maxLife()*.6;__game.world().update(.001);for(const a of __game.world().actors)a.casting=null;void 0;");
    const shattered = await capture('shattered'); assert.ok(shattered.flashes.includes('anatomy_weak_break'));
    await run("__game.world().zone.theme.floor='#cbc3af';__game.world().zone.theme.grid='#c4bca8';__game.renderer.ground.zoneRef=null;for(let i=0;i<20;i++)__game.renderer.render(__game.world());void 0;");
    win.setContentSize(1000,720); await new Promise(r=>setTimeout(r,150)); await run("window.dispatchEvent(new Event('resize'));void 0;");
    await capture('bright-small');
    await run(`(()=>{const w=__game.world();w.actors=[w.player];w.flashes=[];
      window.wyrm=spawnAnatomy('primeval_wyrm_head',940,510);wyrm.radius=30;wyrm.partsSpawned=true;wyrm.facing=0;
      wyrm.worm.segments=Array.from({length:26},(_,i)=>({x:700+(i%9)*48,y:560+Math.floor(i/9)*58}));
      wyrm.worm.woundHp=[];wyrm.worm.wounded=[];wyrm.worm.woundHp[10]=wyrm.maxLife()*wyrm.worm.wounds.frac*.35;
      wyrm.worm.wounded[25]=true;wyrm.worm.woundHp[25]=0;anatomyMark(wyrm);wyrm.life*=.85;
    })()`);
    const worm = await capture('long-worm'); assert.ok(worm.rows.some(r=>r.cues.segments.length===26&&r.cues.segments[25].broken));
    // Covered/concealed worm cues cannot leak through the head's visibility gates.
    assert.equal(await run("(()=>{const r=__game.renderer,w=__game.world();wyrm.burrow={};const hidden=!r.anatomyCueVisible(wyrm,w);wyrm.burrow=undefined;return hidden})()"),true);
    await run("const snap=__game.snapshot();window.mirrorRows=snap.actors.filter(a=>a.anatomyCues).map(a=>a.anatomyCues);wyrm.statuses=[];wyrm.worm.wounds=undefined;__game.applySnap(snap);void 0;");
    const mirrored = await capture('mirrored'); assert.ok(mirrored.rows.some(r=>r.cues.weakpoints[0]?.active&&r.cues.segments[25]?.broken));
    log('PASS: waiting/active/spent weakpoints, real part damage/break/disarm, long-tail wounds, dark/bright/compact bars and orb, co-op');
    clearTimeout(timeout);win.destroy();server.server.close();app.exit(0);
  } catch(e) {log(e.stack??String(e));clearTimeout(timeout);win.destroy();server.server.close();app.exit(1);}
});

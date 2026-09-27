// Run probe_feedingcues and build first. Hidden renderer; disposable saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const catalog = JSON.parse(fs.readFileSync(path.join(dir, 'feeding-catalog.json'), 'utf8'));
const logfile = path.join(dir, 'feeding-cues-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = v => fs.appendFileSync(logfile, JSON.stringify(v) + '\n');
const save = (name, url) => fs.writeFileSync(path.join(dir, 'feeding-' + name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
app.setPath('userData', path.join(dir, 'feeding-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'feeding-saves-' + process.pid) });
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
      return{full,hud,labels,fatal:__game.crash().fatal,rows:__game.snapshot().actors.filter(a=>a.feedingCues).map(a=>({id:a.id,def:a.defId,cues:a.feedingCues})),
        transfers:w.flashes.filter(f=>f.feedingCue).map(f=>f.feedingCue)};
    })()`);
    const { full, hud, ...facts } = r; log({ name, ...facts }); save(name, full); save(name + '-hud', hud);
    assert.equal(r.fatal, null); assert.ok(!r.labels.some(t => /^(feeds|devours|fed \d|consumed!|drinking\.\.\.|sipping\.\.\.|charging\.\.\.)/.test(t)));
    return r;
  }
  try {
    await win.loadURL(server.url);
    await run("window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('necromancer');__game.ui.hideAll();__game.step(360);void 0;");
    await run(`(()=>{
      const w=__game.world(),p=w.player,base=p.skills.find(Boolean);
      w.zoneMap.qa_feeding={id:'qa_feeding',name:'Proving Ground',level:12,size:{w:1800,h:1400},seed:747,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_feeding');p.pos={x:900,y:760};__game.step(240);
      w.actors=[p];w.projectiles=[];w.flashes=[];w.texts=[];w.zones=[];w.doodads=[];w.walk=null;w.markDoodadsChanged();
      window.feedingSkills=${JSON.stringify(catalog.skills)}.map(def=>({...base,sockets:[],state:{},treeNodes:[],def:{...def,requirements:undefined,useTime:0}}));
      p.skills=feedingSkills;p.buffs.clear();p.runes=[];p.statuses=[];p.casting=null;p.useLock=0;
      p.sheet.setSource('feeding-rig',[...['life','mana'].map(stat=>({stat,kind:'override',value:1000})),{stat:'energyShield',kind:'override',value:200},
        ...['restorePower','effectDuration','healTaken'].map(stat=>({stat,kind:'override',value:1})),...['lifeRegen','manaRegen'].map(stat=>({stat,kind:'override',value:0}))]);p.fillResources();p.esDelay=99;
      window.feedSkill=id=>feedingSkills.find(s=>s.def.id===id);
      window.stream=(resource)=>w.startRestoreStream(p,p,feedSkill('life_flask'),{resource,amount:100,duration:1},0,1);
      window.spawnMeal=(x,y)=>{const a=w.createMonster('skeleton_warrior',1,'player',p);a.sourceSkillId='__proc:food';a.pos={x,y};a.spawnedAt=-1;a.brain=undefined;a.anchored=true;w.actors.push(a);return a};
      __game.settings().lowLifePulse=false;Object.defineProperty(performance,'now',{value:()=>20000,configurable:true});
    })()`);
    await run("for(const r of ['life','mana','es'])stream(r);__game.world().player.updateTimers(.1);void 0;");
    const full = await capture('full-pools'); assert.equal(full.rows.length,0);
    await run("const p=__game.world().player;p.life=400;p.mana=400;p.es=0;p.updateTimers(.1);void 0;");
    const pour = await capture('refilling'); assert.equal(pour.rows[0].cues.gains.length,3);
    await run("window.gains=__game.world().player.restoreGains;__game.world().player.restoreGains=[];void 0;");
    const quiet = await capture('refilling-no-cues'); assert.notEqual(quiet.hud,pour.hud);
    await run("const p=__game.world().player;p.restoreGains=[];p.fillResources();p.sheet.setSource('overmend',[{stat:'overheal',kind:'override',value:1}]);p.updateTimers(.1);void 0;");
    const overmend = await capture('overmend'); assert.equal(overmend.rows[0].cues.gains[0].resource,'absorb');
    await run(`(()=>{const w=__game.world(),p=w.player;p.restoreStreams=[];p.restoreGains=[];p.sheet.removeSource('overmend');p.life=400;p.mana=400;
      w.corpses=[{pos:{x:750,y:700},defId:'zombie',level:1,maxLife:200,remaining:60,tier:0}];
      if(!w.useSkill(p,feedSkill('corpse_feast'),w.corpses[0].pos))throw Error('Feast refused');
      for(const f of w.flashes)if(f.feedingCue)f.life=f.maxLife*.5;
    })()`);
    const feast = await capture('feast'); assert.equal(feast.transfers.length,1); assert.equal(feast.transfers[0].profile,'flesh');
    await run(`(()=>{const w=__game.world(),p=w.player;w.flashes=[];p.restoreGains=[];p.cooldowns.clear();p.useLock=0;
      window.eater=spawnMeal(760,580);eater.sourceSkillId='__proc:eater';eater.life*=.3;
      eater.devour={next:0,spec:{interval:3,radius:140,heal:.2}};spawnMeal(860,580);
      w.updateMinionMeta(1);for(const f of w.flashes)if(f.feedingCue)f.life=f.maxLife*.5;
    })()`);
    const devour = await capture('devour'); assert.ok(devour.transfers.length && devour.rows.some(r=>r.def==='skeleton_warrior'));
    await run(`(()=>{const w=__game.world(),p=w.player;w.actors=[p];w.flashes=[];p.restoreGains=[];p.cooldowns.clear();p.useLock=0;p.fillResources();
      spawnMeal(930,760);spawnMeal(960,760);if(!w.useSkill(p,feedSkill('the_amalgam'),p.pos))throw Error('Amalgam refused');
      for(let i=0;i<120&&(p.casting?.amalgamFed??0)<2;i++){p.casting.held=true;w.update(1/60)}
      for(const f of w.flashes)if(f.feedingCue)f.life=f.maxLife*.5;
    })()`);
    const mass = await capture('amalgam'); assert.equal(mass.rows[0].cues.mass.count,2);
    await run(`(()=>{const w=__game.world(),p=w.player;p.casting.held=false;w.update(1/60);w.actors=[p];w.flashes=[];w.texts=[];p.restoreGains=[];
      window.glutton=w.createMonster('charnel_glutton',1,'enemy');glutton.pos={x:1120,y:610};glutton.spawnedAt=-1;glutton.drives.set('gorge',0);glutton.life*=.6;w.actors.push(glutton);
      w.corpses=[{pos:{x:1130,y:610},defId:'zombie',level:1,maxLife:100,remaining:60}];__game.ai(glutton,w,.6);
    })()`);
    const chew = await capture('chewing'); assert.ok(chew.rows.some(r=>r.cues.meal));
    // Story culling checks both ends: a consumed source cannot reveal a covered floor.
    assert.equal(await run("(()=>{const w=__game.world(),r=__game.renderer;w.zone.tiers={exposure:'covered'};const hidden=!r.feedingTransferVisible({x:700,y:700},{to:w.player.pos,fromTier:1,toTier:0,profile:'flesh'},w);w.zone.tiers=undefined;return hidden})()"),true);
    await run("const w=__game.world();w.zone.theme.floor='#cbc3af';w.zone.theme.grid='#c4bca8';__game.renderer.ground.zoneRef=null;for(let i=0;i<20;i++)__game.renderer.render(w);w.player.life=400;w.player.mana=400;stream('life');stream('mana');w.player.updateTimers(.1);void 0;");
    win.setContentSize(1000,720); await new Promise(r=>setTimeout(r,150)); await run("window.dispatchEvent(new Event('resize'));void 0;");
    const compact = await capture('bright-small'); assert.ok(compact.rows.some(r=>r.cues.gains.length===2));
    await run("const snap=__game.snapshot();for(const a of __game.world().actors){a.restoreStreams=[];a.restoreGains=[];a.feedingMeal=undefined}__game.applySnap(snap);void 0;");
    const mirror = await capture('mirrored'); assert.ok(mirror.rows.some(r=>r.cues.meal)); assert.ok(mirror.rows.some(r=>r.cues.gains.length===2));
    log('PASS: real corpse/devour/Amalgam/carrion, actual life/mana/ES gains, full pools, overmend, orb changes, covered floors, bright/compact and co-op');
    clearTimeout(timeout);win.destroy();server.server.close();app.exit(0);
  } catch(e) {log(e.stack??String(e));clearTimeout(timeout);win.destroy();server.server.close();app.exit(1);}
});

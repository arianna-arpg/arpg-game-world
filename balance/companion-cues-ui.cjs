// Run probe_companioncues and build first. Hidden renderer; disposable saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const catalog = JSON.parse(fs.readFileSync(path.join(dir, 'companion-catalog.json'), 'utf8'));
const logfile = path.join(dir, 'companion-cues-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = v => fs.appendFileSync(logfile, JSON.stringify(v) + '\n');
const save = (name, url) => fs.writeFileSync(path.join(dir, 'companion-' + name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
app.setPath('userData', path.join(dir, 'companion-cue-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 120000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'companion-cue-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1200, height: 850, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = async code => {
    const r = await win.webContents.executeJavaScript(`(()=>{try{return{value:eval(${JSON.stringify(code)})}}catch(e){return{error:e.stack??String(e)}}})()`);
    if (r.error) throw Error(r.error); return r.value;
  };
  async function capture(name) {
    const r = await run(`(()=>{
      const w=__game.world(),r=__game.renderer,labels=[],original=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(text,...args){labels.push(String(text));return original.call(this,text,...args)};
      try{r.render(w)}finally{CanvasRenderingContext2D.prototype.fillText=original}
      const full=r.canvas.toDataURL('image/png'),canvas=document.createElement('canvas'),oldCanvas=r.canvas,oldCtx=r.ctx;
      canvas.width=oldCanvas.width;canvas.height=oldCanvas.height;r.canvas=canvas;r.ctx=canvas.getContext('2d');let hud;
      try{r.drawHud(w);hud=canvas.toDataURL('image/png')}finally{r.canvas=oldCanvas;r.ctx=oldCtx}
      const snap=__game.snapshot();
      return{full,hud,labels,fatal:__game.crash().fatal,rows:snap.actors.filter(a=>a.companionCues).map(a=>({id:a.id,cues:a.companionCues})),
        procs:snap.actors.flatMap(a=>a.procCues??[]),motions:w.emergences.map(e=>({actor:e.actorId,motion:e.spec.motion,held:e.held})),
        events:w.flashes.map(f=>f.combatCue?.style).filter(Boolean)};
    })()`);
    const { full, hud, ...facts } = r; log({ name, ...facts }); save(name, full); save(name + '-hud', hud);
    assert.equal(r.fatal, null); assert.ok(!r.labels.some(t => /^(TAMED:|resisted!|dominated!|Downed|revived!|undying!|respawned|THE AMALGAM RISES|BLOOM|miasma rises|the bond answers|bond broken!)/.test(t)));
    return r;
  }
  try {
    await win.loadURL(server.url);
    await run("window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.account().ledger.prologue_lived=1;__game.devStartRun('tamer');__game.ui.hideAll();__game.step(360);void 0;");
    await run(`(()=>{
      const w=__game.world(),p=w.player,base=p.skills.find(Boolean);
      w.zoneMap.qa_companion={id:'qa_companion',name:'Proving Ground',level:12,size:{w:1800,h:1400},seed:747,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_companion');p.pos={x:900,y:760};__game.step(240);
      w.actors=[p];w.projectiles=[];w.flashes=[];w.texts=[];w.zones=[];w.doodads=[];w.walk=null;w.markDoodadsChanged();
      window.cueSkills=${JSON.stringify(catalog.skills)}.map(def=>({...base,sockets:[],state:{},treeNodes:[],def:{...def,requirements:undefined}}));
      window.cueSkill=id=>cueSkills.find(s=>s.def.id===id);window.tame=cueSkill('tame_beast');p.skills=[tame];
      p.casting=null;p.useLock=0;p.buffs.clear();p.runes=[];p.statuses=[];p.sheet.setSource('cue-rig',[{stat:'mana',kind:'override',value:10000}]);p.fillResources();
      window.spawnCue=(id,x,y,owner)=>{const a=w.createMonster(id,1,owner?'player':'enemy',owner);a.pos={x,y};a.spawnedAt=-1;a.anchored=true;a.aiCooldown=99999;w.actors.push(a);return a};
      window.wolf=spawnCue('plains_wolf',1060,650);window.claimFx={type:'tame',tags:['beast'],sureBelow:.5,wildChance:0};
      __game.settings().lowLifePulse=false;Object.defineProperty(performance,'now',{value:()=>20000,configurable:true});
      if(!w.useSkill(p,tame,wolf.pos)||!p.casting)throw Error('Tame did not start');p.casting.elapsed=p.casting.total*.55;
    })()`);
    const effort=await capture('taming');assert.ok(effort.rows.some(r=>r.cues.links.some(l=>l.kind==='tame'&&l.progress>.5)));
    await run("__game.world().player.casting.focusBroken=true;void 0;");await capture('strained');
    await run("const w=__game.world();w.player.casting=null;w.tryTame(w.player,tame,wolf,claimFx);void 0;");
    const rejected=await capture('rejected');assert.ok(rejected.events.includes('companion_reject'));
    await run("const w=__game.world();w.flashes=[];wolf.life*=.1;w.tryTame(w.player,tame,wolf,claimFx);void 0;");
    const claimed=await capture('claimed');assert.ok(claimed.rows.some(r=>r.cues.links.some(l=>l.kind==='owner')));
    for(const stance of ['aggressive','defensive','passive']){
      await run(`__game.world().flashes=[];__game.world().setCompanionStance(__game.world().localSeat,'tame_beast',${JSON.stringify(stance)});void 0;`);
      await capture(stance);
    }
    await run("const w=__game.world();w.flashes=[];w.kill(wolf);wolf.pos={x:990,y:760};void 0;");
    const down=await capture('downed');assert.ok(down.events.includes('companion_down'));
    await run("const w=__game.world();w.flashes=[];w.reviveCompanion(wolf);w.update(.15);void 0;");
    const revived=await capture('revived');assert.ok(revived.motions.some(m=>m.motion==='stir'&&!m.held));
    await run("const w=__game.world();window.thrall=spawnCue('skeleton_warrior',750,635,w.player);thrall.sourceSkillId='__dominate:qa';thrall.undyingTime=2;thrall.life=0;w.kill(thrall);w.update(.15);void 0;");
    const undying=await capture('undying');assert.ok(undying.motions.some(m=>m.motion==='rise'&&!m.held));
    await run(`(()=>{const w=__game.world(),p=w.player;w.flashes=[];p.cooldowns.clear();p.useLock=0;p.casting=null;
      window.field={...cueSkill('expose_weakness'),def:{...cueSkill('expose_weakness').def,tags:['spell','curse']},sockets:[{def:${JSON.stringify(catalog.support)},level:1}]};
      if(!w.executeSkill(p,field,p.pos))throw Error('Field refused');for(const f of w.flashes)if(f.combatCue)f.life=f.maxLife*.6;
    })()`);
    const form=await capture('field-form');assert.ok(form.events.includes('field_form'));
    await run("const w=__game.world();w.flashes=[];w.retireOwnedZone(w.zones[0]);for(const f of w.flashes)f.life=f.maxLife*.55;void 0;");
    const retired=await capture('field-release');assert.ok(retired.events.includes('field_release'));
    await run("const w=__game.world();w.flashes=[];w.remnants=[{pos:{...w.player.pos},element:'fire',life:10,bob:0},{pos:{...w.player.pos},kind:'bulwark',life:10,bob:0}];w.updateRemnants(.01);void 0;");
    const bank=await capture('remnants');assert.ok(bank.procs.some(r=>r.id==='remnant_fire'&&r.phase==='stored'));
    assert.equal(await run("(()=>{const w=__game.world();w.zone.tiers={exposure:'covered'};const hidden=!__game.renderer.companionCuePointVisible(wolf.pos,1,w);w.zone.tiers=undefined;return hidden})()"),true);
    await run("const w=__game.world();w.zone.theme.floor='#cbc3af';w.zone.theme.grid='#c4bca8';__game.renderer.ground.zoneRef=null;for(let i=0;i<20;i++)__game.renderer.render(w);void 0;");
    win.setContentSize(1000,720);await new Promise(r=>setTimeout(r,150));await run("window.dispatchEvent(new Event('resize'));void 0;");
    await capture('bright-small');
    await run("const snap=__game.snapshot(),zone=__game.world().zone;__game.devStartRun('tamer');__game.ui.hideAll();const client=__game.world();client.zoneMap[zone.id]=zone;client.loadZone(zone.id);__game.applySnap(snap);for(let i=0;i<60;i++)__game.renderer.render(client);void 0;");
    const mirrored=await capture('mirrored');assert.ok(mirrored.rows.some(r=>r.cues.stance));assert.ok(mirrored.rows.some(r=>r.cues.links.length));
    assert.ok(mirrored.motions.some(m=>m.motion==='stir'&&!m.held));assert.ok(mirrored.motions.some(m=>m.motion==='rise'&&!m.held));
    log('PASS: actual taming/rejection/claim, all stances, down/revival, undying, fields, remnant body/HUD banks, compact/bright and co-op');
    clearTimeout(timeout);win.destroy();server.server.close();app.exit(0);
  }catch(e){log(e.stack??String(e));clearTimeout(timeout);win.destroy();server.server.close();app.exit(1);}
});

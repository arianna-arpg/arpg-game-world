// Real client acceptance, isolated saves; the independent critic uses a separate profile.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
const file=path.join(dir,'worldmass-journey-ui.log');fs.writeFileSync(file,'START\n');
const log=v=>fs.appendFileSync(file,JSON.stringify(v)+'\n');
app.setPath('userData',path.join(dir,'journey-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
  const root=path.resolve(__dirname,'../dist-preview'),server=http.createServer((req,res)=>{
    const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
    if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
    res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
  const run=async(fn,...args)=>{
    const result=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(error){return {ok:false,error:error.stack||String(error)}}})()');
    if(!result.ok)throw Error(result.error);return result.value;
  };
  const shot=async name=>{win.webContents.invalidate();await new Promise(r=>setTimeout(r,300));fs.writeFileSync(path.join(dir,'worldmass-journey-'+name+'.png'),(await win.webContents.capturePage()).toPNG());};
  const url=process.argv[2]||'http://127.0.0.1:'+server.address().port;
  const timeout=setTimeout(()=>{log('TIMEOUT');app.exit(1);},240000);
  try{
    await win.loadURL(url);
    const boot=await run(()=>{
      window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
      __game.devStartRun('warrior');__game.ui.hideAll();
      const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;__game.step(3);
      window.journeyQA={hero:w.player,seed:w.massRuntime.generator.run.seed,loads:0};
      const original=w.loadZone;w.loadZone=function(...args){journeyQA.loads++;return original.apply(this,args);};
      return {version:w.massRuntime.generator.run.version,fatal:__game.crash().fatal};
    });
    log({boot});assert.equal(boot.version,5);assert.equal(boot.fatal,null);
    const welcome=await run(()=>{
      const w=__game.world(),town=w.massRuntime.settlement,start=w.massRuntime.journey.departurePoints[0];
      const dx=town.zone.size.w/2-start.x,dy=town.zone.size.h/2-start.y,len=Math.hypot(dx,dy);
      const point=d=>({x:start.x+dx/len*d,y:start.y+dy/len*d});
      __game.settings().speechTyping=false;w.landPartyAt(point(410));__game.step(3);
      w.landPartyAt(point(120));__game.step(3);
      const panel=document.getElementById('npc-dialogue');
      return {open:!panel.hidden,name:panel.querySelector('h2').textContent,
        blocking:__game.ui.uiBlocking(),receipt:w.ledger['dialogue_seen:mireille_frontier_welcome'],
        scene:w.zone.id,exits:w.exits.length};
    });
    log({welcome});assert.ok(welcome.open);assert.match(welcome.name,/Mireille/);
    assert.equal(welcome.blocking,false);assert.equal(welcome.receipt,1);assert.equal(welcome.exits,0);
    await shot('welcome');
    await run(()=>{
      window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));__game.step(1);
      window.dispatchEvent(new KeyboardEvent('keyup',{key:'Escape',code:'Escape',bubbles:true}));
    });
    const walk=await run(()=>{
      const w=__game.world(),m=w.massRuntime,trail=m.journey.trails[0];
      // One controlled placement at the native edge, then actual input along the
      // full approach, across two signed page boundaries, with AI/combat active.
      w.landPartyAt(trail.points[0]);const times=[];
      for(const target of trail.points.slice(1)){
        let frames=0;
        __game.devInput(()=>({dx:target.x-w.player.pos.x,dy:target.y-w.player.pos.y,aim:target,held:[],edge:[]}));
        while(Math.hypot(target.x-w.player.pos.x,target.y-w.player.pos.y)>18&&frames++<350){
          const t=performance.now();__game.step(1);times.push(performance.now()-t);
        }
        if(frames>=350)throw Error('Native movement stalled on a promised trail '+JSON.stringify({target,pos:w.player.pos}));
      }
      __game.devInput(null);times.sort((a,b)=>a-b);
      const p=m.journey.places[0];journeyQA.place=p.id;
      return {pos:w.player.pos,loads:journeyQA.loads,sameHero:w.player===journeyQA.hero,scenery:m.ecology.stats,
        discovered:m.sites.discovered.some(d=>d.id===p.id),median:times[Math.floor(times.length*.5)],
        p95:times[Math.floor(times.length*.95)],max:times.at(-1),frames:times.length,fatal:__game.crash().fatal};
    });
    log({walk});assert.equal(walk.fatal,null);assert.equal(walk.loads,0);assert.ok(walk.sameHero&&walk.discovered);
    assert.ok(walk.scenery.pieces>0);await shot('camp');
    const cache=await run(()=>{
      const w=__game.world(),c=w.chests.find(c=>c.rewardSource===JSON.stringify([journeyQA.place,'cache']));
      if(!c)throw Error('No cache after native approach');
      const target=c.pos;__game.devInput(()=>({dx:target.x-w.player.pos.x,dy:target.y-w.player.pos.y,aim:target,held:[true],edge:[]}));
      for(let i=0;i<150&&Math.hypot(target.x-w.player.pos.x,target.y-w.player.pos.y)>40;i++)__game.step(1);
      __game.devInput(()=>({dx:0,dy:0,aim:target,held:[true],edge:[]}));
      for(let i=0;i<400&&!c.opened;i++)__game.step(1);
      __game.devInput(null);
      return {opened:c.opened,source:c.rewardSource,life:w.player.life,claims:w.massRuntime.snapshot(w).state.claims.length};
    });
    log({cache});assert.ok(cache.opened);await shot('supplies');
    const survey=await run(()=>{
      __game.ui.toggleMap();__game.step(2);
      const panel=document.getElementById('world-map');
      const searched=panel.textContent.includes('Searched');
      panel.querySelector('[data-mass-zoom="in"]').click();
      const close=panel.textContent.includes('Close detail');
      panel.querySelector('[data-mass-zoom="out"]').click();
      return {searched,close,nearby:panel.textContent.includes('Nearby country'),home:panel.textContent.includes('Lastlight')};
    });
    log({survey});assert.ok(survey.searched&&survey.close&&survey.nearby&&survey.home);await shot('survey');
    const saved=await run(async()=>{
      __game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,200));
      const w=__game.world();return {seed:w.massRuntime.generator.run.seed,pos:{...w.player.pos}};
    });
    await win.loadURL(url);
    const resumed=await run(async source=>{
      for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
      document.querySelector('#sm-continue:not([disabled])')?.click();
      for(let i=0;i<80&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));
      const w=__game.world();w.player.invulnerable=true;__game.step(2);
      return {seed:w.massRuntime?.generator.run.seed,pos:w.player.pos,cache:w.chests.filter(c=>c.rewardSource===source).map(c=>c.opened),
        scenery:w.massRuntime?.ecology?.stats,fatal:__game.crash().fatal};
    },cache.source);
    log({saved,resumed});assert.equal(resumed.fatal,null);assert.equal(resumed.seed,saved.seed);assert.deepEqual(resumed.cache,[true]);
    assert.ok(Math.hypot(saved.pos.x-resumed.pos.x,saved.pos.y-resumed.pos.y)<40);await shot('continued');
    const cohort=await run(()=>{
      window.journeyQA={};
      const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.content==='broken-gate');
      w.landPartyAt(m.journey.local(p));
      let settling=0;
      while(!w.actors.some(a=>a.magicPack?.mechanic==='footfall')&&settling++<120)__game.step(1);
      const members=w.actors.filter(a=>a.magicPack?.mechanic==='footfall'&&!a.dead);
      if(members.length!==4)throw Error('No native landmark cohort: '+JSON.stringify({count:members.length,natives:m.snapshot(w).enemies.length}));
      w.player.invulnerable=true;
      w.landPartyAt({x:members[0].pos.x+60,y:members[0].pos.y});
      let frames=0;
      while(!w.magicPackEffects.some(v=>v.kind==='burst'&&v.warning)&&frames++<600)__game.step(1);
      const labels=[],ctx=__game.renderer.ctx,fill=ctx.fillText;
      ctx.fillText=function(text,...rest){labels.push(String(text));return fill.call(this,text,...rest);};
      try{__game.step(1);}finally{ctx.fillText=fill;}
      journeyQA.cohortNames=members.map(a=>a.name).sort();
      return {count:members.length,warning:w.magicPackEffects.some(v=>v.kind==='burst'&&v.warning),
        frames,names:journeyQA.cohortNames,label:labels.some(s=>s.includes('The Broken Gate')&&s.includes('Site Lv 2')),
        fatal:__game.crash().fatal};
    });
    log({cohort});assert.equal(cohort.count,4);assert.ok(cohort.warning&&cohort.label);assert.equal(cohort.fatal,null);
    await shot('cohort-warning');
    const cohortSave=await run(async()=>{
      __game.save();await new Promise(r=>setTimeout(r,200));return journeyQA.cohortNames;
    });
    await win.loadURL(url);
    const cohortResume=await run(async()=>{
      for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
      document.querySelector('#sm-continue:not([disabled])')?.click();
      for(let i=0;i<80&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));
      window.requestAnimationFrame=()=>0;const w=__game.world();w.player.invulnerable=true;__game.step(2);
      const members=w.actors.filter(a=>!a.dead&&a.magicPack?.mechanic==='footfall');
      return {names:members.map(a=>a.name).sort(),magic:members.every(a=>a.rarity==='magic'),
        firing:w.magicPackEffects.some(v=>v.kind==='burst'&&!v.warning),fatal:__game.crash().fatal};
    });
    log({cohortResume});assert.deepEqual(cohortResume.names,cohortSave);assert.ok(cohortResume.magic&&!cohortResume.firing);
    assert.equal(cohortResume.fatal,null);await shot('cohort-continued');
    // Controlled reward fixture exercises actual bag/recall UI, separate from
    // the critic's unassisted run and its naturally earned rewards.
    const memory=await run(()=>{
      const w=__game.world();w.dropMemoryUnit({...w.player.pos},w.player.pos,{d:'chest'},720,'rough',0,
        {k:'skill',id:'cleave',l:1,r:'magic'});
      w.pickupNearestGear(w.localSeat);__game.ui.toggleInventory();__game.step(2);
      const item=w.meta.items.find(i=>i.mem?.some(u=>u.s===720));if(!item)throw Error('No Memory pickup');
      journeyQA={memoryUid:item.uid};
      const tile=document.querySelector('[data-bag-item][data-item-uid="'+item.uid+'"]');
      const glow=tile.classList.contains('tut-glow');
      tile.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));__game.step(2);
      return {glow,choice:!!document.querySelector('[data-mem-recall]:not([disabled])')};
    });
    log({memory});assert.ok(memory.glow&&memory.choice);await shot('first-memory');
    const recalled=await run(()=>{
      document.querySelector('[data-mem-recall]:not([disabled])').click();__game.step(2);
      const w=__game.world();return {receipt:w.account.ledger.memory_recall_lived,lesson:w.memoryRecallLesson(),
        result:w.memoryRecallLast?.id,fatal:__game.crash().fatal};
    });
    log({recalled});assert.equal(recalled.receipt,1);assert.equal(recalled.lesson,false);assert.equal(recalled.fatal,null);
    log('PASS actual-input trail, native encounters/cache, surveyed circuit, coordinated warnings, durable Continue and first Memory UI');
  }catch(error){log(error.stack||String(error));process.exitCode=1;}
  finally{clearTimeout(timeout);win.destroy();server.close();app.exit(process.exitCode||0);}
});

// Hidden real-client acceptance with isolated saves; no production profile writes.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'commitment-review-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.join(dir,'commitment-review-dist');
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/?worldmass';
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const shot=async name=>{
  const png=await run(()=>{__game.renderer.render(__game.world());return document.getElementById('game').toDataURL();});
  fs.writeFileSync(path.join(dir,'commitment-review-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 const timer=setTimeout(()=>app.exit(1),240000);
 try{
  await win.loadURL('about:blank');console.log('BOOT blank');
  win.webContents.debugger.attach('1.3'); await win.webContents.debugger.sendCommand('Page.enable');
  await win.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument',{source:"window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});"});
  await win.loadURL(url);console.log('BOOT loaded');
  await run(async()=>{await __game.hydrated();});console.log('BOOT hydrated');
  await run(async()=>{
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   for(let i=0;i<200&&!w.nativeWorldReady();i++)await new Promise(r=>setTimeout(r,20));
   if(!w.nativeWorldReady())throw Error('Native scene never ready');
   w.player.invulnerable=true;window.commitmentQA={};
   window.commitmentAdvance=async seconds=>{
    const until=__game.world().time+seconds;
    for(let i=0;i<500&&__game.world().time<until;i++){
     __game.step(6);await new Promise(r=>setTimeout(r,5));
    }
    if(__game.world().time<until)throw Error('Simulation did not advance: '+JSON.stringify(__game.world().massRuntime.nativeReadiness(__game.world())));
   };
   await commitmentAdvance(.25);
  });

  const doors=await run(()=>{
   const w=__game.world(),door=id=>w.doodads.find(d=>d.door?.id.startsWith(id+'#')&&(d.tier??0)===0);
   const inn=door('inn'),house=door('waking_house');commitmentQA.inn=inn;commitmentQA.house=house;
   w.landPartyAt({x:inn.pos.x,y:inn.pos.y+95});w.time=48;
   for(let i=0;i<30;i++)__game.renderer.render(w);
   return {inn:inn.door.cells.w,wakingHouse:house.door.cells.w,guards:w.massRuntime.settlement.defenders.length};
  });
  assert.equal(doors.inn,30);assert.equal(doors.wakingHouse,30);assert.equal(doors.guards,8);await shot('inn-native');
  const entry=await run(async()=>{
   const w=__game.world(),d=commitmentQA.inn;
   try {__game.devInput(()=>({dx:0,dy:-1,aim:{...d.pos},held:[],edge:[]}));await commitmentAdvance(1.6);}
   finally {__game.devInput(null);}
   return {open:d.door.open,y:w.player.pos.y,doorY:d.pos.y};
  });assert.ok(entry.open&&entry.y<entry.doorY);await shot('inn-entered');
  const cleave=await run(async()=>{
   const w=__game.world(),p=w.player;w.landPartyAt({x:700,y:120});await commitmentAdvance(.25);
   p.fillResources();const origin={...p.pos},aim={x:p.pos.x+200,y:p.pos.y};
   if(!w.useSkill(p,p.skills[0],aim,true))throw Error('Cleave refused');const cast=p.casting;
   try {__game.devInput(()=>({dx:1,dy:0,aim:{x:origin.x-200,y:origin.y},held:[],edge:[]}));await commitmentAdvance(.2);}
   finally {__game.devInput(null);}
   return {same:p.casting===cast,origin,pos:{...p.pos},aim:cast.aim,pressed:aim,locked:w.movementLocked(p)};
  });assert.ok(cleave.same&&cleave.locked);assert.deepEqual(cleave.pos,cleave.origin);assert.deepEqual(cleave.aim,cleave.pressed);
  await shot('cleave-committed');await run(async()=>{await commitmentAdvance(1);});
  const stalkers=[];
  for(const id of ['thicket_stalker','marsh_stalker']){
   const result=await run(async id=>{
    const w=__game.world(),p=w.player;w.landPartyAt(w.findFreeSpot({x:700,y:-600},p.radius));await commitmentAdvance(.25);
    const a=w.createMonster(id,1,'enemy');a.pos=w.clampPos({x:p.pos.x+40,y:p.pos.y},a.radius,p.pos);a.aiAnchor={...a.pos};a.facing=Math.PI;w.actors.push(a);
    const start={...a.pos},casts=[],original=w.useSkill;
    w.useSkill=function(caster,skill,...args){const distance=Math.hypot(caster.pos.x-p.pos.x,caster.pos.y-p.pos.y),used=original.call(this,caster,skill,...args);if(used&&caster===a)casts.push({id:skill.def.id,distance});return used;};
    try {__game.devInput(()=>({dx:0,dy:0,aim:{...a.pos},held:[],edge:[]}));await commitmentAdvance(8);}
    finally {w.useSkill=original;__game.devInput(null);}
    commitmentQA.foe=a;
    return {id,casts,distance:Math.hypot(a.pos.x-p.pos.x,a.pos.y-p.pos.y),travel:Math.hypot(a.pos.x-start.x,a.pos.y-start.y),fatal:__game.crash().fatal};
   },id);
   assert.ok(result.casts.some(c=>c.id==='claw'));assert.ok(!result.casts.some(c=>c.id==='closing_fang'));assert.ok(result.distance<65);assert.equal(result.fatal,null);
   stalkers.push(result);await shot(id);await run(()=>{__game.world().kill(commitmentQA.foe,true);});
  }
  const saved=await run(async()=>{
   const w=__game.world();w.landPartyAt({x:700,y:120});await commitmentAdvance(.25);__game.save();await __game.flushRunSave();
   return {seed:w.massRuntime.generator.run.seed,pos:{...w.player.pos},life:w.player.life,guards:w.massRuntime.settlement.defenders.length,
    inn:w.doodads.find(d=>d.door?.id.startsWith('inn#')&&(d.tier??0)===0).door.open};
  });
  await win.loadURL(url);
  const continued=await run(async()=>{
   await __game.hydrated();
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();
   for(let i=0;i<200&&(!__game.world().massRuntime||__game.world().massRuntime.resumePending);i++)await new Promise(r=>setTimeout(r,50));
   __game.ui.hideAll();const w=__game.world();for(let i=0;i<20;i++)__game.renderer.render(w);
   return {seed:w.massRuntime.generator.run.seed,pos:{...w.player.pos},life:w.player.life,guards:w.massRuntime.settlement.defenders.length,
    inn:w.doodads.find(d=>d.door?.id.startsWith('inn#')&&(d.tier??0)===0).door.open};
  });assert.deepEqual(continued,saved);await shot('continued');
  fs.writeFileSync(path.join(dir,'commitment-review-ui.json'),JSON.stringify({doors,entry,cleave,stalkers,saved,continued},null,2));
  console.log('PASS native doors and entry, planted fixed-aim Cleave, both Stalkers fighting in melee, retained guards and browser Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

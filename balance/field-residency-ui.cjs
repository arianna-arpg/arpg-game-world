// Controlled native fields, ordinary walking and actual old/new browser saves.
// This verifies mechanics and pictures, not leisure enjoyment.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),build=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/field-residency-dist');
app.setPath('userData',path.join(dir,'field-residency-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=build;
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const result=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!result.ok)throw Error(result.error);return result.value;
 };
 const shot=async name=>{
  const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,'field-residency-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 const resume=async()=>{
  await win.loadURL(url);
  return run(async()=>{
   window.requestAnimationFrame=()=>0;
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();
   const w=__game.world(),m=w.massRuntime;
   return {fields:m.fields.snapshot(),config:m.config,pos:{...w.player.pos},fatal:__game.crash().fatal};
  });
 };
 const timer=setTimeout(()=>app.exit(1),240000),results=[];
 try{
  await win.loadURL(url);
  await run(()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.devStartRun('warrior');__game.ui.hideAll();});
  for(const [id,seed,x,y,stat] of [
   ['red-cairn',42,1630.9411071613429,-13141.098556928337,'lifeLeech'],
   ['mending-hollow',42,15011.433235313743,-12689.516675490886,'lifeRegen'],
   ['still-circle',713,1567.06181647256,-6379.099737070501,'moveSpeed'],
  ]){
   const before=await run((id,seed,x,y,stat)=>{
    const w=__game.world();w.startWorldMass(seed);w.player.invulnerable=true;
    const m=w.massRuntime,p=m.placesInCell(m.walk.at(x,y)).find(p=>p.content===id);
    if(!p)throw Error('Missing generated '+id);
    w.landPartyAt({x,y});m.update(w,true);
    const a=w.altars.find(a=>a.massSource?.includes(p.id.slice(1,-1))&&a.def.id.includes(id==='red-cairn'?'blood':id==='still-circle'?'still':'mending'))
      ||w.altars.find(a=>Math.hypot(a.pos.x-x,a.pos.y-y)<5);
    if(!a)throw Error('No generated native field');
    window.__fieldQA={source:a.massSource,pos:{...a.pos},id,stat};
    for(const e of w.actors)if(e.team==='enemy'){e.skills=[];}
    const foe=w.createMonster('zombie',a.level,'enemy');foe.skills=[];foe.pos={x:a.pos.x+60,y:a.pos.y};w.actors.push(foe);
    window.__fieldQA.foe=foe.id;
    w.landPartyAt({x:a.pos.x,y:a.pos.y+230});__game.step(1);
    const read=()=>({hero:w.player.sheet.get(stat),foe:foe.sheet.get(stat),heroY:w.player.pos.y});
    if(a.def.mend){w.player.life=20;foe.life=10;a.mendTimer=.6;}
    return {...read(),source:a.massSource,level:a.level,pos:a.pos,foeLife:foe.life,heroLife:w.player.life};
   },id,seed,x,y,stat);
   win.webContents.sendInputEvent({type:'keyDown',keyCode:'W'});await new Promise(r=>setTimeout(r,40));
   const inside=await run(()=>{
    __game.step(50);const w=__game.world(),q=window.__fieldQA,foe=w.actors.find(a=>a.id===q.foe);
    return {hero:w.player.sheet.get(q.stat),foe:foe.sheet.get(q.stat),heroY:w.player.pos.y,heroLife:w.player.life,foeLife:foe.life,
      fatal:__game.crash().fatal,source:w.altars.find(a=>a.massSource===q.source)?.massSource};
   });
   win.webContents.sendInputEvent({type:'keyUp',keyCode:'W'});await new Promise(r=>setTimeout(r,40));
   assert.equal(inside.fatal,null);assert.equal(inside.source,before.source);assert.ok(inside.heroY<before.heroY-50);
   if(id==='red-cairn')assert.ok(inside.hero>=.06&&inside.foe>=.06);
   if(id==='still-circle')assert.ok(inside.hero<before.hero&&inside.foe>0);
   if(id==='mending-hollow')assert.ok(inside.heroLife>before.heroLife&&inside.foeLife>before.foeLife);
   await shot(id);results.push({id,before,inside});
  }
  const dormant=await run(async()=>{
   const w=__game.world(),m=w.massRuntime,q=window.__fieldQA;
   for(const a of w.actors)if(a!==w.player)a.dead=true;
   w.landPartyAt({x:q.pos.x+6000,y:q.pos.y+6000});m.update(w,true);
   __game.save();await new Promise(r=>setTimeout(r,250));
   return {fields:m.fields.snapshot(),config:m.config,pos:{...w.player.pos},source:q.source,returnPos:q.pos};
  });
  const continued=await resume();assert.equal(continued.fatal,null);
  for(const key of ['fields','config','pos'])assert.deepEqual(continued[key],dormant[key]);
  const returned=await run((source,pos)=>{
   const w=__game.world(),m=w.massRuntime;w.landPartyAt(pos);m.update(w,true);__game.step(1);
   return {count:w.altars.filter(a=>a.massSource===source).length,fatal:__game.crash().fatal};
  },dormant.source,dormant.returnPos);
  assert.equal(returned.count,1);assert.equal(returned.fatal,null);
  // Produce the old descriptor in the real committed v6 browser, on this same isolated origin.
  root=path.resolve(__dirname,'reports','walking-final-dist');await win.loadURL(url);
  const old=await run(async()=>{
   window.requestAnimationFrame=()=>0;__game.devStartRun('warrior');__game.ui.hideAll();
   const w=__game.world();w.startWorldMass(42);const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='memorial-grove');
   w.landPartyAt(m.journey.local(p));m.update(w,true);
   w.altars.find(a=>a.def.mend).mendTimer=.71;
   __game.save();await new Promise(r=>setTimeout(r,250));
   return {fields:m.fields.snapshot(),config:m.config,pos:{...w.player.pos}};
  });assert.equal(old.config.terrain.version,6);assert.equal(old.config.fieldResidency,undefined);
  root=build;const legacy=await resume();assert.equal(legacy.fatal,null);delete legacy.fatal;
  assert.deepEqual(legacy,old);
  fs.writeFileSync(path.join(dir,'field-residency-ui.json'),JSON.stringify({results,dormant,continued,returned,legacy},null,2));
  console.log(JSON.stringify(results));
  console.log('PASS generated native fields, ordinary walking, both-team effects, dormant browser Continue and unchanged actual v6 save');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

// Real mouse/keyboard movement priority, in an isolated controlled client.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1';
const label='movement-priority'+(legacy?'-legacy':'');
app.setPath('userData',path.join(dir,label+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/movement-priority-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const input=async(...events)=>{for(const e of events)win.webContents.sendInputEvent(e);await new Promise(r=>setTimeout(r,40));await run(()=>true);};
 const shot=async name=>{
  const png=await run(()=>document.getElementById('game').toDataURL());
  fs.writeFileSync(path.join(dir,label+'-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 const step=async frames=>run(frames=>{
  const w=__game.world(),q=window.walkPriorityQA;
  for(let i=0;i<frames;i++){
   __game.step(1);q.frames++;
   if(q.firstMove===null&&Math.hypot(w.player.pos.x-q.origin.x,w.player.pos.y-q.origin.y)>.01)q.firstMove=q.frames;
  }
  return {casts:q.casts,frames:q.frames,firstMove:q.firstMove,pos:{...w.player.pos},origin:q.origin,
   skill:w.player.casting?.inst.def.id??null,sameCast:w.player.casting===q.initial,
   elapsed:w.player.casting?.elapsed,mana:w.player.mana,fatal:__game.crash().fatal};
 },frames);
 const timer=setTimeout(()=>app.exit(1),180000);
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);win.webContents.focus();
  await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
   __game.devStartRun('magician');__game.ui.hideAll();
   const w=__game.world();w.startWorldMass(42);const C=w.massRuntime.constructor,c=JSON.parse(JSON.stringify(w.massRuntime.config));
   delete c.settlement;delete c.journey;delete c.progression;delete c.ecology;
   delete c.terrain.patches;
   c.terrain.fields=[];c.terrain.places=[];c.content=[];c.populationRadius=0;c.startRadius=0;c.maxPopulation=0;
   c.terrain.surfaces=[{id:'floor',source:'qa/walk-floor',priority:0,when:[],region:'ground',biome:'downs',color:'#454b32'}];
   new C(42,'walk-input-client',c).attach(w);w.landPartyAt({x:-4000,y:-4000});__game.step(2);
   window.walkPriorityQA={origin:{...w.player.pos},frames:0,casts:[],firstMove:null,initial:null};
   const use=w.useSkill;w.useSkill=function(a,s,...args){const ok=use.call(this,a,s,...args);
    if(ok&&a===w.player)walkPriorityQA.casts.push({skill:s.def.id,frame:walkPriorityQA.frames});return ok;};
  });
  await input({type:'mouseMove',x:900,y:400},{type:'mouseDown',button:'left',x:900,y:400,clickCount:1});
  const primary=await step(5);assert.equal(primary.skill,'firebolt');
  await run(()=>{walkPriorityQA.initial=__game.world().player.casting;});
  await input({type:'keyDown',keyCode:'D'});
  const committed=await step(5);assert.ok(committed.sameCast);assert.ok(committed.elapsed>primary.elapsed);await shot('committed');
  const samples=[];
  for(let i=0;i<7;i++){samples.push(await step(20));if(i===1||i===6)await shot('walking-'+i);}
  const walking=samples.at(-1),distance=walking.pos.x-walking.origin.x;
  console.log(JSON.stringify({legacy,distance,walking}));
  assert.equal(walking.fatal,null);
  if(legacy){assert.ok(walking.casts.length>=3);assert.ok(distance<160);}
  else{
   assert.equal(walking.casts.length,1);assert.ok(distance>220);
   await input({type:'keyUp',keyCode:'D'});
   const resumed=await step(5);assert.equal(resumed.skill,'firebolt');assert.equal(resumed.casts.length,2);
   await input({type:'keyDown',keyCode:'D'});await step(80);
   await input({type:'mouseUp',button:'left',x:900,y:400,clickCount:1});
   await step(1);
   await input({type:'mouseDown',button:'left',x:900,y:400,clickCount:1});
   const fresh=await step(5);assert.equal(fresh.skill,'firebolt');assert.equal(fresh.casts.length,3);await shot('fresh-attack');
   samples.push(resumed,fresh);
  }
  await input({type:'keyUp',keyCode:'D'},{type:'mouseUp',button:'left',x:900,y:400,clickCount:1});
  const settled=await step(100);assert.equal(settled.skill,null);assert.equal(settled.fatal,null);
  fs.writeFileSync(path.join(dir,label+'-ui.json'),JSON.stringify({primary,committed,samples,settled,distance,legacy},null,2));
  console.log('PASS '+(legacy?'prior build reproduces repeated cast movement starvation':'native walk supersedes older repeats after commitment; release and fresh attack retain their priorities'));
 }catch(e){console.error(e.stack||e);process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

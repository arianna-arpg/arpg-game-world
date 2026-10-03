// Native post-contract guidance and exact Continue, separate from leisure review.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'upcoming-work-before':'upcoming-work';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/upcoming-work-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port,win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const shot=async name=>{
  await run(()=>__game.renderer.render(__game.world()));
  const png=await run(()=>document.getElementById('game').toDataURL());fs.writeFileSync(path.join(dir,tag+'-'+name+'-canvas.png'),Buffer.from(png.split(',')[1],'base64'));
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
 };
 const boot=async()=>run(async()=>{
  window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
 });


 const timer=setTimeout(()=>app.exit(1),200000),results=[];
 const stable=()=>run(()=>{const w=__game.world();return {seed:w.massRuntime.generator.run.seed,level:w.player.level,xp:w.meta.xp,points:w.meta.passivePoints,quests:w.activeQuests,completed:[...w.completedQuests],prompt:w.questGiverPrompt()};});
 const read=()=>run(()=>{
  const root=document.getElementById('npc-dialogue');
  return {open:!root.hidden,text:root.querySelector('.dialogue-accessible').textContent,ink:root.querySelector('.dialogue-ink').textContent,fatal:__game.crash().fatal};
 });
 const seekPage=async()=>{
  const pages=[];
  for(let i=0;i<30;i++){
   const s=await read();assert.equal(s.fatal,null);
   if(s.open){
    pages.push(s.text);
    if((legacy?/No hunts are posted/:/Return at level 3/).test(s.text)){
     if(s.ink!==s.text)await run(()=>{document.querySelector('.dialogue-next').click();__game.step(1);});
     return {pages,found:await read()};
    }
    await run(()=>{document.querySelector('.dialogue-next').click();__game.step(2);});
   }else await run(()=>__game.step(30));
  }
  throw Error('Expected native guidance page missing: '+JSON.stringify(pages));
 };
 try{
  await win.loadURL(url);await boot();
  await run(()=>{
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;
   const m=w.massRuntime,npc=w.actors.find(a=>a.defId==='townsfolk_innkeep');
   w.landPartyAt(npc.pos,{tier:npc.tier});__game.step(210);
   if(!w.activeQuests.some(q=>q.questId==='frontier_western_watch'))throw Error('No initial contract');
   const p=m.journey.places.find(p=>p.recipe==='west-camp');w.landPartyAt(m.journey.local(p));m.update(w,true);
   for(let i=0;i<2;i++)w.kill(m.natives.get(JSON.stringify([p.id,i])),false,w.player);
   m.update(w,true);w.landPartyAt(npc.pos,{tier:npc.tier});__game.step(210);
   __game.ui.hideAll();__game.ui.openMapTab('quests');__game.step(1);
   const b=document.querySelector('[data-quest-reward][data-reward-choice="spring"]');if(!b)throw Error('No native ring reward');b.click();__game.step(1);__game.ui.hideAll();
  });
  const paid=await stable();assert.equal(paid.level,2);assert.ok(paid.completed.includes('frontier_western_watch'));assert.equal(paid.quests.length,0);
  assert.match(paid.prompt,legacy?/No hunts are posted/:/Return at level 3/);
  const page=await seekPage();await shot('waiting');results.push({paid,page});
  await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,220));});const saved=await stable();
  await win.loadURL(url);await boot();await run(async()=>{for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));document.querySelector('#sm-continue:not([disabled])').click();__game.ui.hideAll();});
  assert.deepEqual(await stable(),saved);
  await run(()=>{const w=__game.world();w.grantXp(w.meta.xpNeeded-w.meta.xp);__game.step(210);__game.ui.openMapTab('quests');__game.step(1);});
  const eligible=await stable();assert.equal(eligible.level,3);assert.ok(eligible.quests.some(q=>q.questId==='frontier_northern_watch'));
  await shot('offered');results.push({continuedExactly:true,eligible});
  console.log(JSON.stringify(results));fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log(legacy?'PASS previous native paid contract leaves a no-work response before the later offer':
   'PASS native first-contract return and ring choice, real future-level guidance page, unchanged pending eligibility and exact Continue into level-three offer');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

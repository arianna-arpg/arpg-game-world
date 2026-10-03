// Controlled native contract bearings in the real renderer, separate from ordinary play.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'quest-compass-before':'quest-compass';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/quest-compass-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const shot=async name=>{
  const png=await run(()=>document.getElementById('game').toDataURL());fs.writeFileSync(path.join(dir,tag+'-'+name+'-canvas.png'),Buffer.from(png.split(',')[1],'base64'));
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
 };
 const instrument=()=>{
  const r=__game.renderer,w=__game.world(),settings=r.getSettings;window.compassQA={scale:1};
  r.getSettings=()=>({...settings?.(),uiScale:compassQA.scale,noticeAnchor:'topLeft'});
  compassQA.measure=()=>{
   const before=JSON.stringify([w.time,w.activeQuests,[...w.completedQuests],w.player.pos,w.player.life,w.player.mana,w.meta.xp,w.massRuntime?.state.snapshot(),w.actors.map(a=>a.id)]),rows=[];
   const ctx=r.ctx,fill=ctx.fillText,measure=ctx.measureText,header=r.drawHudStatus,feed=r.drawNoticeFeed;let group='';
   ctx.fillText=function(text,x,y,...rest){
    if(group){
     const b=measure.call(this,String(text)),t=ctx.getTransform();
     rows.push({group,text:String(text),left:t.a*(x-b.actualBoundingBoxLeft)+t.e,right:t.a*(x+b.actualBoundingBoxRight)+t.e,
      top:t.d*(y-b.actualBoundingBoxAscent)+t.f,bottom:t.d*(y+b.actualBoundingBoxDescent)+t.f,color:ctx.fillStyle});
    }return fill.call(this,text,x,y,...rest);
   };
   r.drawHudStatus=function(...a){group='status';try{return header.apply(this,a);}finally{group='';}};
   r.drawNoticeFeed=function(...a){group='notice';try{return feed.apply(this,a);}finally{group='';}};
   try{r.render(w);}finally{ctx.fillText=fill;r.drawHudStatus=header;r.drawNoticeFeed=feed;}
   return {rows,same:before===JSON.stringify([w.time,w.activeQuests,[...w.completedQuests],w.player.pos,w.player.life,w.player.mana,w.meta.xp,w.massRuntime?.state.snapshot(),w.actors.map(a=>a.id)]),
    fatal:__game.crash().fatal,quests:w.activeQuests,pos:{...w.player.pos}};
  };
 };
 const inspect=async()=>{
  const data=await run(()=>compassQA.measure());assert.ok(data.same);assert.equal(data.fatal,null);
  return {...data,cues:data.rows.filter(r=>/^[→↘↓↙←↖↑↗◆] /.test(r.text))};
 };
 const stable=()=>{const w=__game.world();return {pos:w.player.pos,quests:w.activeQuests,completed:[...w.completedQuests],seed:w.massRuntime.generator.run.seed};};
 const checkpoint=async()=>{
  await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,220));});
  const saved=await run(stable),cues=(await inspect()).cues;
  await win.loadURL(url);await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No Continue');b.click();__game.ui.hideAll();
  });await run(instrument);
  assert.deepEqual(await run(stable),saved);assert.deepEqual((await inspect()).cues,cues);
 };
 const timer=setTimeout(()=>app.exit(1),240000),results=[];
 try{
  await win.loadURL(url);await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;
   const npc=w.actors.find(a=>a.defId==='townsfolk_innkeep');w.landPartyAt(npc.pos,{tier:npc.tier});__game.step(240);__game.ui.hideAll();
  });await run(instrument);
  let data=await inspect();assert.equal(data.quests.length,1);assert.equal(data.cues.length,legacy?0:1);
  if(!legacy)assert.match(data.cues[0].text,/← Cinderwatch Camp/);results.push({stage:'accepted',...data});await shot('accepted');await checkpoint();
  await run(()=>{__game.world().activeQuests[0].directionsKnown=false;});assert.equal((await inspect()).cues.length,0);
  await run(()=>{__game.world().activeQuests[0].directionsKnown=true;});
  const orientation=await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.id===w.activeQuests[0].placeId),at=m.journey.local(p);
   w.player.pos={x:at.x-1000,y:at.y};return compassQA.measure();
  });
  if(!legacy)assert.ok(orientation.rows.some(r=>r.text==='→ Cinderwatch Camp'));results.push({stage:'opposite-side',...orientation});
  await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.id===w.activeQuests[0].placeId);
   w.landPartyAt(m.journey.local(p));m.update(w,true);
  });
  data=await inspect();if(!legacy)assert.match(data.cues[0].text,/^◆ Cinderwatch Camp · nearby$/);
  results.push({stage:'arrival',...data});await shot('arrival');
  await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.id===w.activeQuests[0].placeId);
   for(const i of [0,1])w.kill(m.natives.get(JSON.stringify([p.id,i])),false,w.player);
   m.update(w,true);w.notices=[];w.notice('The original garrison has fallen. Return to Mireille at the Lastlight inn for your reward.','#ffcd7a',18,'civic');
  });
  data=await inspect();assert.ok(data.quests[0].fieldDone);if(!legacy)assert.match(data.cues[0].text,/Return to Mireille/);
  results.push({stage:'return',...data});await shot('return');await checkpoint();
  win.setSize(800,600);await new Promise(r=>setTimeout(r,200));
  await run(()=>{compassQA.scale=1.5;__game.renderer.resize();
   __game.world().notice('Return to Mireille at the Lastlight inn to claim the promised reward.','#ffcd7a',18,'civic');
  });
  data=await inspect();
  const status=data.rows.filter(r=>r.group==='status'),notices=data.rows.filter(r=>r.group==='notice');
  const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  assert.ok(data.cues.every(c=>c.left>=0&&c.right<=800&&c.top>=0&&c.bottom<=600));
  assert.ok(notices.length>0,'narrow-view collision check has a live announcement');
  assert.ok(!notices.some(n=>status.some(s=>overlaps(n,s))),'compass extent remains reserved from announcements');
  results.push({stage:'narrow-return',...data});await shot('narrow-return');
  win.setSize(1280,850);await new Promise(r=>setTimeout(r,200));await run(()=>{compassQA.scale=1;__game.renderer.resize();});
  await run(()=>{
   const w=__game.world(),npc=w.actors.find(a=>a.defId==='townsfolk_innkeep');w.player.invulnerable=true;
   w.landPartyAt(npc.pos,{tier:npc.tier});__game.step(210);__game.ui.hideAll();__game.ui.openMapTab('quests');__game.step(1);
   const button=document.querySelector('[data-quest-reward][data-reward-choice="spring"]');if(!button)throw Error('Missing native reward choice');
   button.click();__game.ui.hideAll();
  });
  data=await inspect();assert.equal(data.quests.length,0);assert.equal(data.cues.length,0);
  results.push({stage:'paid',...data});await checkpoint();
  await run(()=>{const w=__game.world();w.massRuntime=null;w.loadZone('lastlight');__game.ui.hideAll();});
  assert.equal((await inspect()).cues.length,0,'ordinary graph play has no borrowed continuous bearings');
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(r=>({stage:r.stage,cues:r.cues?.map(c=>c.text)}))));
  console.log(legacy?'PASS previous client lacks accepted and return bearings':'PASS accepted, arrival, return and paid bearings, undisclosed directions, live compass reversal, narrow HUD/news separation, read-only drawing and three exact browser checkpoints');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

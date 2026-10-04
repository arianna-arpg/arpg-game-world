// Prepared native dialogue/Journal fixture. Not an earned playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag=process.env.HOLLOW_WAKE_QA_TAG||'skill-preparation';
app.setPath('userData',path.join(dir,tag+'-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const current=path.resolve(process.env.HOLLOW_WAKE_QA_DIST||path.join(dir,'skill-preparation-dist')),prior=path.resolve(dir,'light-sight-dist');let root=current;
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
 const boot=()=>run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));});
 const state=()=>{const w=__game.world(),m=w.massRuntime;return {seed:m.generator.run.seed,pos:{...w.player.pos},life:w.player.life,
  bag:JSON.parse(JSON.stringify(w.meta.items)),bar:w.player.skills.map(s=>s&&[s.def.id,s.level,s.rarity,s.sockets]),charges:[...w.player.charges].filter(([,n])=>n!==0).sort(([a],[b])=>a.localeCompare(b)),
  quests:JSON.parse(JSON.stringify(w.activeQuests)),ledger:{...w.ledger},memory:{...w.account.skillSlotMemory},
  lesson:w.mireilleGiftLesson(),subjects:w.mireilleLessonSkills(),claims:m.state.snapshot().claims};};
 const rows=[];
 const shot=async name=>{
  const r=await run(()=>{
   const w=__game.world(),p=document.getElementById('world-map'),read=()=>JSON.stringify([w.meta.items,w.player.skills.map(s=>s?.def.id),w.ledger,[...w.player.charges],w.time,w.massRuntime.state.snapshot()]);
   const before=read();__game.ui.refreshMap();__game.renderer.render(w);const boxes=[...document.querySelectorAll('[data-prepare-skill],.dialogue-choices button')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>{
    const b=e.getBoundingClientRect();const c=e.closest('.dialogue-layout')?.getBoundingClientRect();return {text:e.textContent,disabled:e.disabled,x:b.x,y:b.y,right:b.right,bottom:b.bottom,clip:c&&{top:c.top,bottom:c.bottom}};});
   return {same:before===read(),fatal:__game.crash().fatal,width:innerWidth,height:innerHeight,boxes,dialogue:document.getElementById('npc-dialogue').innerText,
    journal:p.innerText,canvas:document.getElementById('game').toDataURL()};
  });
  assert.equal(r.fatal,null);assert.ok(r.same);
  for(const b of r.boxes){if(b.clip)assert.ok(b.y>=b.clip.top-.1&&b.bottom<=b.clip.bottom+.1,'response clipped: '+JSON.stringify(b));assert.ok(b.x>=0&&b.right<=r.width+.1&&b.y>=0&&b.bottom<=r.height+.1,JSON.stringify(b));}
  fs.writeFileSync(path.join(dir,tag+'-'+name+'-canvas.png'),Buffer.from(r.canvas.split(',')[1],'base64'));
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
  delete r.canvas;rows.push({name,...r});console.log('CAPTURE '+name);return r;
 };
 const save=async()=>{await run(async()=>{__game.ui.hideAll();__game.world().massRuntime.update(__game.world(),true);__game.save();await new Promise(r=>setTimeout(r,250));});return run(state);};
 const resume=async()=>{
  await win.loadURL(url);await boot();await run(async()=>{
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('Continue absent');b.click();__game.ui.hideAll();
  });return run(state);
 };
 const journal=()=>run(()=>{__game.ui.hideAll();__game.ui.openMapTab('quests');});
 const timer=setTimeout(()=>app.exit(1),240000);
 try{
  await win.loadURL(url);await boot();await run(()=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const a=w.actors.find(a=>a.defId==='townsfolk_innkeep');w.landPartyAt({x:a.pos.x+50,y:a.pos.y+40});
   for(let i=0;i<120;i++)__game.step(1);
  });
  assert.equal((await run(state)).lesson,'learn');
  await run(()=>{
   const rows=[];for(let i=0;i<8;i++){const w=__game.world(),b=document.querySelector('#npc-dialogue .dialogue-next');rows.push({text:document.querySelector('.dialogue-accessible').textContent,choice:document.querySelector('.dialogue-choices').innerHTML,hidden:document.getElementById('npc-dialogue').hidden,lines:w.npcSpeechView(false).map(l=>l.text)});if(document.querySelector('.dialogue-choices:not([hidden]) button'))break;if(b&&!b.hidden)b.click();__game.step(1);}
   return rows;
  });
  const intro=await shot('conversation');
  assert.ok(intro.boxes.some(b=>b.text==='Flasks & contracts'));
  win.setSize(600,650);await new Promise(r=>setTimeout(r,150));await shot('conversation-narrow');
  win.setSize(1280,850);await new Promise(r=>setTimeout(r,150));
  await run(()=>[...document.querySelectorAll('.dialogue-choices button')].find(b=>b.textContent==='Flasks & contracts').click());
  assert.equal((await shot('ready')).boxes.filter(b=>b.text.startsWith('Place on')).length,2);
  await run(()=>document.querySelector('[data-quest-accept]').click());
  const unprepared=await run(()=>{const w=__game.world(),a=w.actors.find(a=>a.defId==='townsfolk_innkeep');
    return {lesson:w.mireilleGiftLesson(),quests:w.activeQuests.length,authored:w.npcDialogues.dwell(a)?.def.id,
      cue:w.speechCandidates(w.localSeat).find(c=>c.a===a)?.text,work:w.questGiverPrompt()};});
  assert.equal(unprepared.lesson,'learn');assert.equal(unprepared.quests,1);
  assert.notEqual(unprepared.authored,'mireille_flask_preparation');assert.ok(unprepared.cue.includes(unprepared.work));
  await shot('work-unprepared');
  win.setSize(600,650);await new Promise(r=>setTimeout(r,150));await run(()=>__game.ui.refreshMap());await shot('narrow');
  win.setSize(1280,850);await new Promise(r=>setTimeout(r,150));await run(()=>__game.ui.refreshMap());
  await run(()=>document.querySelector('[data-prepare-skill]').click());
  assert.equal((await run(state)).subjects.join(','),'mana_flask');await shot('one-placed');
  const partial=await save();assert.deepEqual(await resume(),partial);await journal();await shot('partial-continue');
  // A retained real button cannot replace a different skill that took its seat.
  const stale=await run(()=>{
   const w=__game.world(),b=document.querySelector('[data-prepare-skill]'),slot=Number(b.dataset.prepareSlot);
   if(!w.swapSkillSlots(0,slot))throw Error('Prepared slot occupation refused');
   const read=()=>JSON.stringify([w.meta.items,w.player.skills.map(s=>s?.def.id)]),before=read();b.click();
   const same=before===read();w.swapSkillSlots(slot,0);__game.ui.refreshMap();return {same};
  });assert.ok(stale.same);
  await run(()=>document.querySelector('[data-prepare-skill]').click());
  await run(()=>{__game.ui.hideAll();__game.step(3);});
  assert.equal((await run(state)).lesson,null);await shot('full-bar');
  const currentState=await save();assert.deepEqual(await resume(),currentState);await shot('current-continue');
  root=prior;assert.deepEqual(await resume(),currentState);await shot('prior-continue');
  root=current;assert.deepEqual(await resume(),currentState);await shot('current-again');
  await journal();
  assert.equal((await run(state)).quests.length,1);await shot('contract');
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify({rows,partial,currentState,stale},null,2));
  console.log('PASS native dwell, actual dialogue/Journal placements, 600px controls, stale empty-seat refusal, partial and exact current/prior/current Continue, native contract');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

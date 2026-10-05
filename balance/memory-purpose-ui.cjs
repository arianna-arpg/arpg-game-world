// Controlled fixtures exercise native pickup and recall UI; not earned gameplay.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag=process.env.HOLLOW_WAKE_QA_TAG||'memory-purpose';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/memory-purpose-dist');
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
const current=root,timer=setTimeout(()=>app.exit(1),180000),results=[];
 const state=()=>{const w=__game.world();return {items:w.meta.items,pos:w.player.pos,life:w.player.life,seed:w.massRuntime.generator.run.seed};};
 const save=async()=>{await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,250));});return run(state);};
 const resume=async()=>{await win.loadURL(url);await boot();await run(async()=>{
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No native Continue');b.click();__game.ui.hideAll();
 });return run(state);};
 const hover=async uid=>run(uid=>{
  const w=__game.world(),before=JSON.stringify([w.meta.items,w.player.pos,w.player.life,w.time]);__game.ui.hideAll();__game.ui.toggleInventory();
  const inventory=document.getElementById('inventory'),el=inventory.querySelector('[data-item-uid="'+uid+'"]');
  inventory.dispatchEvent(new MouseEvent('mouseout',{bubbles:true}));const r=el.getBoundingClientRect();
  el.dispatchEvent(new MouseEvent('mouseover',{bubbles:true,clientX:r.x+8,clientY:r.y+8}));
  const t=document.getElementById('tooltip'),b=t.getBoundingClientRect();
  return {text:t.textContent,inside:b.x>=0&&b.y>=0&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1,
   pure:before===JSON.stringify([w.meta.items,w.player.pos,w.player.life,w.time])};
 },uid);
 const open=async uid=>run(uid=>{
  const w=__game.world(),before=JSON.stringify(w.meta.items),el=document.querySelector('#inventory [data-item-uid="'+uid+'"]');
  el.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,button:0}));
  const p=document.getElementById('recall-menu'),r=p.getBoundingClientRect();
  return {open:!p.classList.contains('hidden'),pure:before===JSON.stringify(w.meta.items),text:p.textContent,
   blocked:[...p.querySelectorAll('[data-mem-recall]')].every(b=>b.disabled),inside:r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1};
 },uid);
 try{
  await win.loadURL(url);await boot();await run(()=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='memorial-grove'),q=m.journey.local(p);
   w.landPartyAt({x:q.x,y:q.y+290});m.update(w,true);
   window.qaPouches=['rough','preformed'].map((kind,i)=>({uid:99101+i,baseId:kind+'_memory',ilvl:1,tier:1,rarity:'common',name:kind==='rough'?'Rough Memory':'Preformed Memory',baseRoll:0,implicitRolls:[],affixes:[],mem:[{d:'chest',s:6400+i},{d:'chest',s:6500+i}]}));
   w.drops.push(...qaPouches.map((item,i)=>({item:{kind:'gear',item},pos:{x:w.player.pos.x+(i?110:-110),y:w.player.pos.y+100},bob:0,tier:w.player.tier,grace:0})));
  });
  const ground=await run(()=>{
   const w=__game.world(),ctx=__game.renderer.ctx,fill=ctx.fillText,texts=[],before=JSON.stringify([w.drops,w.meta.items,w.player.pos,w.time]);
   ctx.fillText=function(t,x,y,...rest){if(String(t).includes('Unrevealed'))texts.push({text:t,color:ctx.fillStyle});return fill.call(this,t,x,y,...rest);};
   try{__game.renderer.render(w);}finally{ctx.fillText=fill;}
   return {texts,pure:before===JSON.stringify([w.drops,w.meta.items,w.player.pos,w.time]),fatal:__game.crash().fatal};
  });
  assert.deepEqual(ground.texts.map(t=>t.text),['Unrevealed gem','Unrevealed skill']);
  assert.deepEqual(ground.texts.map(t=>t.color),['#b89ae0','#e8c07a']);assert.ok(ground.pure);assert.equal(ground.fatal,null);
  await shot('ground');results.push({ground});
  const pickup=await run(()=>{
   const w=__game.world();for(const item of qaPouches){const d=w.drops.find(d=>d.item.kind==='gear'&&d.item.item.uid===item.uid);d.pos={...w.player.pos};w.pickupNearestGear(w.localSeat);}
   return {uids:w.meta.items.filter(i=>i.mem).map(i=>i.uid),feed:w.pickupFeed};
  });
  assert.deepEqual(pickup.uids,[99101,99102]);assert.ok(JSON.stringify(pickup.feed).includes('Unrevealed skill'));results.push({pickup});
  const h=await hover(99102);assert.ok(h.text.includes('reveal a skill gem'));assert.ok(h.inside&&h.pure);await shot('tooltip');
  const o=await open(99102);assert.ok(o.open&&o.pure&&o.blocked&&o.inside);await shot('choice');results.push({h,o});
  win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await run(()=>__game.ui.folioSync());await shot('narrow');
  const reveal=await run(()=>{
   const w=__game.world(),before=JSON.stringify(w.meta.items);document.querySelector('[data-mem-facet]').click();
   if(before!==JSON.stringify(w.meta.items))throw Error('Facet selection consumed a memory');
   const b=document.querySelector('[data-mem-recall]');if(b.disabled)throw Error('Native recall refused');b.click();
   const got=w.memoryRecallLast;if(!got)throw Error('No native grant');window.qaGot=got;
   return {got,left:w.meta.items.find(i=>i.uid===99102).mem.length,button:!!document.querySelector('[data-mem-find="'+got.itemUid+'"]'),text:document.getElementById('recall-menu').textContent,visualIcon:!!document.querySelector('#recall-menu svg path')};
  });
  assert.equal(reveal.left,1);assert.equal(reveal.got.kind,'skill');assert.ok(reveal.button);assert.ok(reveal.visualIcon,'native revealed Memory uses visual artwork');await shot('revealed');results.push({reveal});
  const stale=await run(()=>{
   const w=__game.world(),uid=qaGot.itemUid,index=w.meta.items.findIndex(i=>i.uid===uid),item=w.meta.items.splice(index,1)[0];
   document.querySelector('[data-mem-find="'+uid+'"]').click();const unchanged=__game.ui.recallOpen;
   w.meta.items.splice(index,0,item);__game.ui.refreshRecall();return unchanged;
  });assert.ok(stale,'a disappeared grant cannot navigate the bag');
  await run(()=>document.querySelector('[data-mem-find="'+qaGot.itemUid+'"]').click());
  assert.ok(await run(()=>!__game.ui.recallOpen&&__game.ui.inventoryOpen&&!!document.querySelector('#inventory [data-item-uid="'+qaGot.itemUid+'"].memflash')));
  await shot('bag');
  win.setSize(1280,850);await new Promise(r=>setTimeout(r,150));await run(()=>__game.ui.folioSync());
  const rough=await hover(99101);assert.ok(rough.text.includes('skill or support gem'));assert.ok(rough.pure&&rough.inside);await shot('rough');
  const saved=await save();assert.deepEqual(await resume(),saved);assert.ok((await hover(99102)).text.includes('reveal a skill gem'));await shot('continued');
  root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_PRIOR||'balance/reports/proc-reference-dist');assert.deepEqual(await resume(),saved);const old=await hover(99102);if(!process.env.HOLLOW_WAKE_QA_PRIOR)assert.ok(!old.text.includes('reveal a skill gem'));await shot('prior');
  root=current;assert.deepEqual(await resume(),saved);const returned=await hover(99102);assert.ok(returned.text.includes('reveal a skill gem'));await shot('returned');
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify({results,stale,sameSave:true},null,2));
  console.log('PASS native Memory pickup, full/narrow explanation, facet/refusal/one-unit recall, exact-grant bag handoff, stale grant and current/prior/current Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

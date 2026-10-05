// Controlled preference integration. No claim of an ordinary-input playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag=process.env.HOLLOW_WAKE_QA_TAG||'conversation-r59';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/conversation-r59-dist');
 const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{const out=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!out.ok)throw Error(out.error);return out.value;};
 const boot=async()=>{await win.loadURL(url);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>window.qaPad?[window.qaPad]:[],configurable:true});await new Promise(r=>setTimeout(r,200));});};

 const shot=async name=>{win.webContents.invalidate();await new Promise(r=>setTimeout(r,90));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());};
 const timer=setTimeout(()=>app.exit(1),180000),results={};
 const box=()=>{const root=document.getElementById('npc-dialogue'),w=__game.world();const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};return {open:!root.hidden,name:root.querySelector('h2').textContent,text:root.querySelector('.dialogue-accessible').textContent,reader:rect(root),next:rect(root.querySelector('.dialogue-next')),body:rect(root.querySelector('.dialogue-layout')),width:innerWidth,height:innerHeight,journal:__game.ui.mapOpen,owner:__game.ui.conversationSpeakerId,focus:w.speechFocusTarget()?.id,actions:[...root.querySelectorAll('button')].filter(e=>e.offsetWidth>0).map(e=>e.textContent),fatal:__game.crash().fatal};};
 const fits=b=>{assert.equal(b.open,true);assert.equal(b.journal,false);assert.equal(b.fatal,null);for(const r of [b.reader,b.next,b.body])assert.ok(r.left>=-1&&r.right<=b.width+1&&r.top>=-1&&r.bottom<=b.height+1,JSON.stringify(r));assert.ok(b.body.height>=25);};
 const click=selector=>run(selector=>{const e=document.querySelector(selector);if(!e)throw Error('Missing '+selector);e.click();__game.step(2);},selector);
 try{
  await boot();await run(()=>{
   for(const k of ['arpg_account_v1','arpg_character_v1','arpg_character_v1_s10','arpg_settings_v1','arpg_workshop_v1','arpg_atlas_v1'])localStorage.setItem(k,'sentinel');
   __game.devStartRun('warrior');__game.ui.hideAll();__game.settings().speechTyping=false;
   const w=__game.world();w.player.invulnerable=true;
   const smith=w.actors.find(a=>a.defId==='townsfolk_smith'),inn=w.actors.find(a=>a.defId==='townsfolk_innkeep');
   window.conversationQA={w,smith,inn,home:{...inn.pos},stand:a=>{w.landPartyAt(a.pos);w.player.tier=a.tier;w.localSeat.lastActedAt=w.time-10;}};
   conversationQA.stand(smith);__game.step(150);
  });
  results.brandt=await run(box);fits(results.brandt);assert.match(results.brandt.name,/Brandt/);
  results.pointer=await run(()=>{const q=conversationQA,w=q.w,r=__game.renderer,original=r.speechPointerHits;q.inn.pos={...q.smith.pos};r.speechPointerHits=()=>new Map([[q.inn.id,0]]);try{__game.step(5);return {open:!document.getElementById('npc-dialogue').hidden,focus:w.speechFocusTarget()?.id,smith:q.smith.id};}finally{r.speechPointerHits=original;q.inn.pos=q.home;}});
  if(process.env.HOLLOW_WAKE_QA_PRIOR==='1'){
   assert.ok(!results.pointer.open||results.pointer.focus!==results.pointer.smith,'prior build reproduces pointer stealing active speaker');
   console.log('PASS prior reproduction: pointer crossing another NPC steals the conversation');
  }else{
   assert.ok(results.pointer.open);assert.equal(results.pointer.focus,results.pointer.smith);await shot('brandt');
   await run(()=>{__game.ui.showEscapeMenu();__game.step(2);});assert.equal((await run(box)).open,false);
   await run(()=>{__game.ui.hideEscapeMenu();__game.step(2);});fits(await run(box));assert.equal((await run(box)).text,results.brandt.text);
   await run(()=>{const q=conversationQA;__game.ui.hideAll();q.w.landPartyAt({x:q.smith.pos.x+1000,y:q.smith.pos.y});__game.step(2);});assert.equal((await run(box)).open,false);
   await run(()=>{const q=conversationQA;q.stand(q.inn);__game.step(240);});results.mireille=await run(box);fits(results.mireille);assert.match(results.mireille.name,/Mireille/);
   results.controller=await run(()=>{window.qaPad={id:'QA pad',index:0,connected:true,mapping:'standard',timestamp:performance.now(),axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};__game.step(2);
    const b=document.querySelector('[data-conversation-activity="flasks"]'),r=b.getBoundingClientRect();__game.padPointer().place(r.left+r.width/2,r.top+r.height/2);
    qaPad.buttons[0]={pressed:true,touched:true,value:1};__game.step(3);qaPad.buttons[0]={pressed:false,touched:false,value:0};__game.step(2);
    const out={active:__game.padPointer().active,workspace:document.getElementById('npc-dialogue').dataset.workspace,open:!document.getElementById('npc-dialogue').hidden};window.qaPad=null;return out;
   });assert.ok(results.controller.active&&results.controller.open);assert.equal(results.controller.workspace,'true');await shot('flasks');
   results.gifts=await run(()=>{const w=conversationQA.w;return {skills:w.mireilleLessonSkills(),items:w.meta.items.map(i=>[i.uid,i.gem?.skillId])};});assert.equal(results.gifts.skills.length,2);
   await click('[data-prepare-skill]');await click('[data-prepare-skill]');
   results.prepared=await run(()=>({pending:conversationQA.w.mireilleLessonSkills(),skills:conversationQA.w.player.skills.map(s=>s?.def.id)}));assert.deepEqual(results.prepared.pending,[]);assert.ok(results.prepared.skills.includes('life_flask')&&results.prepared.skills.includes('mana_flask'));fits(await run(box));
   await click('[data-conversation-activity="work"]');await shot('work');
   const accepted=await run(()=>{const b=document.querySelector('[data-conversation-accept]'),id=b.dataset.conversationAccept;b.click();b.click();__game.step(2);return {id,active:conversationQA.w.activeQuests.map(q=>q.questId)};});assert.equal(accepted.active.filter(id=>id===accepted.id).length,1);
   // Controlled completion fixture: native physical contract, real reward dispatch/UI (not a combat playthrough).
   await run(id=>{const q=conversationQA,w=q.w,quest=w.activeQuests.find(q=>q.questId===id),m=w.massRuntime,place=m.journey.places.find(p=>p.id===quest.placeId);
    w.landPartyAt(m.journey.local(place));m.update(w,true);__game.step(2);
    for(const [id,a] of [...m.natives])if(JSON.parse(id)[0]===place.id)w.kill(a,false,w.player);m.update(w,true);
    if(!quest.fieldDone)throw Error('Native garrison failed to complete');w.landPartyAt(q.home);m.update(w,true);q.inn=w.actors.find(a=>a.defId==='townsfolk_innkeep');q.stand(q.inn);__game.step(140);
   },accepted.id);
   results.reward=await run(box);fits(results.reward);assert.ok(results.reward.actions.includes('Rewards'));await shot('rewards');
   win.setSize(820,650);await new Promise(r=>setTimeout(r,100));await run(()=>__game.step(2));fits(await run(box));await shot('rewards-narrow');
   await run(()=>{__game.ui.showEscapeMenu();document.getElementById('esc-keys').click();document.querySelector('[data-opttab="interface"]').click();const s=document.getElementById('opt-uiscale');s.value='175';s.dispatchEvent(new Event('input',{bubbles:true}));__game.ui.hideEscapeMenu();__game.step(2);});fits(await run(box));
   const visibleReward=await run(()=>{const b=document.querySelector('[data-conversation-reward]');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect(),p=document.querySelector('.dialogue-layout').getBoundingClientRect();return {top:r.top,bottom:r.bottom,parentTop:p.top,parentBottom:p.bottom,hit:b.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))};});assert.ok(visibleReward.hit&&visibleReward.top>=visibleReward.parentTop&&visibleReward.bottom<=visibleReward.parentBottom);await shot('rewards-scaled');
   await click('[data-conversation-inventory]');
   results.companion=await run(()=>{const a=document.getElementById('inventory').getBoundingClientRect(),b=document.getElementById('npc-dialogue').getBoundingClientRect();return {bagTop:a.top,bagBottom:a.bottom,readerTop:b.top,visible:a.width>0,readerOpen:!document.getElementById('npc-dialogue').hidden};});
   assert.ok(results.companion.visible&&results.companion.readerOpen&&results.companion.bagBottom<=results.companion.readerTop,'scaled inventory must leave conversation clear');
   await run(()=>{__game.ui.toggleInventory();__game.step(2);});
   results.paid=await run(()=>{const w=conversationQA.w,b=document.querySelector('[data-conversation-reward]'),id=b.dataset.conversationReward,before=w.meta.items.length;b.click();b.click();__game.step(2);return {id,before,after:w.meta.items.length,done:w.completedQuests.has(id),remaining:w.questRewardOffers().length};});assert.ok(results.paid.done);assert.equal(results.paid.after,results.paid.before+1);assert.equal(results.paid.remaining,0);fits(await run(box));
   await run(()=>{__game.ui.hideAll();__game.save();});const state=()=>{const w=__game.world();return {pos:w.player.pos,items:w.meta.items,quests:[...w.completedQuests],skills:w.player.skills.map(s=>s&&{id:s.def.id,level:s.level,sockets:s.sockets})};};results.saved=await run(state);
   await boot();await run(async()=>{for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));document.querySelector('#sm-continue:not([disabled])').click();__game.ui.hideAll();});results.resumed=await run(state);assert.deepEqual(results.resumed,results.saved);
   assert.ok(await run(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('arpg_')).every(([,v])=>v==='sentinel')));
   console.log('PASS Brandt pointer ownership/pause/departure, Mireille native gifts/equipping/work/reward without Journal takeover, narrow/175% bounds, double-click once-only payout, exact Save/Continue and ordinary-save isolation');
  }
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
 }catch(e){fs.writeFileSync(path.join(dir,tag+'-failure.json'),JSON.stringify(results,null,2));console.error(e.stack||e);process.exitCode=1;}finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

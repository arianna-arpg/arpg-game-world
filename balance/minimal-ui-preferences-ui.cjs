// Controlled preference integration. No claim of an ordinary-input playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag=process.env.HOLLOW_WAKE_QA_TAG||'minimal-ui-r58';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/minimal-ui-r58-dist');
 const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{const out=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!out.ok)throw Error(out.error);return out.value;};
 const boot=async()=>{await win.loadURL(url);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));});};
 const options=tab=>run(tab=>{__game.ui.showEscapeMenu();document.querySelector('#esc-keys').click();document.querySelector('[data-opttab="'+tab+'"]').click();},tab);
 const click=id=>run(id=>{const e=document.getElementById(id);if(!e)throw Error('Missing '+id);e.click();},id);
 const prefs=()=>run(()=>{const s=__game.settings();return {name:s.castNameHint,ready:s.supportReadyHint,feet:s.castMovementHint,available:s.passiveAvailableList,allocated:s.passiveAllocatedList};});
 const shot=async name=>{win.webContents.invalidate();await new Promise(r=>setTimeout(r,90));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());};
 const capture=async(name,wantName,wantFeet)=>{
  const result=await run(()=>{
   __game.ui.hideAll();const w=__game.world(),p=w.player,r=__game.renderer,ctx=r.ctx,words=[],rims=[],bars=[];
   const state=()=>JSON.stringify([w.time,p.pos,p.life,p.mana,p.casting?.elapsed,p.casting?.total]);const before=state();
   const fillText=ctx.fillText,stroke=ctx.strokeRect,fill=ctx.fillRect;
   ctx.fillText=function(text,x,y,...rest){const m=ctx.getTransform();words.push({text,x:m.a*x+m.e,y:m.d*y+m.f,width:ctx.measureText(text).width});return fillText.call(this,text,x,y,...rest);};
   ctx.strokeRect=function(x,y,width,height){if(ctx.strokeStyle==='#f1ecdd'&&ctx.lineWidth===2)rims.push({x,y,width,height});return stroke.call(this,x,y,width,height);};
   ctx.fillRect=function(x,y,width,height){if(height===6)bars.push({x,y,width,height});return fill.call(this,x,y,width,height);};
   try{r.render(w);}finally{ctx.fillText=fillText;ctx.strokeRect=stroke;ctx.fillRect=fill;}
   return {words,rims,bars,slots:r.hudSlotRects,name:p.casting?.inst.def.name,held:w.movementLocked(p),mode:p.casting?.mode,elapsed:p.casting?.elapsed,total:p.casting?.total,same:before===state(),fatal:__game.crash().fatal,width:innerWidth,height:innerHeight};
  });
  assert.equal(result.fatal,null);assert.ok(result.same);assert.equal(result.words.filter(t=>t.text===result.name).length,wantName?1:0);assert.equal(result.words.filter(t=>t.text==='Feet planted').length,wantFeet?1:0);
  assert.equal(result.rims.length,1,'owner slot remains visual with captions off');assert.equal(result.rims[0].x,result.slots[0].x-2);
  assert.ok(result.bars.some(b=>Math.abs(b.width-104*result.elapsed/result.total)<.01),'native cast progress preserved');
  for(const t of result.words.filter(t=>t.text===result.name||t.text==='Feet planted'))assert.ok(t.width<=104&&t.x>0&&t.x<result.width&&t.y>0&&t.y<result.height);
  await shot(name);return result;
 };
 const readiness=()=>run(()=>{__game.ui.refreshInventory(true);const e=document.querySelector('[data-socket-readiness]');return {text:e?.textContent,hidden:e?.hidden,height:e?.getBoundingClientRect().height,reason:__game.world().swapRefusal(__game.world().localSeat,'socket')};});
 const openSkills=()=>run(()=>{__game.ui.hideAll();__game.ui.toggleBuildPanel(undefined,'show');__game.ui.refreshInventory(true);});
 const state=()=>{const w=__game.world(),p=w.player;return {seed:w.massRuntime.generator.run.seed,pos:p.pos,life:p.life,mana:p.mana,items:w.meta.items,skills:p.skills.map(i=>i&&{id:i.def.id,level:i.level,sockets:i.sockets})};};
 const resume=async()=>{await boot();await run(async()=>{for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));const e=document.querySelector('#sm-continue:not([disabled])');if(!e)throw Error('Missing Continue');e.click();__game.ui.hideAll();});return run(state);};
 const timer=setTimeout(()=>app.exit(1),180000),results={};
 try{
  await boot();await run(()=>{for(const k of ['arpg_account_v1','arpg_character_v1','arpg_character_v1_s10','arpg_settings_v1','arpg_workshop_v1','arpg_atlas_v1'])localStorage.setItem(k,'sentinel');__game.devStartRun('magician');__game.ui.hideAll();__game.step(2);const w=__game.world(),p=w.player,m=w.massRuntime,q=m.journey.local(m.journey.places.find(p=>p.content==='cinderwatch'));w.landPartyAt(q);m.update(w,true);w.actors=[p];p.invulnerable=true;p.fillResources();if(!w.useSkill(p,p.skills[0],{x:p.pos.x+200,y:p.pos.y},true))throw Error('Cast refused');__game.step(4);});
  assert.deepEqual(await prefs(),{name:false,ready:false,feet:false,available:false,allocated:false});
  results.quiet=await capture('quiet',false,false);
  await options('visuals');assert.equal(await run(()=>document.getElementById('opt-castname').textContent),'OFF');await click('opt-castmovement');results.feet=await capture('feet-only',false,true);
  await options('visuals');await click('opt-castname');results.both=await capture('both-captions',true,true);
  await options('visuals');await click('opt-castmovement');results.name=await capture('name-only',true,false);
  win.setSize(800,600);await new Promise(r=>setTimeout(r,150));results.narrow=await capture('narrow',true,false);win.setSize(1280,850);await new Promise(r=>setTimeout(r,120));
  await options('visuals');await click('opt-castname');await run(()=>{const w=__game.world();w.player.casting=null;w.lastCombatAt=w.time-100;});
  await openSkills();results.readyOff=await readiness();assert.equal(results.readyOff.reason,null);assert.equal(results.readyOff.text,'');assert.ok(results.readyOff.hidden);assert.equal(results.readyOff.height,0);
  await options('interface');assert.equal(await run(()=>document.getElementById('opt-supportready').textContent),'OFF');await click('opt-supportready');await openSkills();results.readyOn=await readiness();assert.equal(results.readyOn.text,'Supports can be changed here.');assert.ok(!results.readyOn.hidden);
  await options('interface');await click('opt-supportready');await openSkills();
  await run(()=>{const w=__game.world(),p=w.player,f=w.createMonster('dire_wolf',1,'enemy');f.pos={x:p.pos.x+70,y:p.pos.y};w.actors.push(f);w.resolveHit(p,p.skills[0],f);if(w.lastCombatAt!==w.time)throw Error('No native combat stamp');f.dead=true;w.actors=[p];__game.ui.refreshInventory(true);window.preferenceControls={readout:document.querySelector('[data-socket-readiness]'),skill:document.querySelector('[data-drop="gemSock:firebolt"]')};});
  results.hot=await readiness();assert.match(results.hot.text,/5.0s of recovery/);assert.ok(!results.hot.hidden);
  await run(()=>__game.step(90));results.cooling=await readiness();assert.match(results.cooling.text,/3.5s of recovery/);assert.ok(await run(()=>preferenceControls.readout===document.querySelector('[data-socket-readiness]')&&preferenceControls.skill===document.querySelector('[data-drop="gemSock:firebolt"]')));
  await run(()=>__game.step(220));results.calm=await readiness();assert.equal(results.calm.text,'');assert.ok(results.calm.hidden);
  await run(()=>{const w=__game.world(),f=w.createMonster('dire_wolf',1,'enemy');f.pos={x:w.player.pos.x+90,y:w.player.pos.y};w.actors.push(f);});results.foes=await readiness();assert.equal(results.foes.reason,'foes press too near');assert.ok(!results.foes.hidden);
  await options('interface');await click('opt-supportready');await options('visuals');await click('opt-castname');await run(()=>{const w=__game.world();w.actors=[w.player];w.player.casting=null;__game.ui.hideAll();__game.save();});results.saved=await run(state);results.resumed=await resume();assert.deepEqual(results.resumed,results.saved);assert.deepEqual(await prefs(),{name:true,ready:true,feet:false,available:false,allocated:false});
  await run(()=>{const w=__game.world();w.actors=[w.player];});await openSkills();assert.equal((await readiness()).text,'Supports can be changed here.');
  // Older saves omit the new fields. Existing non-default choices must survive.
  await run(()=>{const key=Object.keys(localStorage).find(k=>k.endsWith(':arpg_settings_v1'));if(!key)throw Error('Missing scoped settings');const s=JSON.parse(localStorage.getItem(key));delete s.castNameHint;delete s.supportReadyHint;s.castMovementHint=true;localStorage.setItem(key,JSON.stringify(s));});
  results.migrated=await resume();assert.deepEqual(results.migrated,results.saved);assert.deepEqual(await prefs(),{name:false,ready:false,feet:true,available:false,allocated:false});await run(()=>{const w=__game.world();w.actors=[w.player];});await openSkills();assert.ok((await readiness()).hidden);
  assert.ok(await run(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('arpg_')).every(([,v])=>v==='sentinel')));
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log('PASS quiet defaults, all four independent cast-caption combinations, native owner-slot/progress, narrow bounds, live support refusal/countdown, stable controls, readiness opt-in, Options persistence, native Continue, older-settings defaults, and six ordinary-save sentinels');
 }catch(e){fs.writeFileSync(path.join(dir,tag+'-failure.json'),JSON.stringify(results,null,2));console.error(e.stack||e);process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

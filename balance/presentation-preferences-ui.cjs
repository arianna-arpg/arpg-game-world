// Controlled presentation integration, not an ordinary-input gameplay review.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag=process.env.HOLLOW_WAKE_QA_TAG||'presentation-r56';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/player-visuals-r56-dist');const current=root;
 const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{const out=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!out.ok)throw Error(out.error);return out.value;};
 const boot=async()=>{await win.loadURL(url);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));});};
 const options=()=>run(()=>{__game.ui.showEscapeMenu();document.querySelector('#esc-keys').click();document.querySelector('[data-opttab="visuals"]').click();const s=__game.settings();
 const expected={'opt-statusreadout':s.statusReadout==='focus'?'NEAR HERO':s.statusReadout==='corner'?'UPPER CORNER':'OFF','opt-crowdedmeters':s.crowdedMeters?'AVOID CROWD':'FIXED','opt-castmovement':s.castMovementHint?'ON':'OFF'};
 for(const [id,text]of Object.entries(expected))if(document.getElementById(id).textContent!==text)throw Error('Wrong visible preference: '+id);});
 const click=id=>run(id=>{const e=document.getElementById(id);if(!e)throw Error('Missing '+id);e.click();},id);
 const prefs=()=>run(()=>{const s=__game.settings();return {crowded:s.crowdedMeters,planted:s.castMovementHint,text:s.statusReadout,effects:s.afflictionOverlays};});
 const shot=async name=>{await run(()=>__game.renderer.render(__game.world()));const data=await run(()=>document.getElementById('game').toDataURL());fs.writeFileSync(path.join(dir,tag+'-'+name+'-canvas.png'),Buffer.from(data.split(',')[1],'base64'));win.webContents.invalidate();await new Promise(r=>setTimeout(r,90));fs.writeFileSync(path.join(dir,tag+'-'+name+'-page.png'),(await win.webContents.capturePage()).toPNG());};
 const capture=async name=>{
  const result=await run(()=>{
   const w=__game.world(),p=w.player,r=__game.renderer,ctx=r.ctx,words=[],contexts=[r.ctx,r.octx],fills=contexts.map(c=>c.fillText);
   const state=()=>JSON.stringify([w.time,p.pos,p.statuses,p.casting?.elapsed,p.life,p.mana]);const before=state();
   contexts.forEach((c,i)=>{c.fillText=function(text,x,y,...rest){const m=c.getTransform();words.push({text,x:m.a*x+m.e,y:m.d*y+m.f});return fills[i].call(this,text,x,y,...rest);};});
   try{r.render(w);}finally{contexts.forEach((c,i)=>c.fillText=fills[i]);}
   // Isolate the real vignette pass only for measuring independent visibility.
   const cv=document.createElement('canvas');cv.width=600;cv.height=400;const g=cv.getContext('2d'),original=r.canvas;
   r.canvas=cv;r.ctx=g;try{r.drawAfflictionOverlays(w);}finally{r.canvas=original;r.ctx=ctx;}
   const pixels=g.getImageData(0,0,600,400).data;let energy=0;for(let i=3;i<pixels.length;i+=4)energy+=pixels[i];
   return {casting:p.casting?.inst.def.id,held:w.movementLocked(p),caption:__game.settings().castMovementHint,words,energy,center:g.getImageData(300,200,1,1).data[3],same:before===state(),relocate:r.combatMeters.relocate,fatal:__game.crash().fatal,width:innerWidth,height:innerHeight};
  });assert.equal(result.fatal,null);assert.ok(result.same);assert.equal(result.center,0);await shot(name);return result;
 };
 const timer=setTimeout(()=>app.exit(1),180000),results={};
 const state=()=>{const w=__game.world(),p=w.player;return {seed:w.massRuntime.generator.run.seed,pos:p.pos,life:p.life,mana:p.mana,items:w.meta.items,skills:p.skills.map(i=>i&&{id:i.def.id,level:i.level,sockets:i.sockets})};};
 const resume=async()=>{await boot();await run(async()=>{for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No Continue');b.click();__game.ui.hideAll();});return run(state);};
 try{
  await boot();await run(()=>{for(const k of ['arpg_account_v1','arpg_character_v1','arpg_character_v1_s10','arpg_settings_v1','arpg_workshop_v1','arpg_atlas_v1'])localStorage.setItem(k,'sentinel');__game.devStartRun('magician');__game.ui.hideAll();__game.step(2);const w=__game.world(),p=w.player,m=w.massRuntime,place=m.journey.places.find(p=>p.content==='cinderwatch'),q=m.journey.local(place);w.landPartyAt(q);m.update(w,true);w.landPartyAt(w.findFreeSpot({x:q.x+120,y:q.y+520},p.radius));m.update(w,true);__game.step(2);w.actors=[p];p.statuses=[];p.applyStatus('mired',0,1,'Mud');p.applyStatus('befuddlement',0,1,'Spell');if(!w.useSkill(p,p.skills[0],{x:p.pos.x+150,y:p.pos.y}))throw Error('Cast refused');});
  assert.deepEqual(await prefs(),{crowded:false,planted:false,text:'focus',effects:'gentle'});
  results.defaults=await capture('default-focus');assert.ok(!results.defaults.relocate);assert.ok(!results.defaults.words.some(w=>w.text==='Feet planted'));
  const labels=results.defaults.words.filter(w=>['Mired','Befuddled'].includes(w.text));assert.equal(labels.length,2);assert.ok(labels.every(w=>w.x>300&&w.y>350));assert.ok(results.defaults.energy>0);
  await options();await shot('options');await click('opt-crowdedmeters');await click('opt-castmovement');await click('opt-affliction');await click('opt-affliction');await run(()=>__game.ui.hideAll());
  results.textOnly=await capture('text-only-opt-in-bars');assert.equal(results.textOnly.energy,0);assert.ok(results.textOnly.relocate);assert.ok(results.textOnly.words.some(w=>w.text==='Feet planted'));
  await options();await click('opt-statusreadout');await run(()=>__game.ui.hideAll());results.corner=await capture('corner');assert.ok(results.corner.words.find(w=>w.text==='Mired').x<100);
  await options();await click('opt-statusreadout');await click('opt-affliction');await run(()=>__game.ui.hideAll());results.visualOnly=await capture('visual-only');assert.ok(results.visualOnly.energy>0);assert.ok(!results.visualOnly.words.some(w=>['Mired','Befuddled'].includes(w.text)));
  await options();await click('opt-statusreadout');await click('opt-crowdedmeters');await click('opt-castmovement');await run(()=>__game.ui.hideAll());
  win.setSize(800,600);await new Promise(r=>setTimeout(r,150));results.narrow=await capture('narrow');
  for(const row of results.narrow.words.filter(w=>['Mired','Befuddled'].includes(w.text)))assert.ok(row.x>=0&&row.x<800&&row.y>100&&row.y<500);
  await run(()=>{const s=__game.settings();s.renderScale=.6;__game.renderer.setRenderScale(.6);});
  results.scaled=await capture('scaled');assert.equal(results.scaled.words.filter(w=>['Mired','Befuddled'].includes(w.text)).length,2,'native-resolution HUD overlay retains both names');for(const row of results.scaled.words.filter(w=>['Mired','Befuddled'].includes(w.text)))assert.ok(row.x>=0&&row.x<800);
  // Return to normal scale and leave a deliberate preference for native reload.
  await run(()=>{__game.settings().renderScale=1;__game.renderer.setRenderScale(1);});win.setSize(1280,850);await new Promise(r=>setTimeout(r,120));
  await options();await click('opt-statusreadout');await click('opt-statusreadout');await run(()=>{__game.ui.hideAll();const p=__game.world().player;p.casting=null;p.statuses=[];__game.save();});
  results.saved=await run(state);results.resumed=await resume();assert.deepEqual(results.resumed,results.saved);assert.equal((await prefs()).text,'off');
  root=path.join(dir,'cast-aim-dist');results.prior=await resume();assert.deepEqual(results.prior,results.saved);
  root=current;results.returned=await resume();assert.deepEqual(results.returned,results.saved);assert.equal((await prefs()).text,'off');
  assert.ok(await run(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('arpg_')).every(([,v])=>v==='sentinel')));
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log('PASS native Options, independent text/vignettes, fixed/opt-in bars and caption, bounded readout, pure drawing, current/prior/current Continue and six untouched ordinary-save sentinels');
 }catch(e){fs.writeFileSync(path.join(dir,tag+'-failure.json'),JSON.stringify(results,null,2));console.error(e.stack||e);process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

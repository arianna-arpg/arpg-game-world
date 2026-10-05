// Controlled preference integration. No claim of an ordinary-input playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag=process.env.HOLLOW_WAKE_QA_TAG||'quiet-icons-r60';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/quiet-icons-r60-dist');
 const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{const out=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!out.ok)throw Error(out.error);return out.value;};
 const boot=async()=>{await win.loadURL(url);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));});};
 const options=tab=>run(tab=>{__game.ui.showEscapeMenu();document.querySelector('#esc-keys').click();document.querySelector('[data-opttab="'+tab+'"]').click();},tab);
 const click=id=>run(id=>{const e=document.getElementById(id);if(!e)throw Error('Missing '+id);e.click();},id);
 const prefs=()=>run(()=>{const s=__game.settings();return {artwork:s.skillArtwork,details:s.statusReadout};});
 const shot=async name=>{win.webContents.invalidate();await new Promise(r=>setTimeout(r,90));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());};

 const capture=async(name)=>{
  const data=await run(()=>{const r=__game.renderer,w=__game.world(),p=w.player,words=[];
   const contexts=[r.ctx,r.octx],fills=contexts.map(c=>c.fillText),state=()=>JSON.stringify([w.time,p.statuses,p.life,p.mana,p.pos]);const before=state();
   contexts.forEach((c,i)=>c.fillText=function(text,x,y,...args){const m=c.getTransform();words.push({text,x:m.a*x+m.e,y:m.d*y+m.f});return fills[i].call(this,text,x,y,...args);});
   try{r.render(w);}finally{contexts.forEach((c,i)=>c.fillText=fills[i]);}
   return {words,icons:r.statusIconRects,slots:r.hudSlotRects,hover:r.statusIconHover?.rect.icon.id,same:before===state(),fatal:__game.crash().fatal,width:innerWidth,height:innerHeight,css:r.uiToCss};
  });assert.ok(data.same);assert.equal(data.fatal,null);await shot(name);return data;
 };
 const hover=async(id)=>{const rect=await run(id=>__game.renderer.statusIconRects.find(r=>r.id===id),id);assert.ok(rect,id);
  win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(rect.x+rect.w/2),y:Math.round(rect.y+rect.h/2)});
  await new Promise(r=>setTimeout(r,50));await run(()=>__game.step(1));};
 const leave=async()=>{win.webContents.sendInputEvent({type:'mouseMove',x:500,y:200});await new Promise(r=>setTimeout(r,50));await run(()=>__game.step(1));};
 const skills=()=>run(()=>{__game.ui.hideAll();__game.ui.toggleBuildPanel(undefined,'show');__game.ui.refreshInventory(true);return [...document.querySelectorAll('[data-skill-acronym]')].map(e=>e.dataset.skillAcronym);});
 const state=()=>{const w=__game.world(),p=w.player;return {seed:w.massRuntime.generator.run.seed,pos:p.pos,life:p.life,mana:p.mana,items:w.meta.items,skills:p.skills.map(i=>i&&{id:i.def.id,level:i.level,sockets:i.sockets})};};
 const resume=async()=>{await boot();await run(async()=>{for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('Missing Continue');b.click();__game.ui.hideAll();});return run(state);};
 const timer=setTimeout(()=>app.exit(1),180000),results={};
 try{
  await boot();await run(()=>{for(const k of ['arpg_account_v1','arpg_character_v1','arpg_character_v1_s10','arpg_settings_v1','arpg_workshop_v1','arpg_atlas_v1'])localStorage.setItem(k,'sentinel');__game.devStartRun('warrior');__game.ui.hideAll();__game.step(2);const w=__game.world(),p=w.player,m=w.massRuntime,q=m.journey.local(m.journey.places.find(p=>p.content==='cinderwatch'));w.landPartyAt(q);m.update(w,true);w.actors=[p];p.fillResources();
   window.originalSkills=[...p.skills];window.originalKnown=new Map(w.meta.knownSkills);
   for(const [i,id]of ['cleave','sunder_maul','frenzy'].entries())if(__game.devGrantSkill(id,1,i)!==i)throw Error('Missing '+id);
   p.statuses=[];for(const id of ['burn','poison','bleed','chill','mired','befuddlement','shock','vulnerable'])p.applyStatus(id,1,2,'QA');
  });
  assert.deepEqual(await prefs(),{artwork:true,details:'hover'});
  // Exercise the opt-in acronym mode through the actual Options control.
  await options('visuals');await click('opt-skillartwork');await run(()=>__game.ui.hideAll());
  assert.deepEqual(await prefs(),{artwork:false,details:'hover'});
  results.quiet=await capture('quiet');assert.equal(results.quiet.icons.length,8);assert.equal(results.quiet.hover,undefined);
  for(const label of ['Burning','Poisoned','Bleeding','Chilled','Mired','Befuddled'])assert.ok(!results.quiet.words.some(w=>w.text===label),label+' must be hover-only');
  for(const label of ['C','SM','F'])assert.ok(results.quiet.words.some(w=>w.text===label&&w.y>results.quiet.slots[0].y),label+' hotbar acronym');
  const nativeSlots=results.quiet.slots;assert.ok(results.quiet.icons.every(i=>i.x<nativeSlots[0].x&&i.y+ i.h<nativeSlots[0].y));
  await hover('poison');results.poison=await capture('poison-hover');assert.equal(results.poison.hover,'poison');assert.ok(results.poison.words.some(w=>w.text==='Poisoned'));assert.ok(results.poison.words.some(w=>/remaining/.test(w.text)));assert.ok(results.poison.words.some(w=>w.text==='Damage over time'));
  assert.ok(!results.poison.words.some(w=>w.text==='Burning'));await leave();results.left=await capture('left');assert.equal(results.left.hover,undefined);assert.ok(!results.left.words.some(w=>w.text==='Poisoned'));
  await run(()=>__game.world().player.updateTimers(1));results.decayed=await capture('decayed');assert.ok(results.decayed.icons.find(i=>i.id==='poison').fraction<results.quiet.icons.find(i=>i.id==='poison').fraction);
  await run(()=>__game.world().player.applyStatus('poison',1,.5,'Refresh'));results.refresh=await capture('refresh');assert.equal(results.refresh.icons.find(i=>i.id==='poison').fraction,1);
  await hover('poison');await run(()=>__game.world().player.endStatus('poison'));results.cleansed=await capture('cleansed');assert.notEqual(results.cleansed.hover,'poison');assert.ok(!results.cleansed.icons.some(i=>i.id==='poison'));assert.ok(!results.cleansed.words.some(w=>w.text==='Poisoned'));
  const rack=await skills();for(const label of ['C','SM','F'])assert.ok(rack.includes(label),'rack '+label);await shot('rack-acronyms');
  await options('visuals');assert.equal(await run(()=>document.getElementById('opt-skillartwork').textContent),'ACRONYMS');assert.equal(await run(()=>document.getElementById('opt-statusreadout').textContent),'ON HOVER');await shot('options');
  await click('opt-skillartwork');assert.equal(await run(()=>document.getElementById('opt-skillartwork').textContent),'ARTWORK');assert.equal((await skills()).length,0);await capture('rack-artwork');await run(()=>__game.ui.hideAll());results.artwork=await capture('artwork');
  for(const label of ['C','SM','F'])assert.ok(!results.artwork.words.some(w=>w.text===label&&w.y>results.artwork.slots[0].y));assert.deepEqual(results.artwork.slots,nativeSlots);
  await options('visuals');await click('opt-skillartwork');await click('opt-statusreadout');await run(()=>__game.ui.hideAll());results.focus=await capture('optional-focus');assert.ok(results.focus.words.some(w=>w.text==='Burning'));
  await options('visuals');await click('opt-statusreadout');await run(()=>__game.ui.hideAll());results.corner=await capture('optional-corner');assert.ok(results.corner.words.some(w=>w.text==='Burning'&&w.x<100));
  await options('visuals');await click('opt-statusreadout');await run(()=>__game.ui.hideAll());await hover('burn');results.off=await capture('details-off');assert.equal(results.off.hover,undefined);assert.ok(results.off.icons.length>0);
  await options('visuals');await click('opt-statusreadout');await run(()=>__game.ui.hideAll());await leave();
  win.setSize(800,600);await new Promise(r=>setTimeout(r,160));await run(()=>{__game.settings().renderScale=.6;__game.renderer.setRenderScale(.6);__game.settings().uiScale=1.25;__game.step(1);});
  results.narrow=await capture('narrow');await hover('chill');results.narrowHover=await capture('narrow-hover');assert.equal(results.narrowHover.hover,'chill');assert.ok(results.narrowHover.words.some(w=>w.text==='Chilled'));for(const i of results.narrowHover.icons)assert.ok(i.x>=0&&i.y>=0&&i.x+i.w<=800&&i.y+i.h<=600);
  await run(()=>{__game.settings().renderScale=1;__game.renderer.setRenderScale(1);__game.settings().uiScale=1;__game.step(1);});win.setSize(1280,850);await new Promise(r=>setTimeout(r,160));await leave();
  await options('visuals');await click('opt-skillartwork');await click('opt-statusreadout');await run(()=>{__game.ui.hideAll();const w=__game.world(),p=w.player;p.statuses=[];p.skills=originalSkills;w.meta.knownSkills=originalKnown;p.fillResources();__game.save();});
  results.saved=await run(state);results.resumed=await resume();assert.deepEqual(results.resumed,results.saved);assert.deepEqual(await prefs(),{artwork:true,details:'focus'});
  await run(()=>{const key=Object.keys(localStorage).find(k=>k.endsWith(':arpg_settings_v1'));const s=JSON.parse(localStorage.getItem(key));delete s.statusReadoutVersion;delete s.skillArtwork;s.statusReadout='focus';localStorage.setItem(key,JSON.stringify(s));});
  results.migrated=await resume();assert.deepEqual(results.migrated,results.saved);assert.deepEqual(await prefs(),{artwork:true,details:'hover'});
  assert.ok(await run(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('arpg_')).every(([,v])=>v==='sentinel')));
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log('PASS eight compact Life-adjacent debuffs; real mouse hover/leave, live expiry, refresh and cleanse; distinct C/SM/F on bar and rack; artwork default and acronym opt-in, all detail modes, scaled narrow HUD, exact native Continue, old settings migration and six untouched ordinary-save sentinels');
 }catch(e){fs.writeFileSync(path.join(dir,tag+'-failure.json'),JSON.stringify(results,null,2));console.error(e.stack||e);process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

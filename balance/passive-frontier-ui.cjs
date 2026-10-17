// Controlled real-client acceptance; ordinary critic play uses separate profiles.
// HOLLOW_WAKE_QA_PRIOR optionally compares the graph against the previous build.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag=process.env.HOLLOW_WAKE_QA_TAG||'passive-frontier';
fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const current=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'dist-preview');
 const prior=process.env.HOLLOW_WAKE_QA_PRIOR&&path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_PRIOR);
 let root=prior||current;
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const url='http://127.0.0.1:'+server.address().port,results={classes:[]},baseline={};
 const boot=async()=>{await win.loadURL(url);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[]});await new Promise(r=>setTimeout(r,200));});};
 const setup=id=>run(id=>{__game.devStartRun(id);__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;w.meta.passivePoints=2;__game.ui.toggleTree();__game.step(2);},id);
 const snapshot=()=>run(()=>{
  const root=document.getElementById('passive-tree'),classic=root.cloneNode(true),w=__game.world(),s=__game.settings();
  classic.querySelectorAll('[data-passive-frontier],[data-passive-owned],style').forEach(e=>e.remove());
  return {html:classic.innerHTML.replace(/>\s+</g,'><').trim(),viewBox:root.querySelector('#tree-svg').getAttribute('viewBox'),
   available:[...root.querySelectorAll('.tree-node.available')].map(n=>n.dataset.node),cards:[...root.querySelectorAll('[data-passive-choice]')].map(n=>n.dataset.passiveChoice),
   listed:[...root.querySelectorAll('[data-passive-owned-node]')].map(n=>n.dataset.passiveOwnedNode),owned:[...w.meta.allocated],points:w.meta.passivePoints,
   prefs:[s.passiveAvailableList,s.passiveAllocatedList],fatal:__game.crash().fatal};
 });
 const allocateGraph=()=>run(()=>{
  const el=document.querySelector('#tree-svg .tree-node.available:not([stroke-dasharray])');
  if(!el)throw Error('No ordinary graph allocation');const id=el.dataset.node;
  el.dispatchEvent(new MouseEvent('click',{bubbles:true}));__game.step(1);return id;
 });
 const options=()=>run(()=>{__game.ui.showEscapeMenu();document.getElementById('esc-keys').click();document.querySelector('[data-opttab="interface"]').click();
  for(const [id,key]of [['opt-passiveavailable','passiveAvailableList'],['opt-passiveallocated','passiveAllocatedList']])
   if(document.getElementById(id).textContent!==(__game.settings()[key]?'ON':'OFF'))throw Error('Wrong visible preference '+id);
 });
 const setPrefs=async(available,allocated)=>{
  await options();await run((available,allocated)=>{
   for(const [id,key,value]of [['opt-passiveavailable','passiveAvailableList',available],['opt-passiveallocated','passiveAllocatedList',allocated]])
    if(__game.settings()[key]!==value)document.getElementById(id).click();
   __game.ui.hideAll();__game.ui.toggleTree();__game.step(1);
  },available,allocated);
  assert.deepEqual((await snapshot()).prefs,[available,allocated]);
 };
 const shot=async name=>{
  await run(()=>__game.renderer.render(__game.world()));const data=await run(()=>document.getElementById('game').toDataURL());
  fs.writeFileSync(path.join(dir,tag+'-'+name+'-canvas.png'),Buffer.from(data.split(',')[1],'base64'));
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,150));fs.writeFileSync(path.join(dir,tag+'-'+name+'-page.png'),(await win.webContents.capturePage()).toPNG());
 };
 const savedState=()=>run(()=>{const w=__game.world();return {seed:w.massRuntime.generator.run.seed,owned:[...w.meta.allocated],points:w.meta.passivePoints};});
 const resume=async()=>{
  await boot();await run(async()=>{for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No Continue');b.click();__game.ui.hideAll();__game.ui.toggleTree();__game.step(2);
  });return snapshot();
 };
 const timer=setTimeout(()=>app.exit(1),180000);
 try{
  await boot();await run(()=>{for(const k of ['arpg_account_v1','arpg_character_v1','arpg_character_v1_s10','arpg_settings_v1','arpg_workshop_v1','arpg_atlas_v1'])localStorage.setItem(k,'sentinel');});
  if(prior)for(const id of ['warrior','magician','rogue']){await setup(id);const before=await snapshot(),node=await allocateGraph(),after=await snapshot();baseline[id]={before,after,node};}
  if(prior)await run(()=>{
   __game.saveSettings();
   const saved=JSON.parse(localStorage.getItem('preview:seamless-world:arpg_settings_v1'));
   if(!saved||'passiveAvailableList' in saved||'passiveAllocatedList' in saved)throw Error('Expected legacy settings without list preferences');
  });
  root=current;await boot();
  for(const id of ['warrior','magician','rogue']){
   await setup(id);const before=await snapshot();assert.deepEqual(before.prefs,[false,false]);assert.equal(before.cards.length,0);assert.equal(before.listed.length,0);
   assert.ok(before.available.length>0);if(prior)assert.equal(before.html,baseline[id].before.html,'default tree equals the prior graph with only the two added text sections removed');
   await shot(id+'-classic');const node=await allocateGraph(),after=await snapshot();assert.ok(after.owned.includes(node));assert.equal(after.points,1);assert.equal(after.cards.length+after.listed.length,0);
   if(prior){assert.equal(node,baseline[id].node);assert.equal(after.html,baseline[id].after.html,'graph allocation retains the prior view');}
   await setPrefs(true,false);const available=await snapshot();assert.deepEqual(available.cards.sort(),available.available.sort());assert.equal(available.listed.length,0);
   await setPrefs(false,true);const allocated=await snapshot();assert.equal(allocated.cards.length,0);assert.ok(allocated.listed.includes(node));
   await setPrefs(true,true);const both=await snapshot();assert.ok(both.cards.length&&both.listed.includes(node));
   if(id==='warrior'){
    await options();await shot('options');await run(()=>{__game.ui.hideAll();__game.ui.toggleTree();});
    win.setContentSize(1000,720);await shot('narrow-lists');const listedTop=await run(()=>document.getElementById('tree-svg').getBoundingClientRect().top);
    await setPrefs(false,false);await shot('narrow-classic');assert.ok(await run(top=>document.getElementById('tree-svg').getBoundingClientRect().top<top,listedTop));
    win.setContentSize(1280,850);await setPrefs(true,true);
   }
   const card=await run(()=>{
    const el=[...document.querySelectorAll('[data-passive-choice]')].find(e=>e.textContent.includes('Allocate'));
    if(!el)throw Error('No ordinary optional card');const id=el.dataset.passiveChoice,name=el.querySelector('strong').textContent,input=document.getElementById('tree-search');
    input.value=name;input.dispatchEvent(new Event('input',{bubbles:true}));
    if(![...document.querySelectorAll('[data-passive-choice]:not([hidden])')].every(e=>e.textContent.includes(name)))throw Error('Card search failed');
    input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));el.click();__game.step(1);el.click();__game.step(1);return id;
   });const spent=await snapshot();assert.ok(spent.owned.includes(card)&&spent.listed.includes(card));assert.equal(spent.points,0);assert.equal(spent.cards.length,0);assert.equal(spent.fatal,null);
   results.classes.push({id,graphNode:node,cardNode:card,parity:!!prior,available:before.available.length});
   if(id!=='rogue')await setPrefs(false,false);
  }
  await run(()=>{__game.ui.hideAll();__game.save();});results.saved=await savedState();
  let continued=await resume();assert.deepEqual(await savedState(),results.saved);assert.deepEqual(continued.prefs,[true,true]);assert.equal(continued.listed.length,2);
  await setPrefs(false,true);continued=await resume();assert.deepEqual(continued.prefs,[false,true]);assert.deepEqual(await savedState(),results.saved);
  await setPrefs(false,false);continued=await resume();assert.deepEqual(continued.prefs,[false,false]);assert.equal(continued.cards.length+continued.listed.length,0);assert.deepEqual(await savedState(),results.saved);
  results.navigation=await run(()=>{
   const svg=document.getElementById('tree-svg'),before=svg.getAttribute('viewBox');document.querySelector('[data-tz="in"]').click();const after=svg.getAttribute('viewBox');
   const input=document.getElementById('tree-search');input.value='strength';input.dispatchEvent(new Event('input',{bubbles:true}));const hits=svg.querySelectorAll('.search-hit').length;
   input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));return {zoomed:before!==after,hits,cleared:!svg.classList.contains('tree-searching')};
  });assert.ok(results.navigation.zoomed&&results.navigation.hits>0&&results.navigation.cleared);
  results.continued=await savedState();await shot('continued-classic');
  assert.equal(await run(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('arpg_')).length),6);
  assert.ok(await run(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('arpg_')).every(([,v])=>v==='sentinel')));
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log('PASS classic graph parity, independent native Options, graph/card allocation, single debit, search/zoom, narrow layout, saved preferences, native Continue and six untouched ordinary saves');
 }catch(e){fs.writeFileSync(path.join(dir,tag+'-failure.json'),JSON.stringify(results,null,2));console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

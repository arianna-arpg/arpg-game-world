// Controlled map readability and persistence. This is not an ordinary-play review.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'maplabels-before':'maplabels';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/worldmass-maplabels-dist');
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
 const inspect=()=>run(()=>{
  const w=__game.world(),m=w.massRuntime,before=JSON.stringify([m.state.snapshot(),w.player.pos,w.time,w.player.life,w.player.mana,w.activeQuests]);
  __game.ui.refreshMap();
  const p=document.getElementById('world-map'),svg=p.querySelector('svg'),rect=e=>{const r=e.getBBox();return {x:r.x,y:r.y,w:r.width,h:r.height};};
  const boxes=[...svg.querySelectorAll('[data-mass-label] rect')].map(rect),texts=[...svg.querySelectorAll('[data-mass-label] text')].map(rect);
  const markers=[...svg.querySelectorAll('[data-mass-place] path,[data-mass-service] circle,[data-mass-quest] circle,svg > circle')].map(rect);
  const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  const oldTexts=[...svg.querySelectorAll('g > text')].filter(t=>t.textContent.length>3).map(rect);
  const b=p.getBoundingClientRect(),s=svg.getBoundingClientRect(),legend=p.querySelector('[data-mass-place-index]');
  return {labels:[...svg.querySelectorAll('[data-mass-label] text')].map(t=>t.textContent),
   full:[...svg.querySelectorAll('[data-mass-place] title')].map(t=>t.textContent),
   details:[...p.querySelectorAll('[data-mass-place-detail]')].map(t=>t.textContent),
   boxes,texts,markers,overlaps:boxes.some((a,i)=>boxes.some((o,j)=>i!==j&&overlap(a,o))||markers.some(o=>overlap(a,o))),
   oldOverlap:oldTexts.some((a,i)=>oldTexts.some((o,j)=>i!==j&&overlap(a,o))),
   textFits:texts.every((t,i)=>t.x>=boxes[i].x-.1&&t.x+t.w<=boxes[i].x+boxes[i].w+.1&&t.y>=boxes[i].y-.1&&t.y+t.h<=boxes[i].y+boxes[i].h+.1),
   inChart:boxes.every(b=>b.x>=0&&b.y>=28&&b.x+b.w<=640&&b.y+b.h<=400),
   bounded:b.top>=0&&b.bottom<=innerHeight+.1&&s.width<=b.width,
   legend:legend?{height:legend.getBoundingClientRect().height,scroll:legend.scrollHeight}:null,
   same:before===JSON.stringify([m.state.snapshot(),w.player.pos,w.time,w.player.life,w.player.mana,w.activeQuests]),
   fatal:__game.crash().fatal,html:svg.innerHTML};
 });
 const boot=async()=>run(async()=>{
  window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
 });
 const check=(data,minPlaces=1)=>{
  assert.equal(data.fatal,null);assert.ok(data.same);assert.ok(data.bounded);
  if(!legacy){assert.ok(data.labels.length>=minPlaces+1);assert.ok(!data.overlaps);assert.ok(data.textFits&&data.inChart);
   assert.ok(data.details.some(t=>t.includes('Garrison defeated')&&t.includes('Searched')));assert.ok(data.details.length>=minPlaces);
   assert.ok(data.legend.height<=96.1);
  }
 };
 const timer=setTimeout(()=>app.exit(1),240000),results=[];
 try{
  await win.loadURL(url);await boot();await run(()=>{
   __game.devStartRun('rogue');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;
   const m=w.massRuntime;
   for(const kind of ['cinderwatch','caravan-wreck','broken-gate']){
    const p=m.journey.places.find(p=>p.content===kind);w.landPartyAt(m.journey.local(p));m.update(w,true);
    if(kind!=='broken-gate'){
     for(const [id,a] of m.natives)if(id.includes(p.id.replace(/"/g,'\\"'))&&!a.dead)w.kill(a,false,w.player);
     m.update(w,true);const chest=w.chests.find(c=>c.rewardSource===JSON.stringify([p.id,'cache']));if(chest)chest.opened=true;m.update(w,true);
    }
   }
   const north=m.journey.local(m.journey.places.find(p=>p.content==='broken-gate'));w.player.pos={x:north.x,y:north.y-450};
   m.update(w,true);__game.ui.openMapTab('map');
   document.querySelector('[data-mass-zoom="out"]').click();document.querySelector('[data-mass-zoom="out"]').click();
   __game.renderer.render(w);
  });
  let first=await inspect();check(first,3);if(legacy)assert.ok(first.oldOverlap,'prior client reproduces crowded site/home labels');results.push({stage:'regional',...first,html:undefined});await shot('regional');
  const html=first.html;await run(()=>{for(let i=0;i<15;i++)__game.ui.refreshMap();});assert.equal((await inspect()).html,html);
  // Preserve the exact native browser checkpoint without taking another simulation step.
  await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,220));});
  await win.loadURL(url);await boot();await run(async()=>{
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();__game.ui.hideAll();__game.ui.openMapTab('map');
   document.querySelector('[data-mass-zoom="out"]').click();document.querySelector('[data-mass-zoom="out"]').click();
   __game.renderer.render(__game.world());
  });
  const resumed=await inspect();check(resumed,3);assert.deepEqual(resumed.labels,first.labels);assert.deepEqual(resumed.full,first.full);assert.deepEqual(resumed.details,first.details);
  results.push({stage:'continued',...resumed,html:undefined});await shot('continued');
  await run(()=>document.querySelector('[data-mass-zoom="in"]').click());check(await inspect());await shot('regional-near');
  win.setSize(800,600);await new Promise(r=>setTimeout(r,180));await run(()=>{__game.renderer.resize();__game.ui.refreshMap();});
  const narrow=await inspect();check(narrow);results.push({stage:'narrow',...narrow,html:undefined});await shot('narrow');
  // Close detail has fewer visible places; inspect bounds rather than minimum counts.
  await run(()=>{document.querySelector('[data-mass-zoom="in"]').click();document.querySelector('[data-mass-zoom="in"]').click();});
  const close=await inspect();assert.ok(close.same&&close.bounded);if(!legacy)assert.ok(!close.overlaps&&close.textFits&&close.inChart);await shot('close');
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(r=>({stage:r.stage,labels:r.labels,details:r.details,overlaps:r.overlaps,oldOverlap:r.oldOverlap,bounded:r.bounded,same:r.same}))));
  console.log(legacy?'PASS previous client reproduces overlapping site/home labels':'PASS actual measured labels avoid text/marker collisions, full native place states, bounded normal/narrow chart, deterministic redraw and exact browser Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

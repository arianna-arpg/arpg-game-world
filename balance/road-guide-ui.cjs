// Controlled native map navigation and descriptor persistence, not an earned playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'road-guide-before':'road-guide';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/road-guide-dist');
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




 const timer=setTimeout(()=>app.exit(1),180000),results=[];
 const inspect=async name=>{
  const data=await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=document.getElementById('world-map');
   const before=JSON.stringify([m.state.snapshot(),m.sites.discovered,w.activeQuests,w.actors.map(a=>a.id),w.time]);
   __game.ui.refreshMap();
   const rows=[...p.querySelectorAll('[data-mass-road]')].map(e=>{
    const b=e.getBoundingClientRect();return {id:e.dataset.massRoad,text:e.innerText,x:b.x,right:b.right,top:b.top,bottom:b.bottom};
   }),b=p.getBoundingClientRect();
   return {rows,bounds:{x:b.x,right:b.right,top:b.top,bottom:b.bottom},width:innerWidth,height:innerHeight,
    same:before===JSON.stringify([m.state.snapshot(),m.sites.discovered,w.activeQuests,w.actors.map(a=>a.id),w.time]),
    fatal:__game.crash().fatal,roadTab:!!p.querySelector('[data-mtab="roads"]'),survey:JSON.stringify(m.state.snapshot()),seed:m.generator.run.seed};
  });
  assert.ok(data.same);assert.equal(data.fatal,null);assert.equal(data.rows.length,legacy?0:4);
  assert.equal(data.roadTab,!legacy);assert.ok(data.bounds.top>=0&&data.bounds.bottom<=data.height+.1);
  for(const row of data.rows)assert.ok(row.x>=data.bounds.x&&row.right<=data.bounds.right+.1);
  results.push({name,...data,survey:undefined});await shot(name);return data;
 };
 const clickRoads=()=>run(()=>document.querySelector('[data-mtab="roads"]')?.click());
 try{
  await win.loadURL(url);await boot();await run(()=>{
   __game.devStartRun('magician');__game.ui.hideAll();__game.world().startWorldMass(42);__game.ui.openMapTab('map');
  });
  const before=await run(()=>({state:JSON.stringify(__game.world().massRuntime.state.snapshot()),
   svg:document.querySelector('#world-map svg').innerHTML,quests:JSON.stringify(__game.world().activeQuests)}));
  await shot('map');await clickRoads();const first=await inspect('roads');
  if(!legacy){
   assert.ok(first.rows.some(r=>r.text.includes('Memorial Grove')&&r.text.includes('riddle')));
   await run(()=>document.querySelector('[data-mtab="quests"]').click());
   await run(()=>document.querySelector('[data-mtab="roads"]').click());
   assert.equal((await inspect('from-journal')).survey,before.state);
   await run(()=>document.querySelector('[data-mtab="map"]').click());
   assert.deepEqual(await run(()=>({state:JSON.stringify(__game.world().massRuntime.state.snapshot()),
    svg:document.querySelector('#world-map svg').innerHTML,quests:JSON.stringify(__game.world().activeQuests)})),before);
   await clickRoads();
  }
  await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,250));});
  await win.loadURL(url);await boot();await run(async()=>{
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();__game.ui.hideAll();__game.ui.openMapTab('map');
  });
  await clickRoads();const continued=await inspect('continued');
  assert.equal(continued.seed,first.seed);
  assert.deepEqual(continued.rows.map(r=>[r.id,r.text]),first.rows.map(r=>[r.id,r.text]));
  if(!legacy){
   win.setSize(800,600);await new Promise(r=>setTimeout(r,180));await run(()=>__game.ui.refreshMap());
   await inspect('narrow');
   await run(()=>{const p=document.getElementById('world-map');p.scrollTop=p.scrollHeight;});
   await inspect('narrow-bottom');
  }
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(r=>({name:r.name,count:r.rows.length,same:r.same,fatal:r.fatal,bounds:r.bounds}))));
  console.log(legacy?'PASS prior client keeps Map and Quests without public road notes':'PASS real Map/Roads/Quests navigation, unchanged survey/map/quests, native Continue and bounded narrow cards');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

// Native sign cartography and browser Continue in an isolated profile.
const {app,BrowserWindow,nativeImage}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');
app.setPath('userData',path.join(dir,'town-signs-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/town-signs-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const timer=setTimeout(()=>app.exit(1),120000),url='http://127.0.0.1:'+server.address().port;
 const shot=async name=>{
  await run(()=>__game.step(2));win.webContents.invalidate();await new Promise(r=>setTimeout(r,250));
  const capture=await win.webContents.capturePage();fs.writeFileSync(path.join(dir,'town-signs-'+name+'.png'),capture.toPNG());
  const point=await run(()=>{const c=document.querySelector('#world-map svg > circle:last-of-type'),r=c.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
  const size=capture.getSize(),bitmap=nativeImage.createFromPath(path.join(dir,'town-signs-'+name+'.png')).toBitmap(),index=(Math.round(point.y)*size.width+Math.round(point.x))*4;
  const pixel=bitmap.subarray(index,index+4);console.log(JSON.stringify({capture:name,point,size,pixel:[...pixel]}));
  assert.ok(Math.abs(pixel[0]-152)<16&&Math.abs(pixel[1]-220)<16&&Math.abs(pixel[2]-245)<16,
   'The actual page must paint its gold player marker, including after Continue: '+[...pixel]);
 };
 const read=()=>run(()=>{
  const w=__game.world(),m=w.massRuntime;
  const before=JSON.stringify(m.state.snapshot());__game.ui.openMapTab('map');
  const p=document.getElementById('world-map'),svg=p.querySelector('svg');
  const names=[...p.querySelectorAll('[data-mass-service] title')].map(t=>t.textContent);
  const r=p.getBoundingClientRect(),legend=p.querySelector('[data-mass-services]');
  return {names,legend:legend?.textContent,panel:{top:r.top,bottom:r.bottom,height:innerHeight},
   noKnowledgeChange:before===JSON.stringify(m.state.snapshot()),fatal:__game.crash().fatal,
   markers:[...p.querySelectorAll('[data-mass-service] circle')].map(c=>[Number(c.getAttribute('cx')),Number(c.getAttribute('cy'))]),
   viewBox:svg.getAttribute('viewBox'),html:svg.outerHTML, opacity:getComputedStyle(svg).opacity, svgBounds:{x:svg.getBoundingClientRect().x,y:svg.getBoundingClientRect().y,w:svg.getBoundingClientRect().width,h:svg.getBoundingClientRect().height}};
 });
 try{
  await win.loadURL(url);
  await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
   __game.devStartRun('rogue');__game.ui.hideAll();__game.world().startWorldMass(42);__game.step(2);
  });
  const first=await read();console.log(JSON.stringify({first:{...first,html:first.html.length}}));
  assert.ok(first.names.some(n=>n.includes('Mireille')));assert.ok(first.names.some(n=>n.includes('Brandt')));
  assert.ok(first.noKnowledgeChange);assert.equal(first.fatal,null);
  assert.ok(first.panel.top>=0&&first.panel.bottom<=first.panel.height);
  assert.ok(first.markers.every(([x,y])=>x>=12&&x<=628&&y>=28&&y<=388));await shot('nearby');
  const zoom=await run(()=>{
   const p=document.getElementById('world-map');p.querySelector('[data-mass-zoom="out"]').click();
   const regional=!p.querySelector('[data-mass-services]');p.querySelector('[data-mass-zoom="in"]').click();
   return {regional,nearby:!!p.querySelector('[data-mass-services]')};
  });assert.ok(zoom.regional&&zoom.nearby);
  await run(async()=>{
   __game.ui.hideAll();const w=__game.world(),s=w.doodads.find(d=>d.kind==='service_sign_inn');
   // A changed native sign must be a valid scenery checkpoint, not an unknown kind.
   s.rot=.2;__game.save();await new Promise(r=>setTimeout(r,250));
  });
  await win.loadURL(url);
  await run(async()=>{
   window.requestAnimationFrame=()=>0;
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();
   for(let i=0;i<80&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));
   __game.step(2);
   if(__game.world().doodads.find(d=>d.kind==='service_sign_inn').rot!==.2)throw Error('Changed service sign did not survive Continue');
  });
  const continued=await read();assert.deepEqual(continued.names,first.names);assert.deepEqual(continued.markers,first.markers);
  assert.ok(continued.noKnowledgeChange);assert.equal(continued.fatal,null);await shot('continued');

  const gone=await run(()=>{
   const w=__game.world();w.doodads=w.doodads.filter(d=>d.kind!=='service_sign_inn');
   __game.ui.refreshMap();return document.querySelector('[data-mass-services]').textContent;
  });assert.ok(!gone.includes('Mireille'));
  fs.writeFileSync(path.join(dir,'town-signs-ui.json'),JSON.stringify({first,zoom,continued,gone},null,2));
  console.log('PASS real sign locations and legend, bounded map/zoom, no surveyed-ground grants, changed-sign Continue and removed sign withdrawal');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

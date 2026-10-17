// NativeRegional isolated built-client course. Controlled arrivals and short
// native movement samples; these screenshots are not a full combat playthrough.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const nativeWoodland=process.env.HOLLOW_WAKE_NATIVE_WOODLAND==='1',seed=nativeWoodland?713:42;
const nativeSeating=nativeWoodland||process.env.HOLLOW_WAKE_NATIVE_SEATING==='1',prefix=nativeWoodland?'native-woodland':nativeSeating?'native-seating':'native-regional';
const reports=path.join(__dirname,'reports');fs.mkdirSync(reports,{recursive:true});
app.setPath('userData',path.join(reports,prefix+'-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,process.env.HOLLOW_WAKE_NATIVE_REGIONAL_DIST??('../.claude/'+prefix+'.local.work/dist')),report={errors:[],method:'Default seed'+seed+' naturally admitted complete native locales; controlled arrivals, native movement, body clearance, scenery mutation, durable cold Continue.'};
 const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port,win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{offscreen:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')report.errors.push(e.message);});
 const run=async(fn,...args)=>{const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!r.ok)throw Error(r.error);return r.value;};
 const boot=async()=>{await win.loadURL(url);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});for(let i=0;i<100&&!window.__game;i++)await new Promise(r=>setTimeout(r,100));if(!window.__game)throw Error('Missing game');await new Promise(r=>setTimeout(r,200));});};
 const save=()=>fs.writeFileSync(path.join(reports,prefix+'-ui.json'),JSON.stringify(report,null,2));
 const shot=async name=>{await run(()=>__game.renderer.render(__game.world()));win.webContents.invalidate();await new Promise(r=>setTimeout(r,120));const file=path.join(reports,prefix+'-'+name+'.png');fs.writeFileSync(file,(await win.webContents.capturePage()).toPNG());return file;};
 const timer=setTimeout(()=>{save();console.error('Native regional acceptance timed out');app.exit(1);},300000);
 const helpers=plans=>{
  window.__nrPlans=plans;
  window.__nrLocal=(at,p={x:0,y:0})=>{const m=__game.world().massRuntime,s=m.config.terrain.addressSpan;return {x:Number(BigInt(at.cx)-BigInt(m.origin.cx))*s+at.x+p.x,y:Number(BigInt(at.cy)-BigInt(m.origin.cy))*s+at.y+p.y};};
  window.__nrArrive=(index,terminal)=>{
   const w=__game.world(),m=w.massRuntime,p=window.__nrPlans[index];w.player.invulnerable=true;
   w.landPartyAt(window.__nrLocal(p.origin,p.source.terminals[terminal]));m.update(w,true);__game.ui.hideAll();
   const actual=m.generator.nativeRegional.formationAt(m.walk.at(w.player.pos.x,w.player.pos.y));if(actual?.id!==p.id)throw Error('Native region lost at arrival');
   const source=p.source,center=window.__nrLocal(p.origin,{x:source.geometry.width/2,y:source.geometry.height/2});
   const nativePlace=m.placesInCell(m.walk.at(w.player.pos.x,w.player.pos.y)).find(s=>s.id===p.id);
   if(!nativePlace||m.populationFor(nativePlace).level!==m.levelAt(center))throw Error('Native region lost geographic level');
   const content=m.config.content.find(c=>c.id==='nativeRegional/'+source.id),owned=content.site.doodads.map(d=>w.doodads.find(v=>v.kind===d.kind&&Math.hypot(v.pos.x-center.x-d.pos.x,v.pos.y-center.y-d.pos.y)<.01));
   if(!owned.every(Boolean))throw Error('Incomplete native scenery');
   const bodies=w.actors.filter(a=>a.team==='enemy'&&!a.dead&&Math.hypot(a.pos.x-w.player.pos.x,a.pos.y-w.player.pos.y)<1500);
   for(const a of bodies)if(w.pointInSolid(a.pos.x,a.pos.y,a.radius))throw Error('Body blocked at admission');
   return {id:p.id,program:source.program,variant:source.variant,size:source.plan.size,terminal,level:m.populationFor(nativePlace).level,scenery:owned.length,bodies:bodies.length,pos:{...w.player.pos}};
  };
  window.__nrState=()=>{
   const w=__game.world(),m=w.massRuntime,s=m.snapshot(w);
   return {schema:s.schema,config:m.configHash,origin:m.origin,player:{...w.player.pos},changes:s.sites.changes,
    geometry:window.__nrPlans.map(p=>{const actual=m.generator.nativeRegional.formationAt(p.origin);return {id:actual?.id,hash:actual?.source.hash,rows:actual?.source.geometry.rows};}),fatal:__game.crash().fatal};
  };
 };
 try{
  let coordinates=[[5,-8],[2,-4],[-1,-1]];
  if(nativeWoodland)coordinates=[[-1,23]];
  else if(nativeSeating){
   const survey=JSON.parse(fs.readFileSync(path.join(reports,'native-seating-survey.json'),'utf8')).find(r=>r.sourceFit.seed===42);
   const added=survey.sourceFit.accepted.filter(p=>!survey.historical.accepted.some(h=>h.x===p.x&&h.y===p.y));
   const large=survey.sourceFit.accepted.find(p=>p.width===4800);assert.ok(large,'original large region retained');
   assert.equal(added.length,2,'two additional natural waterland sources');coordinates=[...added,large].map(p=>[p.x,p.y]);
  }
  await boot();report.search=await run((coordinates,historical,seed)=>{
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(seed);
   if(historical){const previous=w.massRuntime,config=JSON.parse(JSON.stringify(previous.config));delete config.terrain.nativeRegional.seating;
    const legacy=new previous.constructor(seed,'expedition:'+seed,config);previous.dispose();w.massRuntime=null;legacy.attach(w);}
   w.player.invulnerable=true;__game.step(1);
   document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Walk on')b.click();});__game.ui.hideAll();
   const m=w.massRuntime,plans=coordinates.map(([x,y])=>m.generator.nativeRegional.candidate('surface',BigInt(x),BigInt(y))).filter(Boolean);
   if(plans.length!==coordinates.length)throw Error('Natural regions missing');
   if(seed===713&&(plans[0].recipe!=='nativeRegional-woodland'||plans[0].source.program!=='sacred_groves'))throw Error('Natural woodland source missing');
   return {plans,coverage:m.config.terrain.nativeRegional.coverage.length,supported:m.config.terrain.nativeRegional.sources.length};
  },coordinates,!nativeSeating,seed);save();await run(helpers,report.search.plans);
  const sheet=await run(()=>{
   const plans=window.__nrPlans,canvas=document.createElement('canvas');canvas.width=plans.length*440;canvas.height=490;const c=canvas.getContext('2d');c.fillStyle='#172019';c.fillRect(0,0,canvas.width,canvas.height);
   plans.forEach((p,i)=>{const g=p.source.geometry,unit=390/(g.width/30),ox=i*440+20,oy=62;c.fillStyle='#ede6cf';c.font='15px sans-serif';c.fillText(p.source.program,ox,24);c.font='12px sans-serif';c.fillText(p.source.variant+' / '+g.width+' × '+g.height,ox,44);
    g.rows.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='.')return;const r=g.materials[v.charCodeAt(0)-65];c.fillStyle={ground:'#899362',wall:'#394032',water:'#326982',locale_river:'#326982',locale_bridge:'#bda374'}[r]||'#687456';c.fillRect(ox+x*unit,oy+y*unit,unit+.2,unit+.2);}));
    c.fillStyle='#ebc579';p.source.terminals.slice(4).forEach(t=>{c.beginPath();c.arc(ox+t.x/30*unit,oy+t.y/30*unit,3,0,Math.PI*2);c.fill();});
   });return canvas.toDataURL('image/png');
  });fs.writeFileSync(path.join(reports,prefix+'-contact.png'),Buffer.from(sheet.split(',')[1],'base64'));
  report.routes=[];
  for(let i=0;i<report.search.plans.length;i++)for(const terminal of [4,5]){
   const arrival=await run((i,t)=>window.__nrArrive(i,t),i,terminal);
   const movement=await run(async()=>{
    const w=__game.world(),start={...w.player.pos};let goal;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const p={x:start.x+dx*75,y:start.y+dy*75};if(Array.from({length:11},(_,i)=>({x:start.x+dx*i*7.5,y:start.y+dy*i*7.5})).every(q=>w.walk.isWalkable(q.x,q.y)&&!w.pointInSolid(q.x,q.y,w.player.radius))){goal=p;break;}}
    if(!goal)throw Error('No body-clear native movement sample');let frames=0;
    try{__game.devInput(()=>({dx:goal.x-w.player.pos.x,dy:goal.y-w.player.pos.y,aim:goal,held:[],edge:[]}));while(Math.hypot(w.player.pos.x-goal.x,w.player.pos.y-goal.y)>12&&frames<100){__game.step(1);frames++;if(frames%20===0)await new Promise(r=>setTimeout(r,0));}}finally{__game.devInput(null);}
    return {frames,distance:Math.hypot(w.player.pos.x-start.x,w.player.pos.y-start.y),fatal:__game.crash().fatal};
   });assert.ok(movement.distance>45);report.routes.push({arrival,movement,image:await shot(i+'-'+terminal)});save();
  }
  report.mutation=await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=window.__nrPlans[window.__nrPlans.length-1],g=p.source.geometry,center=window.__nrLocal(p.origin,{x:g.width/2,y:g.height/2});
   const d=m.config.content.find(c=>c.id==='nativeRegional/'+p.source.id).site.doodads[0],live=w.doodads.find(v=>v.kind===d.kind&&Math.hypot(v.pos.x-center.x-d.pos.x,v.pos.y-center.y-d.pos.y)<.01);
   if(!live)throw Error('Missing native scenery mutation target');w.doodads=w.doodads.filter(v=>v!==live);w.markDoodadsChanged();return {owner:p.id,kind:d.kind};
  });
  const before=await run(()=>window.__nrState());assert.equal(before.schema,nativeSeating?18:17);
  await run(async()=>{__game.save();await __game.flushRunSave();});await boot();
  await run(async()=>{for(let i=0;i<100&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('Continue unavailable');b.click();for(let i=0;i<100&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));__game.ui.hideAll();});
  await run(helpers,report.search.plans);const after=await run(()=>window.__nrState());assert.deepEqual(after,before,'complete native terrain and scenery changes survive cold Continue');
  report.continue={schema:after.schema,regions:after.geometry.map(p=>({id:p.id,hash:p.hash})),changes:after.changes.length,image:await shot('continued')};
  assert.ok(report.routes.some(r=>r.arrival.bodies>0));assert.deepEqual(report.errors,[]);save();
  console.log('PASS native regional default admission, '+report.routes.length+' native movement/body-clear views, complete scenery and cold durable Continue');clearTimeout(timer);win.destroy();server.close();app.exit(0);
 }catch(error){report.failure=String(error.stack||error);try{report.failureImage=await shot('failure');}catch{}save();console.error(error);clearTimeout(timer);app.exit(1);}
});

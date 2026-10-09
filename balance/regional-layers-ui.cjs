// Isolated built-client acceptance of generated court shapes and native POIs.
// Arrival teleports and an invulnerable hero isolate the native interactions;
// foreign enemies are moved away without changing site, reward or terrain rules.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const reports=path.join(__dirname,'reports');fs.mkdirSync(reports,{recursive:true});
app.setPath('userData',path.join(reports,'regional-layers-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'../.claude/regional-layers.local.work/dist'),report={errors:[],method:'Unmodified seed42 default; controlled arrival, native walking/dwell/Firebolt/nova, cold browser Continue.'};
 const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port,win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{offscreen:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')report.errors.push(e.message);});
 const run=async(fn,...args)=>{const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!r.ok)throw Error(r.error);return r.value;};
 const boot=async()=>{await win.loadURL(url);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});for(let i=0;i<100&&!window.__game;i++)await new Promise(r=>setTimeout(r,100));if(!window.__game)throw Error('Missing game');await new Promise(r=>setTimeout(r,200));});};
 const shot=async name=>{await run(()=>__game.renderer.render(__game.world()));win.webContents.invalidate();await new Promise(r=>setTimeout(r,120));const file=path.join(reports,'regional-layers-'+name+'.png');fs.writeFileSync(file,(await win.webContents.capturePage()).toPNG());return file;};
 const saveReport=()=>fs.writeFileSync(path.join(reports,'regional-layers-ui.json'),JSON.stringify(report,null,2));
 const timer=setTimeout(()=>{saveReport();console.error('Regional layers client acceptance timed out');app.exit(1);},300000);
 const helpers=targets=>{
  window.__layerTargets=targets;
  window.__layerLocal=at=>{const m=__game.world().massRuntime,s=m.config.terrain.addressSpan;return{x:Number(BigInt(at.cx)-BigInt(m.origin.cx))*s+at.x,y:Number(BigInt(at.cy)-BigInt(m.origin.cy))*s+at.y};};
  window.__layerQuiet=()=>{const w=__game.world();w.player.invulnerable=true;for(const a of w.actors)if(a!==w.player&&!a.puzzleNode&&!a.dead)a.pos={x:w.player.pos.x+12000,y:w.player.pos.y+12000};};
  window.__layerArrive=kind=>{const w=__game.world(),m=w.massRuntime,p=window.__layerTargets[kind],q=window.__layerLocal(p.center);
   const resolved=m.placesInCell(p.center).find(r=>r.id===p.id);if(!resolved)throw Error('Regional owner not published: '+kind);
   w.landPartyAt(q);m.update(w,true);window.__layerQuiet();__game.ui.hideAll();
   const level=m.populationFor(p).level,geographic=m.levelAt(q);if(level!==geographic||level<=1)throw Error('Regional content lost geographic level: '+JSON.stringify({kind,level,geographic}));
   return {id:p.id,content:p.content,pos:{...w.player.pos},level,geographic,source:p.source,ancestry:p.regionalSocket};
  };
  window.__layerPuzzle=()=>{const w=__game.world(),p=window.__layerTargets.puzzle,row=w.massRuntime.config.content.find(c=>c.id===p.content).site.puzzles[0],id=JSON.stringify([p.id,'puzzle',row.id]);const r=w.puzzles.find(r=>r.id===id);if(!r)throw Error('Native socket puzzle not admitted');return r;};
  window.__layerObserve=()=>{const w=__game.world(),p=window.__layerPuzzle();window.__layerEvents={hits:0,payments:0};const hit=w.puzzleStruck,complete=w.completePuzzle;
   w.puzzleStruck=function(node,...args){if(node.puzzleNode?.id===p.id)window.__layerEvents.hits++;return hit.call(this,node,...args);};
   w.completePuzzle=function(r,...args){if(r.id===p.id&&!r.done)window.__layerEvents.payments++;return complete.call(this,r,...args);};
  };
  window.__layerState=()=>{const w=__game.world(),m=w.massRuntime,t=window.__layerTargets,ids=new Set(Object.values(t).map(p=>p.id)),snapshot=m.snapshot(w);
   return {schema:snapshot.schema,config:m.configHash,pos:{...w.player.pos},origin:{...m.origin},
    shrines:m.shrines.snapshot().filter(s=>s.place&&ids.has(s.place.id)),puzzles:m.puzzles.snapshot(w).filter(s=>s.place&&ids.has(s.place.id)),
    chests:w.chests.filter(c=>c.rewardSource===JSON.stringify([t.cache.id,'cache'])).map(c=>({rewardSource:c.rewardSource,opened:c.opened,lockTime:c.lockTime,rewardLevel:c.rewardLevel,pos:c.pos})),
    geometry:Object.values(t).map(p=>{const plan=m.generator.landforms.regionalLandforms.formationAt(p.center);return {owner:p.id,parent:plan?.id,rows:JSON.stringify(plan?.shape.rows),source:JSON.stringify(plan?.shape.grammar)};}),
    drops:snapshot.contents.drops,items:w.meta.items,fatal:__game.crash().fatal};
  };
 };
 const resume=async targets=>{const before=await run(()=>window.__layerState());await run(async()=>{__game.save();await __game.flushRunSave();});await boot();await run(async()=>{
  for(let i=0;i<100&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('Continue unavailable');b.click();for(let i=0;i<100&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));__game.ui.hideAll();
 });await run(helpers,targets);const after=await run(()=>window.__layerState());assert.deepEqual(after,before,'exact native progress, owners, levels, loot and terrain survive cold Continue');return {schema:after.schema,owners:after.geometry.map(g=>({owner:g.owner,parent:g.parent})),shrines:after.shrines,puzzles:after.puzzles,chests:after.chests,fatal:after.fatal};};
 try{
  await boot();report.search=await run(async()=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;__game.step(1);document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Walk on')b.click();});__game.ui.hideAll();
   const m=w.massRuntime;if(!m.config.terrain.landforms.regional.composition.morphology||!m.generator.regionalDiscoveries)throw Error('Default layered generation missing');
   const targets={},plans=[],seen=new Set(),families=new Set(),coordinates=[[-1,0],[-1,-5],[-1,-4],[1,1],[-4,4],[-4,2]];let checked=0;
   for(let r=0;r<=12;r++)for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(Math.max(Math.abs(x),Math.abs(y))===r)coordinates.push([x,y]);
   for(const [x,y] of coordinates){
    const p=m.generator.landforms.regionalLandforms.formationAt({dimension:'surface',cx:String(x*10+5),cy:String(y*10+5),x:0,y:0});checked++;
    if(checked%12===0)await new Promise(r=>setTimeout(r,0));if(!p||seen.has(p.id)||!p.shape.grammar)continue;seen.add(p.id);
    const sockets=m.generator.regionalDiscoveries.forPlan(p),before=families.size;for(const node of p.shape.grammar.nodes)if(node.court)families.add(node.court.family);
    let selected=false;for(const socket of sockets){const site=m.config.content.find(c=>c.id===socket.content)?.site;
     const kind=site?.cache?'cache':site?.shrines?.length?'shrine':site?.puzzles?.[0]?.spec.kind==='ember'?'puzzle':null;
     if(kind&&!targets[kind]&&m.placesInCell(socket.center).some(q=>q.id===socket.id)){targets[kind]=socket;selected=true;}
    }
    if(selected||plans.length<3||before<families.size)plans.push({plan:p,sockets});
    if(targets.cache&&targets.shrine&&targets.puzzle&&families.size>=7&&plans.length>=3)break;
   }
   if(!targets.cache||!targets.shrine||!targets.puzzle||families.size<7)throw Error('Bounded default search missed varied courts/native owners: '+JSON.stringify({checked,found:Object.keys(targets),families:[...families]}));
   window.__layerPlans=plans;return {checked,families:[...families],targets,plans:plans.map(({plan:p,sockets})=>({id:p.id,shape:p.shape.id,recipe:p.recipe.id,extent:p.shape.params.extent,courts:p.shape.grammar.nodes.map(n=>n.court.family),sockets:sockets.map(s=>({id:s.id,content:s.content,center:s.center,ancestry:s.regionalSocket}))}))};
  });saveReport();await run(helpers,report.search.targets);
  const sheet=await run(()=>{const plans=window.__layerPlans,cols=3,width=430,height=485,canvas=document.createElement('canvas');canvas.width=cols*width;canvas.height=Math.ceil(plans.length/cols)*height;const ctx=canvas.getContext('2d');ctx.fillStyle='#111916';ctx.fillRect(0,0,canvas.width,canvas.height);
   plans.forEach(({plan:p,sockets},i)=>{const s=p.shape,ox=i%cols*width+18,oy=Math.floor(i/cols)*height+54,n=s.rows.length,unit=388/n,span=__game.world().massRuntime.config.terrain.addressSpan;
    ctx.fillStyle='#eee8d5';ctx.font='14px sans-serif';ctx.fillText(s.id+' / '+p.recipe.id,ox,oy-30);ctx.fillStyle='#aec6af';ctx.font='12px sans-serif';ctx.fillText([...new Set(s.grammar.nodes.map(n=>n.court.family))].join(' · '),ox,oy-12);
    s.rows.forEach((row,y)=>[...row].forEach((c,x)=>{ctx.fillStyle={'.':'#374433',g:'#83945b',b:'#20291f',w:'#398596',c:'#b7a66b'}[c];ctx.fillRect(ox+x*unit,oy+y*unit,unit+.2,unit+.2);}));
    ctx.strokeStyle='#e0c783';ctx.lineWidth=1.5;for(const child of s.components??[])ctx.strokeRect(ox+child.x*unit,oy+child.y*unit,child.size*unit,child.size*unit);
    sockets.forEach((socket,j)=>{const x=Number(BigInt(socket.center.cx)-BigInt(p.origin.cx))*span+socket.center.x-p.origin.x,y=Number(BigInt(socket.center.cy)-BigInt(p.origin.cy))*span+socket.center.y-p.origin.y;ctx.beginPath();ctx.arc(ox+x/30*unit,oy+y/30*unit,5,0,Math.PI*2);ctx.fillStyle='#ffd75e';ctx.fill();ctx.strokeStyle='#101813';ctx.stroke();ctx.fillStyle='#fff0ab';ctx.font='bold 12px sans-serif';ctx.fillText(String(j+1),ox+x/30*unit+7,oy+y/30*unit-5);
     ctx.font='11px sans-serif';ctx.fillStyle='#e6dab9';ctx.fillText((j+1)+'. '+socket.content.replace('regional-discovery-','')+' / court '+socket.regionalSocket.court,ox,oy+405+j*13);
    });
   });return canvas.toDataURL('image/png');});fs.writeFileSync(path.join(reports,'regional-layers-contact.png'),Buffer.from(sheet.split(',')[1],'base64'));
  report.cache=await run(async()=>{const arrival=window.__layerArrive('cache'),w=__game.world(),p=window.__layerTargets.cache,source=JSON.stringify([p.id,'cache']),c=w.chests.find(c=>c.rewardSource===source);if(!c)throw Error('Native socket cache missing');if(c.rewardLevel!==arrival.level)throw Error('Cache reward lost geographic level');let openings=0;const open=w.openChest;w.openChest=function(chest){if(chest===c&&!chest.opened)openings++;return open.call(this,chest);};w.landPartyAt(c.pos);let frames=0;
   try{__game.devInput(()=>({dx:0,dy:0,aim:c.pos,held:[],edge:[]}));while(!c.opened&&frames<360){__game.step(1);frames++;if(frames%30===0)await new Promise(r=>setTimeout(r,0));}}finally{__game.devInput(null);}
   return {arrival,source,frames,opened:c.opened,openings,rewardLevel:c.rewardLevel,fatal:__game.crash().fatal};});assert.ok(report.cache.opened);assert.equal(report.cache.openings,1);report.cache.image=await shot('native-cache');saveReport();
  report.shrine=await run(async()=>{const arrival=window.__layerArrive('shrine'),w=__game.world(),p=window.__layerTargets.shrine,row=w.massRuntime.config.content.find(c=>c.id===p.content).site.shrines[0],id=JSON.stringify([p.id,'shrine',row.id]),s=w.shrines.find(s=>s.massSource===id);if(!s)throw Error('Native socket shrine missing');
   let start;for(let i=0;i<24&&!start;i++){const a=i/24*Math.PI*2,q={x:s.pos.x+Math.cos(a)*105,y:s.pos.y+Math.sin(a)*105};if(Array.from({length:22},(_,j)=>({x:s.pos.x+(q.x-s.pos.x)*j/21,y:s.pos.y+(q.y-s.pos.y)*j/21})).every(q=>w.walk.isWalkable(q.x,q.y)&&!w.pointInSolid(q.x,q.y,w.player.radius)))start=q;}
   if(!start)throw Error('No native shrine approach');w.landPartyAt(start);let frames=0;try{__game.devInput(()=>({dx:s.pos.x-w.player.pos.x,dy:s.pos.y-w.player.pos.y,aim:s.pos,held:[],edge:[]}));while(!s.used&&frames<120){__game.step(1);frames++;if(frames%30===0)await new Promise(r=>setTimeout(r,0));}}finally{__game.devInput(null);}
   return {arrival,id,kind:row.id,used:s.used,frames,buff:w.player.buffs.has('shrine_'+row.id),fatal:__game.crash().fatal};});assert.ok(report.shrine.used&&report.shrine.buff);report.shrine.image=await shot('native-shrine');saveReport();
  report.puzzle=await run(()=>{const arrival=window.__layerArrive('puzzle'),w=__game.world(),r=window.__layerPuzzle();if(r.rewardLevel!==arrival.level||r.nodes.some(n=>n.level!==arrival.level))throw Error('Puzzle lost geographic level');w.landPartyAt(r.at);w.player.fillResources();window.__layerObserve();return{arrival,id:r.id,kind:r.spec.kind,nodes:r.nodes.length,rewardLevel:r.rewardLevel};});report.puzzle.arrivalImage=await shot('native-puzzle');
  report.puzzle.first=await run(async()=>{const w=__game.world(),r=window.__layerPuzzle(),n=r.nodes[0];let frames=0;try{__game.devInput(()=>({dx:0,dy:0,aim:n.pos,held:[true,false,false],edge:[]}));while(!r.state.litUntil.some(t=>t>w.time)&&frames<240){__game.step(1);frames++;if(w.projectiles.some(p=>p.caster===w.player))__game.devInput(()=>({dx:0,dy:0,aim:n.pos,held:[],edge:[]}));if(frames%30===0)await new Promise(r=>setTimeout(r,0));}}finally{__game.devInput(null);}return{frames,hits:window.__layerEvents.hits,done:r.done,lit:r.state.litUntil.map(t=>Math.max(0,t-w.time)),fatal:__game.crash().fatal};});assert.ok(report.puzzle.first.hits>0&&report.puzzle.first.lit.some(t=>t>0)&&!report.puzzle.first.done);report.puzzle.partialImage=await shot('puzzle-partial');
  report.partialContinue=await resume(report.search.targets);await run(()=>{window.__layerQuiet();window.__layerObserve();});saveReport();
  report.puzzle.solved=await run(async()=>{const w=__game.world(),r=window.__layerPuzzle();w.player.fillResources();let frames=0;try{__game.devInput(()=>({dx:0,dy:0,aim:{x:r.at.x+100,y:r.at.y},held:[false,true,false],edge:[]}));while(!r.done&&frames<240){__game.step(1);frames++;if(frames%30===0)await new Promise(r=>setTimeout(r,0));}}finally{__game.devInput(null);}return{frames,done:r.done,payments:window.__layerEvents.payments,progress:w.massRuntime.puzzles.snapshot(w).find(s=>s.id===r.id),fatal:__game.crash().fatal};});assert.ok(report.puzzle.solved.done);assert.equal(report.puzzle.solved.payments,1);report.puzzle.solvedImage=await shot('puzzle-solved');
  report.solvedContinue=await resume(report.search.targets);await run(()=>{window.__layerQuiet();window.__layerObserve();});report.puzzle.revisit=await run(async()=>{const w=__game.world(),r=window.__layerPuzzle(),n=r.nodes[0],before=JSON.stringify(w.massRuntime.snapshot(w).contents.drops);w.player.fillResources();try{__game.devInput(()=>({dx:0,dy:0,aim:n.pos,held:[true,false,false],edge:[]}));for(let i=0;i<80;i++){__game.step(1);if(i%30===0)await new Promise(r=>setTimeout(r,0));}}finally{__game.devInput(null);}return {done:r.done,payments:window.__layerEvents.payments,sameDrops:before===JSON.stringify(w.massRuntime.snapshot(w).contents.drops),fatal:__game.crash().fatal};});assert.ok(report.puzzle.revisit.done);assert.equal(report.puzzle.revisit.payments,0);
  report.spentRevisit=await run(()=>{window.__layerArrive('cache');const w=__game.world(),p=window.__layerTargets.cache,chests=w.chests.filter(c=>c.rewardSource===JSON.stringify([p.id,'cache']));if(chests.length!==1||!chests[0].opened)throw Error('Opened regional cache reset or duplicated');window.__layerArrive('shrine');const target=window.__layerTargets.shrine,row=w.massRuntime.config.content.find(c=>c.id===target.content).site.shrines[0],id=JSON.stringify([target.id,'shrine',row.id]),shrines=w.shrines.filter(s=>s.massSource===id);if(shrines.length!==1||!shrines[0].used)throw Error('Spent regional shrine reset or duplicated');w.player.updateTimers(1000);w.landPartyAt(shrines[0].pos);__game.step(4);return {cacheCount:chests.length,cacheOpened:chests[0].opened,shrineCount:shrines.length,shrineUsed:shrines[0].used,noRenewedBuff:!w.player.buffs.has('shrine_'+row.id),fatal:__game.crash().fatal};});assert.ok(report.spentRevisit.noRenewedBuff);report.continuedImage=await shot('continued-spent-shrine');
  assert.equal(report.spentRevisit.fatal,null);assert.deepEqual(report.errors,[]);saveReport();console.log('PASS default varied courts, nested native socket owners, cache/shrine/Firebolt/nova interactions, geographic levels, exact partial/solved cold Continue and once-only revisit');clearTimeout(timer);win.destroy();server.close();app.exit(0);
 }catch(error){report.failure=String(error.stack||error);try{report.failureImage=await shot('failure');}catch{}saveReport();console.error(error);clearTimeout(timer);app.exit(1);}
});

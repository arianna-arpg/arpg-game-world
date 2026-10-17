// Isolated schema-16 woven terrain course. The separately developed native
// regional provider is omitted from a copied default descriptor; all woven
// terrain, native discovery content and native interaction rules stay intact.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const reports=path.join(__dirname,'reports');fs.mkdirSync(reports,{recursive:true});
app.setPath('userData',path.join(reports,'regional-weave-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'../.claude/regional-weave.local.work/dist');
 const report={errors:[],storageScope:'preview:seamless-regional-weave-qa',method:'Seed42 default clone omits only terrain.nativeRegional to isolate schema16. Controlled arrivals, real collision, native movement/cache dwell and cold Continue.'};
 const save=()=>fs.writeFileSync(path.join(reports,'regional-weave-ui.json'),JSON.stringify(report,null,2));
 const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{offscreen:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')report.errors.push(e.message);});
 const run=async(fn,...args)=>{const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!r.ok)throw Error(r.error);return r.value;};
 const boot=async()=>{await win.loadURL(url);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});for(let i=0;i<100&&!window.__game;i++)await new Promise(r=>setTimeout(r,100));if(!window.__game)throw Error('Missing game');await new Promise(r=>setTimeout(r,200));});};
 const shot=async name=>{await run(()=>__game.renderer.render(__game.world()));win.webContents.invalidate();await new Promise(r=>setTimeout(r,120));const file=path.join(reports,'regional-weave-'+name+'.png');fs.writeFileSync(file,(await win.webContents.capturePage()).toPNG());return file;};
 const helpers=()=>{
  window.__weaveLocal=at=>{const m=__game.world().massRuntime,s=m.config.terrain.addressSpan;return{x:Number(BigInt(at.cx)-BigInt(m.origin.cx))*s+at.x,y:Number(BigInt(at.cy)-BigInt(m.origin.cy))*s+at.y};};
  window.__weaveQuiet=()=>{const w=__game.world();w.player.invulnerable=true;for(const a of w.actors)if(a!==w.player&&!a.puzzleNode&&!a.dead){a.pos={x:w.player.pos.x+12000,y:w.player.pos.y+12000};a.aiAnchor={...a.pos};}};
 };
 const timer=setTimeout(()=>{save();console.error('Regional weave client acceptance timed out');app.exit(1);},300000);
 try{
  await boot();await run(helpers);
  report.search=await run(async()=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const previous=w.massRuntime,C=previous.constructor,config=JSON.parse(JSON.stringify(previous.config));delete config.terrain.nativeRegional;previous.dispose();new C(42,'expedition:42',config).attach(w);
   w.player.invulnerable=true;__game.step(1);document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Walk on')b.click();});__game.ui.hideAll();
   const m=w.massRuntime,grammar=m.config.terrain.landforms.regional.composition;
   if(!grammar.weave||grammar.morphology.version!==2||m.config.terrain.nativeRegional||m.snapshot(w).schema!==16)throw Error('Isolated woven schema16 default missing');
   const coordinates=[[2,2],[-1,0],[-1,-5],[-1,-4],[1,1],[-4,4],[-4,2],[2,-2],[-3,-2]],seenCoordinates=new Set(),seen=new Set(),plans=[],families=new Set(),styles=new Set();let target,checked=0;
   for(let r=0;r<=6;r++)for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(Math.max(Math.abs(x),Math.abs(y))===r)coordinates.push([x,y]);
   for(const [x,y]of coordinates){const key=x+','+y;if(seenCoordinates.has(key))continue;seenCoordinates.add(key);checked++;
    const p=m.generator.landforms.regionalLandforms.formationAt({dimension:'surface',cx:String(x*10+5),cy:String(y*10+5),x:0,y:0});if(checked%8===0)await new Promise(r=>setTimeout(r,0));
    if(!p||seen.has(p.id)||!p.shape.grammar)continue;seen.add(p.id);const graph=p.shape.grammar;
    for(const node of graph.nodes)if(node.court)families.add(node.court.family);for(const edge of graph.edges)styles.add(edge.style);
    const edges=graph.edges.map((edge,index)=>{const length=edge.points.slice(1).reduce((sum,q,i)=>sum+Math.hypot(q.x-edge.points[i].x,q.y-edge.points[i].y),0),first=edge.points[0],last=edge.points.at(-1),direct=Math.hypot(last.x-first.x,last.y-first.y);
     const exposed=edge.points.filter(q=>graph.nodes.every(n=>Math.hypot(q.x-n.x,q.y-n.y)>n.radius+1)&&['g','c'].includes(p.shape.rows[Math.round(q.y)]?.[Math.round(q.x)]));
     return{index,style:edge.style,length:length*30,direct:direct*30,ratio:length/direct,exposed:exposed.length,points:exposed};
    }).filter(e=>e.style&&e.style!=='direct'&&e.exposed>=2&&graph.edges[e.index].a<8&&graph.edges[e.index].b<8).sort((a,b)=>(b.ratio-1)*b.exposed-(a.ratio-1)*a.exposed);
    const sockets=m.generator.regionalDiscoveries.forPlan(p);let ownsTarget=false;
    if(!target)for(const socket of sockets){const site=m.config.content.find(c=>c.id===socket.content)?.site;if(site?.cache&&m.placesInCell(socket.center).some(q=>q.id===socket.id)){target=socket;ownsTarget=true;break;}}
    if(edges.length||ownsTarget)plans.push({plan:p,sockets,edges,coordinates:[x,y]});
    if(plans.length>=4&&target&&styles.size>=4&&['fan','hammerhead','fork','terrace'].filter(f=>families.has(f)).length>=3&&plans.some(p=>p.edges[0]?.ratio>1.15))break;
   }
   if(!target||plans.length<3||styles.size<3||!plans.some(p=>p.edges[0]?.ratio>1.1))throw Error('Bounded woven terrain search missed required variety: '+JSON.stringify({checked,plans:plans.length,styles:[...styles],target:!!target}));
   const ranked=plans.filter(p=>p.edges.length).sort((a,b)=>(b.edges[0].ratio-1)*b.edges[0].exposed-(a.edges[0].ratio-1)*a.edges[0].exposed),selected=ranked.slice(0,5),owner=plans.find(p=>p.plan.id===target.regionalSocket.formation);if(owner&&!selected.includes(owner))selected.push(owner);
   const winding=ranked.filter(p=>p.edges.some(e=>['meander','switchback'].includes(e.style))).map(p=>({...p,edges:[...p.edges.filter(e=>['meander','switchback'].includes(e.style)),...p.edges.filter(e=>!['meander','switchback'].includes(e.style))]}));
   if(winding.length<2)throw Error('Need two exposed meander/switchback formations for route views');
   window.__weavePlans=selected;window.__weaveTarget=target;window.__weaveFocus=winding.slice(0,2);
   return{checked,schema:m.snapshot(w).schema,families:[...families],styles:[...styles],target,plans:selected.map(({plan:p,sockets,edges,coordinates})=>({id:p.id,shape:p.shape.id,recipe:p.recipe.id,coordinates,courts:p.shape.grammar.nodes.map(n=>n.court.family),edges:edges.map(({points,...edge})=>edge),sockets:sockets.map(s=>({id:s.id,content:s.content,center:s.center,ancestry:s.regionalSocket}))}))};
  });save();
  const sheet=await run(()=>{const plans=window.__weavePlans,cols=plans.length<=4?2:3,width=430,height=500,canvas=document.createElement('canvas');canvas.width=cols*width;canvas.height=Math.ceil(plans.length/cols)*height;const ctx=canvas.getContext('2d');ctx.fillStyle='#111916';ctx.fillRect(0,0,canvas.width,canvas.height);
   plans.forEach(({plan:p,sockets,edges},i)=>{const s=p.shape,ox=i%cols*width+18,oy=Math.floor(i/cols)*height+60,n=s.rows.length,unit=388/n,span=__game.world().massRuntime.config.terrain.addressSpan;
    ctx.fillStyle='#eee8d5';ctx.font='14px sans-serif';ctx.fillText(s.id+' / '+p.recipe.id,ox,oy-34);ctx.fillStyle='#aec6af';ctx.font='11px sans-serif';ctx.fillText([...new Set(s.grammar.nodes.map(n=>n.court.family))].join(' · '),ox,oy-17);
    s.rows.forEach((row,y)=>[...row].forEach((c,x)=>{ctx.fillStyle={'.':'#374433',g:'#83945b',b:'#20291f',w:'#398596',c:'#b7a66b'}[c];ctx.fillRect(ox+x*unit,oy+y*unit,unit+.2,unit+.2);}));
    for(const e of s.grammar.edges){ctx.strokeStyle='#eab97a99';ctx.lineWidth=1;ctx.beginPath();e.points.forEach((q,j)=>{const x=ox+(q.x+.5)*unit,y=oy+(q.y+.5)*unit;j?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}
    ctx.strokeStyle='#e0c783';ctx.lineWidth=1.5;for(const child of s.components??[])ctx.strokeRect(ox+child.x*unit,oy+child.y*unit,child.size*unit,child.size*unit);
    sockets.forEach((socket,j)=>{const x=Number(BigInt(socket.center.cx)-BigInt(p.origin.cx))*span+socket.center.x-p.origin.x,y=Number(BigInt(socket.center.cy)-BigInt(p.origin.cy))*span+socket.center.y-p.origin.y;ctx.beginPath();ctx.arc(ox+x/30*unit,oy+y/30*unit,5,0,Math.PI*2);ctx.fillStyle='#ffd75e';ctx.fill();ctx.strokeStyle='#101813';ctx.stroke();ctx.fillStyle='#fff0ab';ctx.font='bold 11px sans-serif';ctx.fillText(String(j+1),ox+x/30*unit+7,oy+y/30*unit-5);});
    ctx.fillStyle='#e6dab9';ctx.font='11px sans-serif';ctx.fillText(edges.slice(0,3).map(e=>e.style+' '+e.ratio.toFixed(2)+'×').join(' · '),ox,oy+405);ctx.fillText(sockets.map(s=>s.content.replace('regional-discovery-','')).join(' · ').slice(0,64),ox,oy+421);
   });return canvas.toDataURL('image/png');});fs.writeFileSync(path.join(reports,'regional-weave-contact.png'),Buffer.from(sheet.split(',')[1],'base64'));
  report.routes=await run(()=>{
   const routes=[];for(const {plan:p,edges}of window.__weaveFocus){const edge=p.shape.grammar.edges[edges[0].index],n=p.shape.rows.length,start=p.shape.navigation[edge.a+4],end=p.shape.navigation[edge.b+4],s=start.y*n+start.x,t=end.y*n+end.x,previous=new Int32Array(n*n);previous.fill(-1);previous[s]=s;const queue=[s];
    for(let i=0;i<queue.length&&previous[t]<0;i++){const k=queue[i],x=k%n,y=Math.floor(k/n);for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy,j=yy*n+xx;if(xx<0||yy<0||xx>=n||yy>=n||previous[j]>=0||!['g','c'].includes(p.shape.rows[yy][xx]))continue;previous[j]=k;queue.push(j);}}
    if(previous[t]<0)throw Error('Final terrain disconnected a winding route');const path=[];for(let k=t;k!==s;k=previous[k])path.push({x:k%n,y:Math.floor(k/n)});path.push(start);path.reverse();
    const exposed=edges[0].points,middle=exposed[Math.floor(exposed.length/2)],closest=path.reduce((best,q,i)=>Math.hypot(q.x-middle.x,q.y-middle.y)<Math.hypot(path[best].x-middle.x,path[best].y-middle.y)?i:best,0),indexes=[Math.max(0,closest-9),closest,Math.min(path.length-1,closest+9)];
    routes.push({id:p.id,shape:p.shape.id,origin:p.origin,style:edge.style,centerlineRatio:edges[0].ratio,dryRouteLength:path.length*30,exposedSamples:exposed.length,stops:indexes.map(i=>({x:(path[i].x+.5)*30,y:(path[i].y+.5)*30})),images:[]});
   }window.__weaveRoutes=routes;return routes;
  });
  for(let index=0;index<report.routes.length;index++)for(let stop=0;stop<3;stop++){
   const visit=await run((index,stop)=>{const w=__game.world(),m=w.massRuntime,r=window.__weaveRoutes[index],o=window.__weaveLocal(r.origin),q=r.stops[stop],requested={x:o.x+q.x,y:o.y+q.y};w.landPartyAt(requested);m.update(w,true);window.__weaveQuiet();for(let i=0;i<3;i++)__game.step(1);
    const pos=w.findFreeSpot(requested,w.player.radius);if(Math.hypot(pos.x-requested.x,pos.y-requested.y)>90||!m.walk.isWalkable(pos.x,pos.y)||w.pointInSolid(pos.x,pos.y,w.player.radius))throw Error('No body-clear native stop on winding route');w.landPartyAt(pos);
    const at=m.walk.at(pos.x,pos.y),plan=m.generator.landforms.regionalLandforms.formationAt(at);if(plan?.id!==r.id)throw Error('Route view lost regional identity');return{pos:{...w.player.pos},address:at,shift:Math.hypot(pos.x-requested.x,pos.y-requested.y),dressing:w.doodads.length,crash:__game.crash().fatal};
   },index,stop);assert.equal(visit.crash,null);visit.image=await shot('route-'+index+'-'+stop);report.routes[index].images.push(visit);save();
  }
  report.walk=await run(async()=>{const w=__game.world(),m=w.massRuntime,r=window.__weaveRoutes[0],o=window.__weaveLocal(r.origin),q=r.stops[1],center={x:o.x+q.x,y:o.y+q.y};w.landPartyAt(center);m.update(w,true);window.__weaveQuiet();let target;
   for(let i=0;i<32&&!target;i++){const a=i/32*Math.PI*2,p={x:center.x+Math.cos(a)*135,y:center.y+Math.sin(a)*135};if(Array.from({length:28},(_,j)=>({x:center.x+(p.x-center.x)*j/27,y:center.y+(p.y-center.y)*j/27})).every(p=>m.walk.isWalkable(p.x,p.y)&&!w.pointInSolid(p.x,p.y,w.player.radius)))target=p;}
   if(!target)throw Error('No native walking segment beside exposed winding path');const before={...w.player.pos};let frames=0;try{__game.devInput(()=>({dx:target.x-w.player.pos.x,dy:target.y-w.player.pos.y,aim:target,held:[],edge:[]}));while(Math.hypot(w.player.pos.x-target.x,w.player.pos.y-target.y)>15&&frames<150){__game.step(1);frames++;if(frames%30===0)await new Promise(r=>setTimeout(r,0));}}finally{__game.devInput(null);}return{frames,moved:Math.hypot(w.player.pos.x-before.x,w.player.pos.y-before.y),remaining:Math.hypot(w.player.pos.x-target.x,w.player.pos.y-target.y),fatal:__game.crash().fatal};});assert.ok(report.walk.moved>90&&report.walk.remaining<20);report.walk.image=await shot('native-walk');
  report.cache=await run(async()=>{const w=__game.world(),m=w.massRuntime,p=window.__weaveTarget,center=window.__weaveLocal(p.center);if(!m.placesInCell(p.center).some(q=>q.id===p.id))throw Error('Woven discovery owner was not published');w.landPartyAt(center);m.update(w,true);window.__weaveQuiet();const source=JSON.stringify([p.id,'cache']),c=w.chests.find(c=>c.rewardSource===source);if(!c)throw Error('Woven native cache missing');const level=m.populationFor(p).level;if(c.rewardLevel!==level||level!==m.levelAt(center))throw Error('Woven cache lost geographic level');let openings=0;const open=w.openChest;w.openChest=function(chest){if(chest===c&&!chest.opened)openings++;return open.call(this,chest);};w.landPartyAt(c.pos);let frames=0;
   try{__game.devInput(()=>({dx:0,dy:0,aim:c.pos,held:[],edge:[]}));while(!c.opened&&frames<360){__game.step(1);frames++;if(frames%30===0)await new Promise(r=>setTimeout(r,0));}}finally{__game.devInput(null);}return{id:p.id,source,content:p.content,frames,opened:c.opened,openings,level,ancestry:p.regionalSocket,fatal:__game.crash().fatal};});assert.ok(report.cache.opened);assert.equal(report.cache.openings,1);report.cache.image=await shot('native-cache');save();
  const capture=target=>{const w=__game.world(),m=w.massRuntime,s=m.snapshot(w),source=JSON.stringify([target.id,'cache']),plan=m.generator.landforms.regionalLandforms.formationAt(target.center);return{schema:s.schema,config:m.configHash,source:JSON.stringify(m.config.terrain.landforms.regional.composition),target:m.placesInCell(target.center).find(p=>p.id===target.id),parent:plan?.id,rows:JSON.stringify(plan?.shape.rows),trace:JSON.stringify(plan?.shape.grammar),pos:{...w.player.pos},chests:w.chests.filter(c=>c.rewardSource===source),drops:s.contents.drops,items:w.meta.items,fatal:__game.crash().fatal};};
  const before=await run(capture,report.search.target);await run(async()=>{__game.save();await __game.flushRunSave();});await boot();await run(async()=>{for(let i=0;i<100&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('Continue unavailable');b.click();for(let i=0;i<100&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));__game.ui.hideAll();});await run(helpers);
  const after=await run(capture,report.search.target);assert.deepEqual(after,before,'woven terrain, native owner, reward level, loot and opened cache must Continue exactly');report.continued={schema:after.schema,config:after.config,parent:after.parent,target:after.target,chests:after.chests,fatal:after.fatal};
  report.spent=await run(async target=>{const w=__game.world(),m=w.massRuntime,source=JSON.stringify([target.id,'cache']);window.__weaveQuiet();m.update(w,true);const chests=w.chests.filter(c=>c.rewardSource===source);if(chests.length!==1||!chests[0].opened)throw Error('Woven cache reset or duplicated');let openings=0;const open=w.openChest;w.openChest=function(c){if(c.rewardSource===source&&!c.opened)openings++;return open.call(this,c);};w.landPartyAt(chests[0].pos);for(let i=0;i<20;i++)__game.step(1);return{count:chests.length,opened:chests[0].opened,openings,fatal:__game.crash().fatal};},report.search.target);assert.equal(report.spent.openings,0);assert.equal(report.spent.fatal,null);report.continued.image=await shot('continued-cache');assert.deepEqual(report.errors,[]);save();
  console.log('PASS isolated woven default, diverse courts/paths and irregular shoulders, six route views, native walking/cache dwell, exact cold Continue and once-only discovery');clearTimeout(timer);win.destroy();server.close();app.exit(0);
 }catch(error){report.failure=String(error.stack||error);try{report.failureImage=await shot('failure');}catch{}save();console.error(error);clearTimeout(timer);app.exit(1);}
});

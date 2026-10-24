// Isolated built-client acceptance of real seeded regional compositions.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const reports=path.join(__dirname,'reports');fs.mkdirSync(reports,{recursive:true});
app.setPath('userData',path.join(reports,'terrain-variation-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'../.claude/terrain-variation.local.work/dist'),report={errors:[]};
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{offscreen:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')report.errors.push(e.message);});
 const run=async(fn,...args)=>{const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!r.ok)throw Error(r.error);return r.value;};
 const boot=async()=>{await win.loadURL('http://127.0.0.1:'+server.address().port);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});for(let i=0;i<100&&!window.__game;i++)await new Promise(r=>setTimeout(r,100));if(!window.__game)throw Error('Missing game');await new Promise(r=>setTimeout(r,250));});};
 const shot=async name=>{await run(()=>__game.renderer.render(__game.world()));win.webContents.invalidate();await new Promise(r=>setTimeout(r,150));const file=path.join(reports,'terrain-variation-'+name+'.png');fs.writeFileSync(file,(await win.webContents.capturePage()).toPNG());return file;};
 const timer=setTimeout(()=>{console.error('Terrain variation client acceptance timed out');app.exit(1);},300000);
 try {
  await boot();
  report.search=await run(()=>{
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;
   __game.step(1);document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Walk on')b.click();});__game.ui.hideAll();
   const m=w.massRuntime,plans=[],seen=new Set(),graphs=new Set();let checked=0,nested=false,familiar=false;
   const candidates=[[-7,-3],[-1,-5]];
   for(let r=0;r<14;r++)for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(Math.max(Math.abs(x),Math.abs(y))===r)candidates.push([x,y]);
   for(const [x,y] of candidates){
    const p=m.generator.landforms.regionalLandforms.formationAt({dimension:'surface',cx:String(x*10+5),cy:String(y*10+5),x:0,y:0});checked++;
    if(!p||seen.has(p.id))continue;seen.add(p.id);
    const graph=p.shape.grammar,key=graph?graph.nodes.length+'/'+(graph.edges.length-graph.nodes.length+1):'familiar';
    const child=!!p.shape.components?.length;
    if(graph&&(!graphs.has(key)||child&&!nested)||!graph&&!familiar){plans.push(p);if(graph)graphs.add(key);else familiar=true;if(graph&&child)nested=true;}
    if(graphs.size>=3&&nested&&familiar)break;
   }
   if(graphs.size<3||!nested||!familiar)throw Error('Missing real generated graph variety, nested motif or familiar source: '+JSON.stringify({checked,graphs:[...graphs],nested,familiar}));
   window.__variationPlans=plans;window.__variationRoutePlan=plans.find(p=>p.shape.grammar&&p.shape.components?.length);
   return {checked,accepted:seen.size,graphs:[...graphs],plans:plans.map(p=>({id:p.id,shape:p.shape.id,recipe:p.recipe.id,extent:p.shape.params.extent,children:p.shape.components})),stats:m.generator.landforms.regionalLandforms.stats};
  });
  const sheet=await run(()=>{
   const shapes=window.__variationPlans,cols=3,w=370,h=395,canvas=document.createElement('canvas');canvas.width=cols*w;canvas.height=Math.ceil(shapes.length/cols)*h;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#101a17';ctx.fillRect(0,0,canvas.width,canvas.height);
   shapes.forEach((p,i)=>{const s=p.shape,ox=(i%cols)*w+18,oy=Math.floor(i/cols)*h+50,n=s.rows.length,unit=330/n;
    ctx.fillStyle='#f0e9d6';ctx.font='14px sans-serif';ctx.fillText(s.id+' / '+p.recipe.id,ox,oy-24);
    ctx.fillStyle='#a7bfaa';ctx.fillText(s.grammar?s.grammar.nodes.length+' courts / '+(s.grammar.edges.length-s.grammar.nodes.length+1)+' loops / '+s.params.extent+' units':'Familiar native formation',ox,oy-7);
    s.rows.forEach((row,y)=>[...row].forEach((c,x)=>{ctx.fillStyle={'.':'#384537',g:'#7d8a58',b:'#202821',w:'#3b8693',c:'#b7a66b'}[c];ctx.fillRect(ox+x*unit,oy+y*unit,unit+.2,unit+.2);}));
    ctx.strokeStyle='#f3c967';ctx.lineWidth=2;for(const c of s.components??[])ctx.strokeRect(ox+c.x*unit,oy+c.y*unit,c.size*unit,c.size*unit);
   });return canvas.toDataURL('image/png');
  });fs.writeFileSync(path.join(reports,'terrain-variation-contact.png'),Buffer.from(sheet.split(',')[1],'base64'));
  report.visits=[];
  for(let index=0;index<report.search.plans.length;index++){
   const visit=await run(index=>{
    const w=__game.world(),m=w.massRuntime,p=window.__variationPlans[index],span=m.config.terrain.addressSpan;
    const origin={x:Number(BigInt(p.origin.cx)-BigInt(m.origin.cx))*span+p.origin.x,y:Number(BigInt(p.origin.cy)-BigInt(m.origin.cy))*span+p.origin.y};
    let stand,best=Infinity;for(let y=4;y<p.shape.rows.length-4;y++)for(let x=4;x<p.shape.rows.length-4;x++){
     if(!['g','c'].includes(p.shape.rows[y][x]))continue;
     const q={x:origin.x+(x+.5)*30,y:origin.y+(y+.5)*30},d=Math.hypot(x-p.shape.rows.length/2,y-p.shape.rows.length/2);
     if(d<best&&m.walk.isWalkable(q.x,q.y)){stand=q;best=d;}
    }
    if(!stand)throw Error('No regional approach');w.landPartyAt(stand);m.update(w,true);for(let i=0;i<5;i++)__game.step(1);
    const inside=pos=>{const a=m.walk.at(pos.x,pos.y),x=Number(BigInt(a.cx)-BigInt(p.origin.cx))*span+a.x-p.origin.x,y=Number(BigInt(a.cy)-BigInt(p.origin.cy))*span+a.y-p.origin.y;return p.shape.rows[Math.floor(y/30)]?.[Math.floor(x/30)]&&p.shape.rows[Math.floor(y/30)][Math.floor(x/30)]!=='.';};
    const dressing=w.doodads.filter(d=>inside(d.pos)),inhabitants=w.actors.filter(a=>a.team==='enemy'&&!a.dead&&inside(a.pos));
    return {id:p.id,shape:p.shape.id,recipe:p.recipe.id,pos:{...w.player.pos},dressing:dressing.length,dressingKinds:[...new Set(dressing.map(d=>d.kind))],inhabitants:inhabitants.map(a=>a.defId),crash:__game.crash().fatal};
   },index);assert.equal(visit.crash,null);visit.image=await shot('region-'+index);report.visits.push(visit);
  }
  assert.ok(report.visits.some(v=>v.dressing>0),'new terrain carries native dressing');assert.ok(report.visits.some(v=>v.inhabitants.length>0),'new terrain carries native inhabitants');
  report.traverse=await run(()=>{
   const p=window.__variationRoutePlan,n=p.shape.rows.length,anchors=p.shape.navigation;
   const start=anchors[0].y*n+anchors[0].x,end=anchors[1].y*n+anchors[1].x,previous=new Int32Array(n*n);previous.fill(-1);previous[start]=start;const queue=[start];
   for(let i=0;i<queue.length&&previous[end]<0;i++){
    const k=queue[i],x=k%n,y=Math.floor(k/n);
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy,j=yy*n+xx;if(xx<0||yy<0||xx>=n||yy>=n||previous[j]>=0||!['g','c'].includes(p.shape.rows[yy][xx]))continue;previous[j]=k;queue.push(j);}
   }
   if(previous[end]<0)throw Error('Missing multi-screen continuous route');const route=[];for(let k=end;k!==start;k=previous[k])route.push(k);route.push(start);route.reverse();
   if(route.length*30<3300)throw Error('Route is not multi-screen');
   window.__variationRoute=Array.from({length:6},(_,i)=>{const k=route[Math.round(i*(route.length-1)/5)];return {x:(k%n+.5)*30,y:(Math.floor(k/n)+.5)*30};});
   return {id:p.id,shape:p.shape.id,routeLength:route.length*30,stops:window.__variationRoute,images:[]};
  });
  for(let i=0;i<6;i++){
   await run(i=>{const w=__game.world(),m=w.massRuntime,p=window.__variationRoutePlan,q=window.__variationRoute[i],span=m.config.terrain.addressSpan;
    const pos={x:Number(BigInt(p.origin.cx)-BigInt(m.origin.cx))*span+p.origin.x+q.x,y:Number(BigInt(p.origin.cy)-BigInt(m.origin.cy))*span+p.origin.y+q.y};
    if(!m.walk.isWalkable(pos.x,pos.y))throw Error('Streamed collision blocks dry route stop');w.landPartyAt(pos);m.update(w,true);for(let j=0;j<3;j++)__game.step(1);
    if(m.generator.landforms.at(m.walk.at(w.player.pos.x,w.player.pos.y))?.id!==p.id)throw Error('Traversal changed regional identity');
    window.__variationLast={at:m.walk.at(w.player.pos.x,w.player.pos.y),id:p.id,shape:p.shape.id,rows:JSON.stringify(p.shape.rows),source:JSON.stringify(m.config.terrain.landforms)};
   },i);report.traverse.images.push(await shot('traverse-'+i));
  }
  report.saved=await run(async()=>{const w=__game.world();__game.save();await __game.flushRunSave();return {...window.__variationLast,pos:{...w.player.pos}};});await boot();
  report.continued=await run(async expected=>{
   for(let i=0;i<100&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('Continue unavailable');b.click();
   for(let i=0;i<100&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));__game.ui.hideAll();const w=__game.world(),m=w.massRuntime,p=m.generator.landforms.at(expected.at);
   return {id:p?.id,shape:p?.shape.id,rows:JSON.stringify(p?.shape.rows),source:JSON.stringify(m.config.terrain.landforms),pos:{...w.player.pos},crash:__game.crash().fatal};
  },report.saved);
  for(const key of ['id','shape','rows','source'])assert.equal(report.continued[key],report.saved[key],key+' survives cold Continue');assert.deepEqual(report.continued.pos,report.saved.pos);assert.equal(report.continued.crash,null);assert.deepEqual(report.errors,[]);
  report.continuedImage=await shot('continued');for(const o of [report.saved,report.continued]){delete o.rows;delete o.source;}
  fs.writeFileSync(path.join(reports,'terrain-variation-ui.json'),JSON.stringify(report,null,2));console.log('PASS real graph variety, native nested and familiar terrain, six streamed route views, native inhabitants/dressing and cold Continue');clearTimeout(timer);win.destroy();server.close();app.exit(0);
 }catch(e){report.failure=String(e.stack||e);try{report.failureImage=await shot('failure');}catch{}fs.writeFileSync(path.join(reports,'terrain-variation-ui.json'),JSON.stringify(report,null,2));console.error(e);clearTimeout(timer);app.exit(1);}
});

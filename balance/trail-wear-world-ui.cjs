// Actual world terrain baker; controlled fixture, separate from ordinary-input reviews.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'trail-world-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/trail-wear-dist');
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
 const timer=setTimeout(()=>app.exit(1),180000);
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  await run(()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const m=w.massRuntime,trail=m.journey.trails.find(t=>t.id.includes('west-caravan')&&t.id.endsWith('/approach'));
   w.landPartyAt(trail.points[0]);w.actors=[w.player];w.texts=[];w.projectiles=[];w.zones=[];
   window.trailWorldQA={trail};
   for(let i=0;i<70;i++){w.time+=1/60;__game.renderer.render(w);}
  });
  const cache=await run(()=>{
   const w=__game.world(),m=w.massRuntime,r=__game.renderer,painter=r.massPainter,original=painter.bake;
   const state=JSON.stringify([m.state.snapshot(),w.player.pos,w.player.life,w.player.mana]);
   let bakes=0;painter.bake=function(...args){bakes++;return original.apply(this,args);};
   try{for(let i=0;i<6;i++)r.render(w);}finally{painter.bake=original;}
   return {bakes,unchanged:state===JSON.stringify([m.state.snapshot(),w.player.pos,w.player.life,w.player.mana]),
    pages:painter.baked.size,limit:m.stream.config.maxPages,fatal:__game.crash().fatal};
  });
  assert.equal(cache.bakes,0);assert.ok(cache.unchanged);assert.ok(cache.pages<=cache.limit);assert.equal(cache.fatal,null);
  const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,'trail-wear-world.png'),Buffer.from(png.split(',')[1],'base64'));
  const consequence=await run(()=>{
   const w=__game.world(),m=w.massRuntime,painter=__game.renderer.massPainter,trail=trailWorldQA.trail;
   const a=trail.points[0],b=trail.points[trail.points.length-1],q={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   const at=m.walk.at(q.x,q.y),cs=m.config.terrain.terrainCell,span=m.config.terrain.addressSpan;
   const cell={dimension:at.dimension,cx:at.cx,cy:at.cy};
   const before=painter.bake(m,cell),bytes=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   const old=bytes(before),tiles=[];
   for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
    const x=Math.floor(at.x/cs)*cs+dx*cs,y=Math.floor(at.y/cs)*cs+dy*cs;
    if(x<0||y<0||x>=span||y>=span)continue;
    const address={...cell,x,y},patch=m.state.patchAt(address);
    if(patch?.cause!==m.journey.spec.source+'/trail')continue;
    tiles.push({x,y,region:patch.region,color:patch.color});
    m.state.paint({...patch,cause:'qa/changed-road-surface'});
   }
   const after=painter.bake(m,cell),now=bytes(after);let changed=0,outside=0,maxOutside=0;const outsidePixels=[];
   for(let i=0;i<old.length;i+=4){
    if(old[i]===now[i]&&old[i+1]===now[i+1]&&old[i+2]===now[i+2]&&old[i+3]===now[i+3])continue;
    changed++;const x=(i/4)%span,y=Math.floor(i/4/span);
    if(!tiles.some(t=>x>=t.x&&x<t.x+cs&&y>=t.y&&y<t.y+cs)){outside++;outsidePixels.push({x,y,old:[...old.slice(i,i+4)],now:[...now.slice(i,i+4)]});
     const gap=Math.min(...tiles.map(t=>Math.max(t.x-x,x-(t.x+cs-1),t.y-y,y-(t.y+cs-1),0)));maxOutside=Math.max(maxOutside,gap);}
   }
   return {tiles:tiles.length,changed,outside,maxOutside,outsidePixels,physicsUnchanged:tiles.every(t=>{
    const now=m.stream.sample({...cell,x:t.x,y:t.y});return now.region===t.region&&now.color===t.color;
   })};
  });
  fs.writeFileSync(path.join(dir,'trail-wear-world-ui.json'),JSON.stringify({cache,consequence},null,2));
  assert.ok(consequence.tiles>0);assert.ok(consequence.changed>0);assert.ok(consequence.physicsUnchanged);
  const outsideDelta=consequence.outsidePixels.reduce((sum,p)=>sum+p.old.reduce((n,v,i)=>n+Math.abs(v-p.now[i]),0),0);
  const outsideMax=Math.max(0,...consequence.outsidePixels.flatMap(p=>p.old.map((v,i)=>Math.abs(v-p.now[i]))));
  // Removing rectangles can change Canvas clip tessellation/edge rounding.
  // Permit only tiny channel differences away from the changed physical tiles.
  assert.ok(outsideMax<=3&&outsideDelta<200,'surface mask changed unrelated terrain');
  consequence.outsideMax=outsideMax;consequence.outsideDelta=outsideDelta;
  fs.writeFileSync(path.join(dir,'trail-wear-world-ui.json'),JSON.stringify({cache,consequence},null,2));
  console.log(JSON.stringify({cache,consequence}));console.log('PASS native terrain warm cache, untouched gameplay state, saved-source mask and same-color consequence erasure');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

// Physical terrain masks and bounded cache in the actual client, not a gameplay review.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');
app.setPath('userData',path.join(dir,'surface-world-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/water-detail-dist');
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
  await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   await new Promise(r=>setTimeout(r,200));__game.devStartRun('warrior');__game.ui.hideAll();__game.world().startWorldMass(42);
  });
  const rows=[];
  for(const region of ['ice','swamp','mud','water']){
   const result=await run(region=>{
    const w=__game.world(),Constructor=w.massRuntime.constructor,c=JSON.parse(JSON.stringify(w.massRuntime.config));
    delete c.settlement;delete c.journey;delete c.progression;delete c.ecology;
    c.terrain.fields=[];c.terrain.places=[];c.content=[];c.populationRadius=0;c.startRadius=0;c.maxPopulation=0;
    c.terrain.surfaces=[{id:'fixture',priority:0,when:[],region,biome:region==='ice'?'tundra':'marsh',color:'#566664'}];
    const m=new Constructor(42,'surface-physical-'+region,c);m.attach(w);w.landPartyAt({x:450,y:450});
    const r=__game.renderer,painter=r.massPainter;
    for(let i=0;i<3;i++)r.render(w);
    const state=JSON.stringify([m.state.snapshot(),w.player.pos,w.player.life,w.player.mana]);
    const bake=painter.bake;let bakes=0;painter.bake=function(...args){bakes++;return bake.apply(this,args);};
    try{for(let i=0;i<5;i++)r.render(w);}finally{painter.bake=bake;}
    const unchanged=state===JSON.stringify([m.state.snapshot(),w.player.pos,w.player.life,w.player.mana]);
    const cell=m.walk.at(0,0),bytes=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    const old=bytes(painter.bake(m,cell)),span=m.config.terrain.addressSpan,cs=m.config.terrain.terrainCell;
    for(let y=300;y<600;y+=cs)for(let x=300;x<600;x+=cs)
      m.state.paint({address:m.walk.at(x,y),region:'ground',color:'#566664',cause:'qa/dried-surface'});
    const now=bytes(painter.bake(m,cell));let changed=0,outside=0,outsideMax=0,outsideDelta=0;
    for(let i=0;i<old.length;i+=4){
      if(old[i]===now[i]&&old[i+1]===now[i+1]&&old[i+2]===now[i+2]&&old[i+3]===now[i+3])continue;
      const x=(i/4)%span,y=Math.floor(i/4/span);changed++;
      if(x<300||x>=600||y<300||y>=600){outside++;
        for(let j=0;j<4;j++){const d=Math.abs(old[i+j]-now[i+j]);outsideMax=Math.max(outsideMax,d);outsideDelta+=d;}}
    }
    r.render(w);
    // A fully dry control must match the interior of the dried patch exactly.
    // Keep one physical cell around the sample for native grass overhangs.
    for(let y=0;y<span;y+=cs)for(let x=0;x<span;x+=cs)
      m.state.paint({address:m.walk.at(x,y),region:'ground',color:'#566664',cause:'qa/dry-control'});
    const dry=bytes(painter.bake(m,cell));let dryMismatch=0;
    for(let y=300+cs;y<600-cs;y++)for(let x=300+cs;x<600-cs;x++){
      const i=(y*span+x)*4;for(let j=0;j<4;j++)if(now[i+j]!==dry[i+j])dryMismatch++;
    }
    return {region,bakes,unchanged,pages:painter.baked.size,limit:m.stream.config.maxPages,changed,outside,outsideMax,outsideDelta,
      outsideMean:outsideDelta/(span*span*4),dryMismatch,physical:m.walk.regionAt(450,450),fatal:__game.crash().fatal};
   },region);
   assert.equal(result.bakes,0);assert.ok(result.unchanged);assert.ok(result.pages<=result.limit);
   assert.equal(result.physical,'ground');assert.equal(result.fatal,null);assert.ok(result.changed>100);
   // Skia's changed clip coverage can round long antialiased strokes by a few
   // channel levels; bound both the largest difference and its page-wide mean.
   assert.ok(result.outsideMax<=3&&result.outsideMean<.001,'changed outside physical cells: '+JSON.stringify(result));
   assert.equal(result.dryMismatch,0,'surface marks survived a dry consequence');
   rows.push(result);
  }
  const shots=[];
  for(const name of ['tundra','marsh','water']){
   const result=await run(name=>{
    const w=__game.world();w.startWorldMass(42);const m=w.massRuntime;let point;
    search:for(let y=-24000;y<=24000;y+=1200)for(let x=-24000;x<=24000;x+=1200){
      const sample=m.stream.sample(m.walk.at(x,y));
      if(name==='water'?sample.region==='water':sample.biome===name){point={x,y};break search;}
    }
    if(!point)throw Error('Missing generated '+name);
    w.landPartyAt(point);m.update(w,true);
    for(let i=0;i<70;i++){w.time+=1/60;__game.renderer.render(w);}
    return {sample:w.massRuntime.stream.sample(w.massRuntime.walk.at(w.player.pos.x,w.player.pos.y)),
     png:document.getElementById('game').toDataURL(),fatal:__game.crash().fatal};
   },name);
   assert.equal(result.fatal,null);assert.equal(name==='water'?result.sample.region:result.sample.biome,name);
   fs.writeFileSync(path.join(dir,'surface-world-'+name+'.png'),Buffer.from(result.png.split(',')[1],'base64'));
   delete result.png;shots.push(result);
  }
  fs.writeFileSync(path.join(dir,'surface-world-ui.json'),JSON.stringify({rows,shots},null,2));
  console.log(JSON.stringify(rows));console.log('PASS real terrain masks, same-color dry consequences, bounded warm cache, unchanged state and generated climate views');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

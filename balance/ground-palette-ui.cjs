// Actual renderer and browser persistence QA; controlled fixtures are not play reviews.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');
app.setPath('userData',path.join(dir,'ground-palette-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const current=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/ground-palette-dist');
 let root=current;
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const capture=(name,png)=>fs.writeFileSync(path.join(dir,'ground-palette-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 const boot=async()=>{await win.loadURL(url);await run(async()=>{
  window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
  await new Promise(r=>setTimeout(r,200));__game.devStartRun('warrior');__game.ui.hideAll();__game.world().startWorldMass(42);
 });};
 const state=()=> {
  const w=__game.world(),m=w.massRuntime,p=__game.renderer.massPainter;
  const hash=c=>{let h=2166136261;for(const b of c.getContext('2d').getImageData(0,0,c.width,c.height).data)h=Math.imul(h^b,16777619);return h>>>0;};
  return {config:m.config,seed:m.generator.run.seed,pos:{...w.player.pos},
   samples:[[-720,480],[4310,-1800],[-24000,-19200],[-21600,-16800]].map(([x,y])=>m.stream.sample(m.walk.at(x,y))),
   colors:[[-960,0],[0,0],[3840,-1920],[-24000,-19200]].map(([x,y])=>hash(p.bake(m,m.walk.at(x,y)))),
   fatal:__game.crash().fatal};
 };
 const resume=async()=>{await win.loadURL(url);await run(async()=>{
  window.requestAnimationFrame=()=>0;
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const button=document.querySelector('#sm-continue:not([disabled])');if(!button)throw Error('Continue missing');
  button.click();__game.ui.hideAll();
 });return run(state);};
 const timer=setTimeout(()=>app.exit(1),240000);
 try{
  await boot();
  const gallery=await run(()=>{
   const w=__game.world(),C=w.massRuntime.constructor,full=JSON.parse(JSON.stringify(w.massRuntime.config));
   const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=840;const g=canvas.getContext('2d'),rows=[];
   const hash=c=>{let h=2166136261;for(const b of c.getContext('2d').getImageData(0,0,c.width,c.height).data)h=Math.imul(h^b,16777619);return h>>>0;};
   for(const [index,name] of ['downs','forest','desert','marsh'].entries()){
    const c=JSON.parse(JSON.stringify(full)),surface=c.terrain.surfaces.find(s=>s.id===name);
    delete c.settlement;delete c.journey;delete c.progression;delete c.ecology;
    delete c.terrain.patches;
    c.terrain.fields=[];c.terrain.places=[];c.terrain.surfaces=[{...surface,when:[]}];c.content=[];
    c.populationRadius=0;c.startRadius=0;c.maxPopulation=0;c.pageRadius=1;
    const record={name};
    for(const native of [false,true]){
     const config=JSON.parse(JSON.stringify(c));if(!native)delete config.ground;
     const m=new C(42,'ground-gallery-'+name,config);m.attach(w);w.landPartyAt({x:450,y:450});
     const r=__game.renderer,p=r.massPainter;r.render(w);
     p.draw(document.createElement('canvas').getContext('2d'),m,0,0,960,960);
     const before=JSON.stringify([m.state.snapshot(),w.player.pos,w.player.life,w.player.mana]);
     const bake=p.bake;let bakes=0;p.bake=function(...args){bakes++;return bake.apply(this,args);};
     const random=Math.random;Math.random=()=>{throw Error('Terrain painter used random');};
     try{for(let i=0;i<4;i++)p.draw(document.createElement('canvas').getContext('2d'),m,0,0,960,960);}
     finally{Math.random=random;p.bake=bake;}
     if(before!==JSON.stringify([m.state.snapshot(),w.player.pos,w.player.life,w.player.mana]))throw Error('Painting changed state');
     record[native?'newWarmBakes':'oldWarmBakes']=bakes;
     const tile=p.bake(m,m.walk.at(0,0)),key=native?'native':'legacy';record[key]=hash(tile);
     const py=native?420:0;g.drawImage(tile,0,0,400,400,index*400,py+20,400,400);
     g.fillStyle='#151718';g.fillRect(index*400,py,400,24);g.fillStyle='#eee';g.font='16px sans-serif';
     g.fillText(name+(native?' — native palette':' — prior flat color'),index*400+10,py+17);
     if(native){
      const old=tile.getContext('2d').getImageData(0,0,960,960).data;
      for(let y=300;y<600;y+=30)for(let x=300;x<600;x+=30)
       m.state.paint({address:m.walk.at(x,y),region:surface.region,color:surface.color,cause:'qa/repainted-same-color'});
      const painted=p.bake(m,m.walk.at(0,0)).getContext('2d').getImageData(0,0,960,960).data;
      const legacyConfig=JSON.parse(JSON.stringify(c));delete legacyConfig.ground;
      const legacy=new C(42,'ground-control',legacyConfig);
      const plain=p.bake(legacy,legacy.walk.at(0,0)).getContext('2d').getImageData(0,0,960,960).data;
      let different=0,mismatch=0;
      for(let y=330;y<570;y++)for(let x=330;x<570;x++)for(let ch=0;ch<3;ch++){
       const i=(y*960+x)*4+ch;if(old[i]!==painted[i])different++;if(painted[i]!==plain[i])mismatch++;
      }
      record.consequenceDifference=different;record.consequenceMismatch=mismatch;
      record.pages=p.baked.size;record.pageLimit=m.stream.config.maxPages;
     }
    }
    rows.push(record);
   }
   return {rows,png:canvas.toDataURL()};
  });
  capture('gallery',gallery.png);delete gallery.png;
  for(const row of gallery.rows){
   assert.notEqual(row.native,row.legacy);assert.equal(row.newWarmBakes,0);assert.equal(row.oldWarmBakes,0);
   assert.ok(row.consequenceDifference>1000);assert.equal(row.consequenceMismatch,0);assert.ok(row.pages<=row.pageLimit);
  }
  // Real generated terrain and a browser checkpoint of its saved appearance.
  await run(async()=>{
   const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;
   const m=w.massRuntime;let point;
   search:for(let y=-24000;y<=24000;y+=1200)for(let x=-24000;x<=24000;x+=1200){
    const s=m.stream.sample(m.walk.at(x,y));if(s.biome==='forest'&&s.source.rule==='forest'){point={x,y};break search;}
   }
   if(!point)throw Error('No generated forest');w.landPartyAt(point);m.update(w,true);w.time=48;
   for(let i=0;i<70;i++)__game.renderer.render(w);
   __game.save();await new Promise(r=>setTimeout(r,200));
  });
  capture('forest',await run(()=>document.getElementById('game').toDataURL()));
  const saved=await run(state),continued=await resume();assert.equal(saved.fatal,null);assert.deepEqual(continued,saved);
  assert.equal(saved.config.ground.rules.length,4);
  // Continue an actual prior-client checkpoint, including its old baked pixels.
  root=path.resolve(__dirname,'reports','firing-lane-dist');await boot();
  await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,200));});
  const legacy=await run(state);assert.equal(legacy.config.ground,undefined);
  root=current;const oldContinued=await resume();assert.deepEqual(oldContinued,legacy);
  fs.writeFileSync(path.join(dir,'ground-palette-ui.json'),JSON.stringify({gallery,saved,continued,legacy,oldContinued},null,2));
  console.log(JSON.stringify(gallery.rows));
  console.log('PASS real native-palette paints, warm cache reuse, same-color consequence ownership, generated forest, exact browser Continue and pixel-identical prior-client appearance');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});

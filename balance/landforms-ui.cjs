// Built-client acceptance of naturally admitted seamless regional terrain.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const reports=path.join(__dirname,'reports');fs.mkdirSync(reports,{recursive:true});
app.setPath('userData',path.join(reports,'landforms-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'../.claude/landforms.local.work/dist'),report={errors:[]};
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{offscreen:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')report.errors.push(e.message);});
 const run=async(fn,...args)=>{const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!r.ok)throw Error(r.error);return r.value;};
 const boot=async()=>{await win.loadURL('http://127.0.0.1:'+server.address().port);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});for(let i=0;i<100&&!window.__game;i++)await new Promise(r=>setTimeout(r,100));if(!window.__game)throw Error('Missing game');await new Promise(r=>setTimeout(r,250));});};
 const shot=async name=>{await run(()=>__game.renderer.render(__game.world()));win.webContents.invalidate();await new Promise(r=>setTimeout(r,150));const file=path.join(reports,'landforms-'+name+'.png');fs.writeFileSync(file,(await win.webContents.capturePage()).toPNG());return file;};
 const timer=setTimeout(()=>{console.error('Regional client acceptance timed out');app.exit(1);},300000);
 try {
  await boot();
  report.search=await run(()=>{
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(713);w.player.invulnerable=true;
   __game.step(1);document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Walk on')b.click();});__game.ui.hideAll();
   const m=w.massRuntime,plans=new Map(),seen=new Set();let checked=0;
   for(let r=0;r<17&&plans.size<4;r++)for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++) {
    if(Math.max(Math.abs(x),Math.abs(y))!==r)continue;
    const p=m.generator.landforms.at({dimension:'surface',cx:String(x*3+1),cy:String(y*3+1),x:480,y:480});checked++;
    if(p&&!seen.has(p.id)){seen.add(p.id);if(!plans.has(p.recipe.id))plans.set(p.recipe.id,p);}
   }
   window.__landformPlans=[...plans.values()];if(plans.size<4)throw Error('Expected four naturally generated regional families; got '+plans.size);
   return {checked,accepted:seen.size,recipes:[...plans.keys()],shapes:[...plans.values()].map(p=>p.shape.id)};
  });
  const sheet=await run(()=>{
   const shapes=__game.world().massRuntime.config.terrain.landforms.shapes,cols=4,w=280,h=285,canvas=document.createElement('canvas');canvas.width=cols*w;canvas.height=Math.ceil(shapes.length/cols)*h;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#111813';ctx.fillRect(0,0,canvas.width,canvas.height);
   shapes.forEach((s,i)=>{const ox=(i%cols)*w+16,oy=Math.floor(i/cols)*h+35,n=s.rows.length,unit=245/n;
    ctx.fillStyle='#ede4c7';ctx.font='15px sans-serif';ctx.fillText(s.id,ox,oy-12);
    s.rows.forEach((row,y)=>[...row].forEach((c,x)=>{ctx.fillStyle={'.':'#48563a',g:'#718052',b:'#252d25',w:'#32727d',c:'#af9862'}[c];ctx.fillRect(ox+x*unit,oy+y*unit,unit+.2,unit+.2);}));
   });return canvas.toDataURL('image/png');
  });fs.writeFileSync(path.join(reports,'landforms-contact.png'),Buffer.from(sheet.split(',')[1],'base64'));
  report.visits=[];
  for(let index=0;index<report.search.recipes.length;index++) {
   const visit=await run(index=>{
    const w=__game.world(),m=w.massRuntime,p=window.__landformPlans[index],span=m.config.terrain.addressSpan;
    const origin={x:Number(BigInt(p.origin.cx)-BigInt(m.origin.cx))*span+p.origin.x,y:Number(BigInt(p.origin.cy)-BigInt(m.origin.cy))*span+p.origin.y};
    let stand,best=Infinity;for(let y=4;y<p.shape.rows.length-4;y++)for(let x=4;x<p.shape.rows.length-4;x++) {
     const q={x:origin.x+(x+.5)*30,y:origin.y+(y+.5)*30},d=Math.hypot(x-p.shape.rows.length/2,y-p.shape.rows.length/2);
     if(d<best&&m.walk.isWalkable(q.x,q.y)){stand=q;best=d;}
    }
    if(!stand)throw Error('No regional approach');w.landPartyAt(stand);m.update(w,true);
    for(let i=0;i<5;i++)__game.step(1);
    window.__landformLast={origin:p.origin,id:p.id,shape:p.shape.id,source:JSON.stringify(m.config.terrain.landforms)};
    const inside=pos=>{const x=pos.x-origin.x,y=pos.y-origin.y;return x>=0&&y>=0&&x<p.bounds.maxX&&y<p.bounds.maxY;};
    const dressing=w.doodads.filter(d=>inside(d.pos));
    const inhabitants=w.actors.filter(a=>a.team==='enemy'&&!a.dead&&inside(a.pos));
    return {id:p.id,shape:p.shape.id,recipe:p.recipe.id,pos:{...w.player.pos},terrain:m.walk.regionAt(w.player.pos.x,w.player.pos.y),
      dressing:dressing.length,dressingKinds:[...new Set(dressing.map(d=>d.kind))],inhabitants:inhabitants.map(a=>a.defId),crash:__game.crash().fatal};
   },index);assert.equal(visit.crash,null);visit.image=await shot('region-'+index);report.visits.push(visit);
  }
  assert.ok(report.visits.some(v=>v.dressing>0),'naturally admitted terrain must carry native dressing');
  assert.ok(report.visits.some(v=>v.inhabitants.length>0),'naturally admitted terrain must contain native inhabitants');
  report.saved=await run(async()=>{const w=__game.world();__game.save();await __game.flushRunSave();return {...window.__landformLast,pos:{...w.player.pos}};});
  await boot();
  report.continued=await run(async expected=>{
   for(let i=0;i<100&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('Continue unavailable');b.click();
   for(let i=0;i<100&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));__game.ui.hideAll();
   const w=__game.world(),m=w.massRuntime,p=m.generator.landforms.at({...expected.origin,x:expected.origin.x+15,y:expected.origin.y+15});
   return {id:p?.id,shape:p?.shape.id,source:JSON.stringify(m.config.terrain.landforms),pos:{...w.player.pos},crash:__game.crash().fatal};
  },report.saved);
  assert.equal(report.continued.id,report.saved.id);assert.equal(report.continued.source,report.saved.source);assert.deepEqual(report.continued.pos,report.saved.pos);assert.equal(report.continued.crash,null);
  report.continuedImage=await shot('continued');delete report.saved.source;delete report.continued.source;
  fs.writeFileSync(path.join(reports,'landforms-ui.json'),JSON.stringify(report,null,2));console.log('PASS naturally generated regional terrain, four rendered regional families with native inhabitants and dressing, source-pinned cold Continue');
  clearTimeout(timer);win.destroy();server.close();app.exit(0);
 }catch(e){report.failure=String(e.stack||e);try{report.failureImage=await shot('failure');}catch{}fs.writeFileSync(path.join(reports,'landforms-ui.json'),JSON.stringify(report,null,2));console.error(e);clearTimeout(timer);app.exit(1);}
});

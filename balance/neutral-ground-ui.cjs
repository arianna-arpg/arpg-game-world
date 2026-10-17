// NeutralGround real client: fresh default geography, movement and cold Continue.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const reports=path.join(__dirname,'reports');fs.mkdirSync(reports,{recursive:true});
app.setPath('userData',path.join(reports,'neutral-ground-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,process.env.HOLLOW_WAKE_NEUTRAL_GROUND_DIST??'../.claude/neutral-ground.local.work/dist'),report={errors:[],method:'Fresh default seed42, naturally generated desert and shore, localized loose sand, native movement and durable cold Continue. Controlled arrivals; no terrain painting.'};
 const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port,win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{offscreen:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')report.errors.push(e.message);});
 const run=async(fn,...args)=>{const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!r.ok)throw Error(r.error);return r.value;};
 const boot=async()=>{await win.loadURL(url);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});for(let i=0;i<100&&!window.__game;i++)await new Promise(r=>setTimeout(r,100));if(!window.__game)throw Error('Missing game');await new Promise(r=>setTimeout(r,200));});};
 const save=()=>fs.writeFileSync(path.join(reports,'neutral-ground-ui.json'),JSON.stringify(report,null,2));
 const shot=async name=>{await run(()=>__game.renderer.render(__game.world()));win.webContents.invalidate();await new Promise(r=>setTimeout(r,120));const file=path.join(reports,'neutral-ground-'+name+'.png');fs.writeFileSync(file,(await win.webContents.capturePage()).toPNG());return file;};
 const timer=setTimeout(()=>{save();console.error('NeutralGround client timed out');app.exit(1);},300000);
 try{
  await boot();await run(()=>{__game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;__game.step(1);document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Walk on')b.click();});__game.ui.hideAll();});
  report.courses=[];
  for(const [rule,x,y,region] of [['sunken-caravan/surface',-23400,-24000,'sand'],['desert',-24000,-24000,'firm_sand'],['shore',-2400,-24000,'firm_sand']]){
   const result=await run(async(rule,x,y,region)=>{
    const w=__game.world(),m=w.massRuntime,s=m.config.terrain.addressSpan;
    const target={x:x-Number(BigInt(m.origin.cx))*s,y:y-Number(BigInt(m.origin.cy))*s};w.landPartyAt(target);m.update(w,true);__game.ui.hideAll();
    let start,goal;
    for(let dy=-120;dy<=120&&!goal;dy+=30)for(let dx=-120;dx<=120&&!goal;dx+=30){const p={x:target.x+dx,y:target.y+dy};
     for(const [vx,vy] of [[1,0],[-1,0],[0,1],[0,-1]]){const route=Array.from({length:11},(_,i)=>({x:p.x+vx*i*7.5,y:p.y+vy*i*7.5}));
      if(route.every(q=>{const t=m.stream.sample(m.walk.at(q.x,q.y));return t.source.rule===rule&&t.region===region&&w.walk.regionAt(q.x,q.y)===region&&!w.pointInSolid(q.x,q.y,w.player.radius);})){start=p;goal=route[10];break;}}
    }
    if(!goal)throw Error('No natural body-clear course for '+rule);w.player.pos={...start};w.player.endStatus('mired');
    for(let i=0;i<120;i++)w.updateTerrainEffects(1/60);
    const mired=w.player.statuses.some(s=>s.id==='mired');if(mired!==(region==='sand'))throw Error('Wrong standing Mired for '+rule);
    let frames=0,seenMired=mired;
    try{__game.devInput(()=>({dx:goal.x-w.player.pos.x,dy:goal.y-w.player.pos.y,aim:goal,held:[],edge:[]}));while(Math.hypot(w.player.pos.x-goal.x,w.player.pos.y-goal.y)>12&&frames<100){__game.step(1);frames++;seenMired||=w.player.statuses.some(s=>s.id==='mired');if(frames%20===0)await new Promise(r=>setTimeout(r,0));}}finally{__game.devInput(null);}
    if(region==='firm_sand'&&seenMired)throw Error('Mired applied while crossing neutral '+rule);
    return {rule,region,mired,seenMired,frames,distance:Math.hypot(w.player.pos.x-start.x,w.player.pos.y-start.y),at:m.walk.at(w.player.pos.x,w.player.pos.y),terrainChanges:m.state.snapshot().terrain.length,fatal:__game.crash().fatal};
   },rule,x,y,region);assert.ok(result.distance>45);assert.equal(result.fatal,null);report.courses.push({...result,image:await shot(rule.split('/')[0])});save();
  }
  const state=()=>{const w=__game.world(),m=w.massRuntime;return{config:m.configHash,origin:m.origin,pos:{...w.player.pos},region:w.walk.regionAt(w.player.pos.x,w.player.pos.y),mired:w.player.statuses.some(s=>s.id==='mired')};};
  const before=await run(state);await run(async()=>{__game.save();await __game.flushRunSave();});await boot();
  await run(async()=>{for(let i=0;i<100&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('Continue unavailable');b.click();for(let i=0;i<100&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));__game.ui.hideAll();__game.world().updateTerrainEffects(1/60);});
  report.continue=await run(state);assert.deepEqual(report.continue,before);assert.equal(report.continue.region,'firm_sand');assert.equal(report.continue.mired,false);assert.deepEqual(report.errors,[]);save();
  console.log('PASS natural desert/shore without Mired, localized loose sand with Mired, native movement and cold Continue');clearTimeout(timer);win.destroy();server.close();app.exit(0);
 }catch(error){report.failure=String(error.stack||error);try{report.failureImage=await shot('failure');}catch{}save();console.error(error);clearTimeout(timer);app.exit(1);}
});
